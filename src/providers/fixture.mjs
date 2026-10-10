import { randomUUID } from 'node:crypto';
import { toMinor } from '../policy.mjs';
import { ensure } from '../errors.mjs';
export class FixtureProvider {
  constructor(store, config, now = Date.now) { this.store = store; this.config = config; this.now = now; }
  async quote(r, c, key) {
    const old = this.store.providerGet('quote-key', key); if (old) return old;
    const subtotalMinor = toMinor(c.referencePrice) * r.quantity;
    const shippingMinor = c.currency === 'MXN' ? 90_00 : 5_00;
    const q = { id: 'fixture_quote_' + randomUUID(), merchant: c.domain, productId: c.product, variantId: c.variant,
      quantity: r.quantity, currency: c.currency, totalMinor: subtotalMinor + shippingMinor,
      subtotalMinor, shippingMinor, taxMinor: 0, expiresAt: new Date(this.now() + 600_000).toISOString(),
      shippingOptionId: 'fixture-standard', mode: 'fixture', source: 'fixture' };
    this.store.providerPut('quote', q.id, q); this.store.providerPut('quote-key', key, q); return q;
  }
  async readQuote(id) { const q = this.store.providerGet('quote', id); ensure(q, 'QUOTE', 'Cotización fixture no encontrada.', 404); return q; }
  async checkout(payload, key) {
    const old = this.store.providerGet('checkout-key', key);
    if (old) { ensure(old.payload === payload, 'IDEMPOTENT_PARAMETER_MISMATCH', 'El intento cambió.', 400); return old.checkout; }
    const body = JSON.parse(payload), quote = await this.readQuote(body.quoteId);
    const response = { id: 'fixture_checkout_' + randomUUID(), quoteId: body.quoteId, enrollmentId: body.enrollmentId,
      status: 'REQUIRES_ACTION', amount: { amount: String(quote.totalMinor / 100), currency: quote.currency },
      nextAction: { type: 'REDIRECT', url: this.config.origin + '/fixture', expiresAt: quote.expiresAt } };
    this.store.providerPut('checkout', response.id, response);
    this.store.providerPut('checkout-key', key, { payload, checkout: response }); return response;
  }
  async readCheckout(id) { const c = this.store.providerGet('checkout', id); ensure(c, 'CHECKOUT', 'Checkout no encontrado.', 404); return c; }
  async approve(id) {
    const c = await this.readCheckout(id);
    ensure(c.status === 'REQUIRES_ACTION', 'STATE', 'Este intento ya no requiere aprobación.', 409);
    const q = await this.readQuote(c.quoteId);
    const next = { ...c, status: 'COMPLETED', nextAction: null, orderId: 'fixture_order_' + randomUUID(),
      finalAmount: { amount: String(q.totalMinor / 100), currency: q.currency } };
    this.store.providerPut('checkout', id, next); return next;
  }
  async readEnrollment() { return { id: 'fixture_enrollment', status: 'ACTIVE' }; }
}
