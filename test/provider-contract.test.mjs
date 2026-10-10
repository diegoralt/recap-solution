import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuote, ReapProvider, ProviderError } from '../src/providers/reap.mjs';
import { candidateFor } from '../src/merchants.mjs';
import { rig, approved, body, config, requester, approver } from './helpers.mjs';
const rawQuote = () => ({ id: 'q', expiresAt: new Date(Date.now() + 600000).toISOString(), shippingOptions: [], amountBreakdown: { finalAmount: { amount: 690, currency: 'MXN' } } });
const adapterConfig = { ...config, baseUrl: 'https://sg.sandbox.api.reap.global', apiKey: 'test-only', apiVersion: '2025-02-14' };

test('Incidente P1-1: externalCheckout sin ítems declara intención, nunca confirmación de producto', () => {
  const q = normalizeQuote(rawQuote(), body(), candidateFor('coffee'));
  assert.equal(q.productEvidence, 'request-only');
  assert.throws(() => normalizeQuote({ ...rawQuote(), lineItems: [{ variantId: 'OTHER', quantity: 1 }] }, body(), candidateFor('coffee')), { code: 'PRODUCT' });
  assert.throws(() => normalizeQuote({ ...rawQuote(), lineItems: [{ variantId: candidateFor('coffee').variant, quantity: 1 }] }, body(), candidateFor('coffee')), { code: 'PRODUCT' });
});
test('quote omite opcionales nulos y normaliza vigencia ISO UTC', async () => {
  let sent;
  const raw = rawQuote(); raw.expiresAt = '2099-01-01T02:00:00+02:00';
  const p = new ReapProvider(adapterConfig, async (_, options) => { sent = JSON.parse(options.body); return Response.json(raw); });
  const q = await p.quote(body({ address: { ...body().address, region: null, addressLine2: null } }), candidateFor('coffee'), 'test-key');
  assert.equal(Object.hasOwn(sent.shippingAddress, 'addressLine2'), false); assert.equal(Object.hasOwn(sent.shippingAddress, 'region'), false);
  assert.equal(q.expiresAt, '2099-01-01T00:00:00.000Z');
});
test('Incidente P1-2: JSON 2xx cortado/abortado permite recuperar misma clave/body', async t => {
  for (const failure of ['invalid-json', 'abort']) {
    const { flow, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
    let sends = 0; const identities = [];
    const p = new ReapProvider(adapterConfig, async (_, options) => {
      sends++; identities.push([options.headers['Idempotency-Key'], options.body]);
      if (sends === 1) return failure === 'invalid-json' ? new Response('{') : { ok: true, status: 200, json: async () => { throw new DOMException('Aborted', 'AbortError'); } };
      const payload = JSON.parse(options.body);
      return Response.json({ id: 'checkout_recovered', ...payload, status: 'REQUIRES_ACTION', nextAction: { type: 'REDIRECT', url: 'https://example.com/reap-test' } });
    });
    flow.provider.checkout = p.checkout.bind(p);
    const first = await flow.checkout(r.id, approver); assert.equal(first.status, 'UNKNOWN'); assert.equal(first.attempt.recoverable, true);
    const recovered = await flow.refresh(r.id, approver, true);
    assert.equal(recovered.status, 'REQUIRES_ACTION'); assert.deepEqual(identities[0], identities[1]); assert.equal(sends, 2);
  }
});
test('Incidente P1-2: checkout sin eco conserva ID privado; solo GET conforme habilita aprobación', async t => {
  const { flow, provider, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  let sends = 0; const original = provider.checkout.bind(provider);
  provider.checkout = async (...args) => { sends++; const raw = await original(...args); const { quoteId, enrollmentId, ...withoutEcho } = raw; return withoutEcho; };
  const first = await flow.checkout(r.id, approver);
  assert.equal(first.status, 'RECONCILIATION_REQUIRED'); assert.ok(first.attempt.providerId); assert.equal(first.attempt.approvalUrl, null); assert.equal(first.attempt.anomaly, 'schema_mismatch');
  assert.equal(first.attempt.completeConform, false);
  const recovered = await flow.refresh(r.id, approver, true);
  assert.equal(recovered.status, 'REQUIRES_ACTION'); assert.equal(recovered.attempt.anomaly, null); assert.equal(sends, 1);
  assert.equal(flow.view(store.request(r.id), requester).attempt.approvalUrl, null);
});
test('eco incorrecto permanece en conciliación sin enlace ni segundo POST', async t => {
  const { flow, provider, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  provider.checkout = async () => ({ id: 'wrong_terms', quoteId: 'wrong', enrollmentId: 'wrong', status: 'COMPLETED' });
  provider.readCheckout = provider.checkout;
  const result = await flow.checkout(r.id, approver); const next = await flow.refresh(r.id, approver);
  assert.equal(result.attempt.providerId, 'wrong_terms'); assert.equal(next.status, 'RECONCILIATION_REQUIRED'); assert.equal(next.attempt.completeConform, false); assert.equal(next.attempt.approvalUrl, null);
});
test('evidencia sandbox alojada se asigna únicamente tras GET completo conforme', async t => {
  const { flow, provider, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  flow.config = { ...config, mode: 'sandbox', enrollmentId: 'fixture_enrollment' }; const saved = store.request(r.id); saved.mode = 'sandbox'; store.save(saved);
  const original = provider.checkout.bind(provider);
  provider.checkout = async (...args) => { const raw = await original(...args); return { ...raw, nextAction: { ...raw.nextAction, url: 'https://example.com/approval-test' } }; };
  const pending = await flow.checkout(r.id, approver); assert.equal(pending.attempt.evidenceMode, null);
  await provider.approve(pending.attempt.providerId); const done = await flow.refresh(r.id, approver);
  assert.equal(done.attempt.evidenceMode, 'sandbox-aprobación-alojada'); assert.equal(done.attempt.completeConform, true);
});
test('responsable no puede editar términos del solicitante ni ver claves en eventos públicos', async t => {
  const { flow, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  for (const patch of [{ quantity: 1 }, { currency: 'USD' }, { address: body().address }]) assert.throws(() => flow.update(r.id, { version: r.version, ...patch }, approver), { code: 'FORBIDDEN' });
  await flow.checkout(r.id, approver);
  assert.equal(flow.view(store.request(r.id), requester).events.some(e => Object.hasOwn(e.details, 'key')), false);
});
test('enrollment 4xx definitivo permite nueva clave; timeout mantiene la original', async t => {
  for (const error of [new ProviderError('AGENTIC_REQUEST_REJECTED', 400), new ProviderError('NETWORK_UNKNOWN')]) {
    const { flow, provider, store } = rig(); t.after(() => store.close()); flow.config = { ...config, mode: 'sandbox' };
    const keys = []; provider.createEnrollment = async (_, key) => { keys.push(key); if (keys.length === 1) throw error; return { id: 'enrollment_test', status: 'ACTIVE' }; };
    await assert.rejects(flow.enrollment(approver, true)); await flow.enrollment(approver, true);
    assert.equal(keys[0] === keys[1], error.code === 'NETWORK_UNKNOWN');
  }
});
test('Incidente P1-N1: GET sin eco opcional conserva enlace y confirma pago de un POST vinculado', async t => {
  const { flow, store, provider } = rig(); t.after(() => store.close()); const r = await approved(flow);
  const a = await flow.checkout(r.id, approver); const original = provider.readCheckout.bind(provider);
  provider.readCheckout = async (...args) => { const { quoteId, enrollmentId, ...rest } = await original(...args); return rest; };
  const pending = await flow.refresh(r.id, approver); assert.equal(pending.status, 'REQUIRES_ACTION'); assert.ok(pending.attempt.approvalUrl);
  const raw = await original(a.attempt.providerId); store.providerPut('checkout', raw.id, { ...raw, status: 'COMPLETED', nextAction: null, orderId: 'test_order', finalAmount: { amount: '690', currency: 'MXN' } });
  const done = await flow.refresh(r.id, approver); assert.equal(done.status, 'COMPLETED'); assert.equal(done.attempt.completeConform, true);
});
test('GET sin eco no valida un POST que nunca vinculó términos; eco incorrecto tampoco', async t => {
  const { flow, provider, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  provider.checkout = async () => ({ id: 'unbound', status: 'REQUIRES_ACTION', nextAction: { type: 'REDIRECT', url: 'https://example.com/test' } });
  provider.readCheckout = async () => ({ id: 'unbound', status: 'COMPLETED', orderId: 'order', finalAmount: { amount: '690', currency: 'MXN' }, nextAction: null });
  await flow.checkout(r.id, approver); const result = await flow.refresh(r.id, approver);
  assert.equal(result.status, 'RECONCILIATION_REQUIRED'); assert.equal(result.attempt.completeConform, false);
});
test('enrollment FAILED/EXPIRED permite nuevo registro sin borrar BD ni reutilizar clave final', async t => {
  for (const status of ['FAILED', 'EXPIRED', 'REVOKED']) {
    const { flow, provider, store } = rig(); t.after(() => store.close()); flow.config = { ...config, mode: 'sandbox' };
    store.setting('enrollment', { id: 'old', status, key: 'old-key' });
    provider.readEnrollment = async () => ({ id: 'old', status });
    provider.createEnrollment = async (_, key) => { assert.notEqual(key, 'old-key'); return { id: 'new', status: 'REQUIRES_ACTION', nextAction: { url: 'https://example.com/enrollment' } }; };
    assert.equal((await flow.enrollment(approver)).status, status);
    assert.equal((await flow.enrollment(approver, true)).id, 'new');
  }
});
test('Incidente sandbox: quote de más de 15 s tiene margen de 45 s; checkout mantiene 15 s', async () => {
  const deadlines = [];
  const p = new ReapProvider(adapterConfig, async (url) => Response.json(url.endsWith('/quotes') ? rawQuote() : { id: 'test_checkout' }), ms => { deadlines.push(ms); return new AbortController().signal; });
  await p.quote(body(), candidateFor('coffee'), 'quote-only-key');
  await p.checkout('{}', 'checkout-only-key');
  assert.deepEqual(deadlines, [45000, 15000]);
});
