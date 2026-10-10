import { createHash } from 'node:crypto';
import { ensure } from './errors.mjs';
export const addressFields = ['firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'country'];
export const clean = value => typeof value === 'string' ? value.trim().normalize('NFC') : value;
export function toMinor(value) {
  const text = String(value);
  ensure(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(text), 'AMOUNT', 'Importe inválido; usa hasta dos decimales.');
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  ensure(Number.isSafeInteger(amount), 'AMOUNT', 'Importe inválido.'); return amount;
}
export function normalizeAddress(address) {
  ensure(address && typeof address === 'object' && !Array.isArray(address), 'ADDRESS', 'Introduce una dirección ficticia de prueba.');
  const result = {};
  for (const field of addressFields) {
    const value = address[field] == null ? null : clean(address[field]);
    ensure(value === null || (typeof value === 'string' && value.length <= 150), 'ADDRESS', 'Dirección inválida.');
    result[field] = value;
  }
  for (const field of ['firstName', 'lastName', 'phone', 'addressLine1', 'city', 'postalCode', 'country']) ensure(result[field], 'ADDRESS', 'Faltan campos de dirección.');
  ensure(/^[A-Z]{2}$/.test(result.country), 'ADDRESS', 'Usa país ISO de dos letras.');
  ensure(/^\+[1-9]\d{6,14}$/.test(result.phone), 'ADDRESS', 'Usa teléfono internacional con prefijo +.'); return result;
}
export function termsHash(r) {
  const q = r.quote;
  ensure(q, 'QUOTE', 'Primero obtén una cotización.');
  const fields = [r.id, r.version, q.merchant, q.productId, q.variantId, q.quantity,
    addressFields.map(f => r.address[f] ?? null), q.currency, q.totalMinor, q.id, q.shippingOptionId ?? null,
    new Date(q.expiresAt).toISOString(), r.budgetMinor, q.productEvidence ?? 'fixture'];
  return createHash('sha256').update('terms:v1' + JSON.stringify(fields)).digest('hex');
}
export function validateCandidate(r, candidate) {
  ensure(candidate && candidate.key === r.candidateKey, 'MERCHANT', 'Comercio o producto no permitido.');
  ensure(candidate.shipsTo.includes(r.address.country), 'DESTINATION', 'Este comercio no tiene envío explícito al país indicado.');
  ensure(r.currency === candidate.currency, 'CURRENCY', 'Presupuesto y producto deben usar la misma moneda.');
  ensure(Number.isInteger(r.quantity) && r.quantity > 0 && r.quantity <= 10, 'QUANTITY', 'Cantidad de 1 a 10 unidades.');
  ensure(Number.isSafeInteger(r.budgetMinor) && r.budgetMinor > 0, 'BUDGET', 'El límite debe ser mayor a cero.');
  for (const attribute of r.requiredAttributes) ensure(candidate.attributes.includes(attribute), 'ATTRIBUTE', 'La característica requerida no está comprobada para esta variante.');
}
export function validateQuote(r, q, candidate, now = Date.now()) {
  validateCandidate(r, candidate);
  ensure(q && q.id && typeof q.id === 'string', 'QUOTE', 'Cotización no válida.');
  ensure(q.merchant === candidate.domain && q.productId === candidate.product && q.variantId === candidate.variant,
    'PRODUCT', 'El producto o variante cotizados no corresponden a la solicitud.');
  ensure(q.quantity === r.quantity, 'QUANTITY', 'La cotización no respeta la cantidad solicitada.');
  ensure(q.currency === r.currency, 'CURRENCY', 'La cotización usa otra moneda.');
  ensure(Number.isSafeInteger(q.totalMinor) && q.totalMinor >= 0, 'QUOTE', 'Total final inválido.');
  ensure(q.totalMinor <= r.budgetMinor, 'OVER_BUDGET', 'El total con envío e impuestos supera el límite.');
  ensure(typeof q.expiresAt === 'string' && Number.isFinite(Date.parse(q.expiresAt)) && Date.parse(q.expiresAt) > now,
    'QUOTE_EXPIRED', 'Cotización expirada; recotiza y solicita aprobación nueva.');
  return q;
}
