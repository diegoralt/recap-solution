import { randomUUID } from 'node:crypto';
import { ensure, AppError } from './errors.mjs';
import { clean, normalizeAddress, toMinor, validateCandidate, validateQuote, termsHash } from './policy.mjs';
import { candidateFor } from './merchants.mjs';
import { safeHostedUrl } from './providers/reap.mjs';
import { digest } from './auth.mjs';

const finals = new Set(['COMPLETED', 'FAILED', 'EXPIRED']);
const states = new Set(['REQUIRES_ACTION', 'PROCESSING', ...finals]);
const idValue = value => typeof value === 'string' && value.length > 0 && value.length <= 256;

export class PurchaseFlow {
  constructor(store, provider, config, now = Date.now) {
    this.store = store; this.provider = provider; this.config = config; this.now = now;
    this.busy = new Set(); this.enrollmentBusy = false;
  }
  owned(id, user) {
    const r = this.store.request(id);
    ensure(r.mode === this.config.mode && (r.requesterId === user.id || r.approverId === user.id), 'FORBIDDEN', 'Solicitud no disponible.', 403);
    return r;
  }
  responsible(r, user) { ensure(user.role === 'approver' && user.id === r.approverId, 'FORBIDDEN', 'Solo el responsable puede autorizar.', 403); }
  unlocked(r) { ensure(!this.store.attempt(r.id), 'LOCKED', 'Ya existe un intento. Consulta su resultado; crea otra solicitud solo tras un estado final.', 409); }
  view(r, user) {
    const attempt = this.store.attempt(r.id);
    const { _revision, ...request } = r;
    const q = request.quote;
    let hash = null;
    if (q) hash = termsHash(request);
    const events = this.store.events(r.id).map(event => { const { key, ...details } = event.details; return { ...event, details }; });
    return { ...request, termsHash: hash, events, attempt: attempt ? {
      id: attempt.id, state: attempt.state, providerId: attempt.providerId, orderId: attempt.orderId,
      hostedApproval: attempt.hostedApproval, anomaly: attempt.anomaly, evidenceMode: attempt.evidenceMode,
      recoverable: !!attempt.recoverable,
      completeConform: attempt.state === 'COMPLETED' && !attempt.anomaly && (this.config.mode === 'fixture' || attempt.hostedApproval),
      approvalUrl: user.id === r.approverId ? attempt.approvalUrl : null
    } : null };
  }
  create(body, user) {
    ensure(user.role === 'requester', 'FORBIDDEN', 'Solo el solicitante crea solicitudes.', 403);
    const c = candidateFor(body.candidateKey);
    ensure(c, 'MERCHANT', 'Selecciona un producto compatible.');
    ensure(['MXN', 'USD'].includes(body.currency), 'CURRENCY', 'Usa MXN o USD explícitamente.');
    ensure(typeof body.description === 'string' && body.description.length <= 1000, 'DESCRIPTION', 'Describe la compra en hasta 1000 caracteres.');
    const attrs = body.requiredAttributes ?? [];
    ensure(Array.isArray(attrs) && attrs.length <= 10 && attrs.every(x => typeof x === 'string' && x.length <= 100), 'ATTRIBUTE', 'Características inválidas.');
    const r = { id: randomUUID(), version: 1, requesterId: user.id, approverId: 'responsable', mode: this.config.mode,
      scenario: c.scenario, candidateKey: c.key, quantity: body.quantity, budgetMinor: toMinor(body.budget),
      currency: body.currency, address: normalizeAddress(body.address), requiredAttributes: attrs.map(clean),
      description: clean(body.description), status: 'DRAFT', quote: null, approval: null, blockedReason: null, createdAt: this.now() };
    // Policy failures stay visible as requests, but never become checkout attempts.
    try { validateCandidate(r, c); } catch (e) { if (!(e instanceof AppError)) throw e; r.status = 'BLOCKED'; r.blockedReason = { code: e.code, message: e.message }; }
    const result = this.store.createRequest(r);
    this.store.event(result, user.id, 'REQUEST_CREATED', { mode: r.mode, scenario: r.scenario });
    return this.view(result, user);
  }
  update(id, body, user) {
    return this.store.transaction(() => {
      const r = this.owned(id, user); this.unlocked(r);
      ensure(body.version === r.version, 'STALE', 'La solicitud cambió. Actualiza.', 409);
      if (user.id !== r.requesterId) ensure(body.quantity === undefined && body.address === undefined && body.currency === undefined,
        'FORBIDDEN', 'Solo el solicitante modifica cantidad, dirección o moneda.', 403);
      const previous = r.budgetMinor;
      if (body.budget !== undefined) {
        const next = toMinor(body.budget);
        if (next > previous) this.responsible(r, user);
        r.budgetMinor = next;
      }
      if (body.quantity !== undefined) r.quantity = body.quantity;
      if (body.address !== undefined) r.address = normalizeAddress(body.address);
      if (body.currency !== undefined) r.currency = body.currency;
      r.version++; r.quote = null; r.approval = null; r.status = 'DRAFT'; r.blockedReason = null;
      try { validateCandidate(r, candidateFor(r.candidateKey)); } catch (e) { if (!(e instanceof AppError)) throw e; r.status = 'BLOCKED'; r.blockedReason = { code: e.code, message: e.message }; }
      const updated = this.store.save(r); this.store.event(r, user.id, 'TERMS_CHANGED', { version: r.version });
      return this.view(updated, user);
    });
  }
  async quote(id, user) {
    const r = this.store.transaction(() => {
      const r = this.owned(id, user); this.unlocked(r);
      r.quote = null; r.approval = null; r.version++; r.status = 'DRAFT'; r.blockedReason = null;
      return this.store.save(r);
    });
    const c = candidateFor(r.candidateKey);
    try {
      validateCandidate(r, c);
      r.quote = await this.provider.quote(r, c, randomUUID());
      validateQuote(r, r.quote, c, this.now());
      r.status = 'QUOTED';
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      r.status = 'BLOCKED'; r.blockedReason = { code: e.code, message: e.message };
      if (e.code === 'QUOTE_UNFULFILLABLE') r.blockedReason.message = 'No fue posible cotizar este producto con esa dirección. Revisa la entrega o selecciona otro producto compatible.';
      if (e.code === 'NETWORK_UNKNOWN') r.blockedReason.message = 'Reap no respondió a tiempo. Puedes volver a cotizar.';
    }
    const updated = this.store.save(r);
    this.store.event(r, user.id, r.status === 'QUOTED' ? 'QUOTE_VALIDATED' : 'POLICY_BLOCKED',
      { code: r.blockedReason?.code ?? null, totalMinor: r.quote?.totalMinor ?? null, currency: r.quote?.currency ?? null });
    return this.view(updated, user);
  }
  approve(id, hash, user) {
    return this.store.transaction(() => {
      const r = this.owned(id, user); this.responsible(r, user); this.unlocked(r);
      validateQuote(r, r.quote, candidateFor(r.candidateKey), this.now());
      ensure(hash === termsHash(r), 'STALE', 'Los términos cambiaron. Revísalos nuevamente.', 409);
      r.approval = { approverId: user.id, hash, approvedAt: this.now() }; r.status = 'APPROVED';
      const result = this.store.save(r); this.store.event(r, user.id, 'INTERNAL_APPROVAL', { hash, version: r.version });
      return this.view(result, user);
    });
  }
  async enrollment(user, create = false) {
    ensure(user.role === 'approver', 'FORBIDDEN', 'Solo el responsable registra la tarjeta de prueba.', 403);
    if (this.config.mode === 'fixture') return { status: 'ACTIVE', id: 'fixture_enrollment', approvalUrl: null, mode: 'fixture' };
    ensure(!this.enrollmentBusy, 'BUSY', 'Registro en curso; consulta en un momento.', 409);
    this.enrollmentBusy = true;
    try {
      let saved = this.store.setting('enrollment') || null;
      if (create && !this.config.enrollmentId && ['FAILED', 'EXPIRED', 'REVOKED'].includes(saved?.status)) {
        saved = null; this.store.setting('enrollment', null);
      }
      const id = this.config.enrollmentId || saved?.id;
      let raw;
      if (id) raw = await this.provider.readEnrollment(id);
      else if (create) {
        if (!saved) {
          saved = { key: randomUUID(), createdAt: this.now(), payload: JSON.stringify({ source: 'EXTERNAL',
            owner: { type: 'CLIENT_REFERENCE', id: user.id, email: this.config.email },
            presentation: { type: 'REDIRECT', returnUrl: this.config.returnUrl } }) };
          this.store.setting('enrollment', saved);
        }
        ensure(this.now() - saved.createdAt < 23 * 3_600_000, 'RECONCILIATION', 'Registro incierto fuera de ventana; consulta con Reap.', 409);
        try { raw = await this.provider.createEnrollment(saved.payload, saved.key); }
        catch (e) {
          if (e.providerStatus >= 400 && e.providerStatus < 500 && ![409, 429].includes(e.providerStatus)) this.store.setting('enrollment', null);
          throw e;
        }
      } else return { status: 'NOT_ENROLLED', id: null, approvalUrl: null, mode: 'sandbox' };
      ensure(idValue(raw.id) && ['ACTIVE', 'REQUIRES_ACTION', 'REVOKED', 'FAILED', 'EXPIRED'].includes(raw.status), 'PROVIDER_SCHEMA', 'Estado de enrollment inválido.', 502);
      const approvalUrl = raw.status === 'REQUIRES_ACTION' ? safeHostedUrl(raw.nextAction?.url) : null;
      this.store.setting('enrollment', { ...saved, id: raw.id, status: raw.status, approvalUrl });
      return { id: raw.id, status: raw.status, approvalUrl, mode: 'sandbox' };
    } finally { this.enrollmentBusy = false; }
  }
  async checkout(id, user) {
    let r = this.owned(id, user); this.responsible(r, user);
    if (this.store.attempt(id)) return this.view(r, user);
    ensure(!this.busy.has(id), 'BUSY', 'Preparando intento; consulta en un momento.', 409);
    this.busy.add(id);
    try {
      ensure(r.approval?.approverId === user.id && r.approval.hash === termsHash(r), 'APPROVAL', 'Falta aprobación interna de los términos finales.', 409);
      validateQuote(r, r.quote, candidateFor(r.candidateKey), this.now());
      const fresh = await this.provider.readQuote(r.quote.id, r, candidateFor(r.candidateKey));
      validateQuote(r, fresh, candidateFor(r.candidateKey), this.now());
      if (termsHash({ ...r, quote: fresh }) !== r.approval.hash) {
        r.quote = fresh; r.approval = null; r.version++; r.status = 'QUOTED'; this.store.save(r);
        this.store.event(r, user.id, 'TERMS_CHANGED', { version: r.version, reason: 'provider_quote_changed' });
        throw new AppError('TERMS_CHANGED', 'La cotización cambió. Revisa y aprueba nuevamente.', 409);
      }
      const enrollment = await this.enrollment(user);
      ensure(enrollment.status === 'ACTIVE', 'ENROLLMENT', 'Registra y confirma la tarjeta en Reap antes del checkout.', 409);
      const a = this.store.transaction(() => {
        const current = this.owned(id, user);
        const previous = this.store.attempt(id); if (previous) return previous;
        ensure(current._revision === r._revision && current.approval?.hash === termsHash(current), 'STALE', 'La solicitud cambió antes del envío.', 409);
        validateQuote(current, current.quote, candidateFor(current.candidateKey), this.now());
        const payload = JSON.stringify({ quoteId: current.quote.id, enrollmentId: enrollment.id,
          presentation: { type: 'REDIRECT', returnUrl: this.config.returnUrl } });
        const a = { id: randomUUID(), requestId: id, key: randomUUID(), mode: this.config.mode, payload, payloadHash: digest(payload),
          createdAt: this.now(), recoveryCount: 0, state: 'SUBMITTING', providerId: null, approvalUrl: null,
          hostedApproval: false, anomaly: null, evidenceMode: this.config.mode === 'fixture' ? 'fixture' : null };
        this.store.createAttempt(a); current.status = 'SUBMITTING'; this.store.save(current);
        this.store.event(current, user.id, 'CHECKOUT_DISPATCH', { attemptId: a.id, key: a.key, termsHash: current.approval.hash, valid: true });
        return a;
      });
      await this.send(a, user); return this.view(this.owned(id, user), user);
    } finally { this.busy.delete(id); }
  }
  async send(a, user) {
    try { this.consume(a, await this.provider.checkout(a.payload, a.key), false, user); }
    catch (e) { this.failure(a, e, user); }
  }
  failure(a, e, user) {
    const isBusiness = e.providerStatus >= 400 && e.providerStatus < 500 && ![409, 429].includes(e.providerStatus);
    a.state = e.code === 'IDEMPOTENT_PARAMETER_MISMATCH' || (e.replayed && e.providerStatus >= 500) ? 'RECONCILIATION_REQUIRED' : isBusiness ? 'FAILED' : 'UNKNOWN';
    a.lastError = typeof e.code === 'string' ? e.code : 'PROVIDER_UNKNOWN';
    a.recoverable = e.code === 'NETWORK_UNKNOWN' || (e.code === 'PROVIDER_SCHEMA' && !a.providerId) || e.providerStatus === 429 || (e.providerStatus === 409 && e.code === 'IDEMPOTENCY_REQUEST_IN_PROGRESS');
    this.persist(a, user, 'CHECKOUT_UNCERTAIN');
  }
  consume(a, raw, consulted, user) {
    const next = { ...a };
    const payload = JSON.parse(a.payload);
    ensure(idValue(raw?.id), 'PROVIDER_SCHEMA', 'Falta referencia válida del proveedor.', 502);
    if (!next.providerId) next.providerId = raw.id;
    const reconcile = () => {
      next.state = 'RECONCILIATION_REQUIRED'; next.anomaly = 'schema_mismatch'; next.recoverable = false;
      next.approvalUrl = null;
      // Keep the reference for GET reconciliation. A provisional URL is private
      // and cannot authorize a checkout whose terms have not been matched.
      try { next.pendingApprovalUrl = safeHostedUrl(raw.nextAction?.url); } catch { next.pendingApprovalUrl = null; }
      this.persist(next, user, 'RECONCILIATION_REQUIRED');
    };
    const echoMatches = raw.quoteId === payload.quoteId && raw.enrollmentId === payload.enrollmentId;
    const documentedGet = consulted && next.bindingVerified &&
      (raw.quoteId === undefined || raw.quoteId === payload.quoteId) &&
      (raw.enrollmentId === undefined || raw.enrollmentId === payload.enrollmentId);
    if (raw.id !== next.providerId || !(echoMatches || documentedGet) || !states.has(raw.status)) { reconcile(); return; }
    next.bindingVerified = true;
    if (next.anomaly === 'schema_mismatch') next.anomaly = null;
    next.pendingApprovalUrl = null;
    if (raw.nextAction?.url) {
      if (raw.status !== 'REQUIRES_ACTION' || raw.nextAction.type !== 'REDIRECT') { reconcile(); return; }
      try { next.approvalUrl = this.config.mode === 'fixture' ? this.config.origin + '/fixture' : safeHostedUrl(raw.nextAction.url); }
      catch { reconcile(); return; }
      next.hostedApproval = true;
    }
    if (this.config.mode === 'sandbox' && !next.hostedApproval) next.anomaly = 'missing_hosted_approval';
    next.state = raw.status === 'COMPLETED' && !consulted ? 'PROCESSING' : raw.status;
    if (raw.status === 'COMPLETED' && consulted) {
      const r = this.store.request(a.requestId);
      ensure(raw.finalAmount && idValue(raw.orderId), 'PROVIDER_SCHEMA', 'Falta importe final o referencia de orden.', 502);
      next.finalMinor = toMinor(raw.finalAmount.amount); next.finalCurrency = raw.finalAmount.currency; next.orderId = raw.orderId;
      if (next.finalMinor !== r.quote.totalMinor || next.finalCurrency !== r.currency) next.anomaly = 'amount_mismatch';
      if (!next.anomaly && this.config.mode === 'sandbox' && next.hostedApproval) next.evidenceMode = 'sandbox-aprobación-alojada';
    }
    if (finals.has(next.state)) next.approvalUrl = null;
    next.recoverable = false; this.persist(next, user, consulted ? 'PROVIDER_STATUS_CONFIRMED' : 'CHECKOUT_RECEIVED');
  }
  persist(a, user, type) {
    this.store.transaction(() => {
      this.store.saveAttempt(a);
      const r = this.store.request(a.requestId); r.status = a.state; this.store.save(r);
      this.store.event(r, user.id, type, { attemptId: a.id, state: a.state, anomaly: a.anomaly, code: a.lastError ?? null });
    });
  }
  async refresh(id, user, recover = false) {
    const r = this.owned(id, user); this.responsible(r, user);
    const a = this.store.attempt(id); ensure(a, 'ATTEMPT', 'No existe checkout todavía.', 409);
    if (finals.has(a.state) || this.busy.has(id)) return this.view(r, user);
    this.busy.add(id);
    try {
      if (a.providerId) {
        try { this.consume(a, await this.provider.readCheckout(a.providerId), true, user); }
        catch (e) { a.lastError = e.code || 'PROVIDER_UNKNOWN'; this.persist(a, user, 'STATUS_UNCERTAIN'); }
      } else if (recover) {
        ensure(a.state === 'SUBMITTING' || a.recoverable, 'RECONCILIATION', 'Este resultado requiere revisión con Reap; no se reenviará.', 409);
        if (this.now() - a.createdAt >= 23 * 3_600_000 || a.recoveryCount >= 3) {
          a.state = 'RECONCILIATION_REQUIRED'; this.persist(a, user, 'RECONCILIATION_REQUIRED');
        } else {
          ensure(digest(a.payload) === a.payloadHash, 'PAYLOAD_CHANGED', 'Payload persistido cambió; checkout deshabilitado.', 409);
          a.recoveryCount++; this.store.saveAttempt(a);
          await new Promise(resolve => setTimeout(resolve, Math.min(250 * 2 ** a.recoveryCount, 2000)));
          await this.send(a, user);
        }
      }
      return this.view(this.owned(id, user), user);
    } finally { this.busy.delete(id); }
  }
  async fixtureApprove(id, user) {
    const r = this.owned(id, user); this.responsible(r, user);
    ensure(this.config.mode === 'fixture', 'FORBIDDEN', 'Esta acción solo existe en fixtures.', 403);
    const a = this.store.attempt(id); ensure(a?.providerId, 'ATTEMPT', 'Primero crea el intento.', 409);
    await this.provider.approve(a.providerId); return this.refresh(id, user);
  }
}
