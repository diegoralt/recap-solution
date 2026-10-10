import { randomUUID } from 'node:crypto';
import { ensure, AppError } from '../errors.mjs';
import { toMinor } from '../policy.mjs';
import { checkoutUrl } from '../merchants.mjs';
import { SANDBOX_HOSTS } from '../config.mjs';

export class ProviderError extends AppError {
  constructor(code, status = 503, replayed = false) {
    super(code, 'Reap no pudo completar esta operación. Consulta el estado antes de reintentar.', status);
    this.providerStatus = status; this.replayed = replayed;
  }
}
export function safeHostedUrl(value) {
  if (!value) return null;
  try { const u = new URL(value); ensure(u.protocol === 'https:' && !u.username && !u.password, 'HOSTED_URL', 'URL de aprobación inválida.', 502); return u.href; }
  catch { throw new AppError('HOSTED_URL', 'URL de aprobación inválida.', 502); }
}
export function normalizeQuote(raw, request, candidate) {
  const final = raw?.amountBreakdown?.finalAmount;
  ensure(raw?.id && final && typeof final.currency === 'string', 'PROVIDER_SCHEMA', 'Reap no devolvió un total final válido.', 502);
  const options = Array.isArray(raw.shippingOptions) ? raw.shippingOptions : [];
  const chosen = options.find(x => x.selected);
  ensure(!options.length || chosen, 'SHIPPING', 'La cotización no tiene envío seleccionado.', 502);
  const amount = value => value ? toMinor(value.amount) : null;
  // The documented externalCheckout response does not echo cart contents.
  // Local intent is never evidence that Reap confirmed product or quantity.
  if (raw.lineItems !== undefined) {
    ensure(Array.isArray(raw.lineItems) && raw.lineItems.length === 1 &&
      raw.lineItems[0].variantId === candidate.variant && raw.lineItems[0].quantity === request.quantity,
      'PRODUCT', 'La respuesta contiene un carrito distinto o no verificable.', 502);
  }
  const expires = Date.parse(raw.expiresAt);
  ensure(Number.isFinite(expires), 'PROVIDER_SCHEMA', 'Vigencia de cotización inválida.', 502);
  return { id: raw.id, merchant: candidate.domain, productId: candidate.product, variantId: candidate.variant,
    quantity: request.quantity, productEvidence: 'request-only', currency: final.currency, totalMinor: toMinor(final.amount), expiresAt: new Date(expires).toISOString(),
    shippingOptionId: chosen?.id ?? null, subtotalMinor: amount(raw.amountBreakdown.itemsSubtotal),
    shippingMinor: amount(raw.amountBreakdown.shipping), taxMinor: amount(raw.amountBreakdown.tax?.amount),
    source: 'externalCheckout', mode: 'sandbox' };
}
export class ReapProvider {
  constructor(config, fetchImpl = fetch, timeoutSignal = ms => AbortSignal.timeout(ms)) {
    ensure(SANDBOX_HOSTS.has(config.baseUrl), 'CONFIG', 'Solo sandbox Reap permitido.');
    this.config = config; this.fetch = fetchImpl; this.timeoutSignal = timeoutSignal;
  }
  async call(path, { method = 'GET', body, key, timeoutMs = 15_000 } = {}) {
    const headers = { Authorization: `Bearer ${this.config.apiKey}`, 'Reap-Version': this.config.apiVersion };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (key) headers['Idempotency-Key'] = key;
    let response;
    try { response = await this.fetch(this.config.baseUrl + path, { method, headers, body, redirect: 'error', signal: this.timeoutSignal(timeoutMs) }); }
    catch { throw new ProviderError('NETWORK_UNKNOWN'); }
    let raw;
    try { raw = await response.json(); }
    catch { throw new ProviderError(response.ok ? 'NETWORK_UNKNOWN' : 'PROVIDER_SCHEMA', response.status >= 400 ? response.status : 503); }
    if (!response.ok) {
      const code = String(raw?.error?.code || 'REAP_ERROR').replace(/[^A-Z_0-9]/g, '').slice(0, 80);
      throw new ProviderError(code, response.status, response.headers.get('Idempotent-Replayed') === 'true');
    }
    return raw;
  }
  async quote(request, candidate, key) {
    const body = { externalCheckout: { merchantDomain: candidate.domain, checkoutUrl: checkoutUrl(candidate, request.quantity) },
      email: this.config.email, shippingAddress: Object.fromEntries(Object.entries(request.address).filter(([, value]) => value !== null && value !== '')) };
    return normalizeQuote(await this.call('/agentic/quotes', { method: 'POST', body: JSON.stringify(body), key, timeoutMs: 45_000 }), request, candidate);
  }
  async readQuote(id, request, candidate) {
    return normalizeQuote(await this.call('/agentic/quotes/' + encodeURIComponent(id)), request, candidate);
  }
  async checkout(payload, key) { return this.call('/agentic/checkouts', { method: 'POST', body: payload, key }); }
  async readCheckout(id) { return this.call('/agentic/checkouts/' + encodeURIComponent(id)); }
  async readEnrollment(id) { return this.call('/agentic/enrollments/' + encodeURIComponent(id)); }
  async createEnrollment(payload, key) { return this.call('/agentic/enrollments', { method: 'POST', body: payload, key }); }
  quoteKey() { return randomUUID(); }
}
