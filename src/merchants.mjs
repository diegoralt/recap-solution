import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ensure } from './errors.mjs';
const csvPath = new URL('../Reap - List of Supported Merchant - All Supported Merchants.csv', import.meta.url);
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}
const buffer = readFileSync(csvPath);
// Raw bytes hash (git hash-object --no-filters). The documented git hash uses local EOL filters.
ensure(createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex') === '228b336ae014e3b95c474d8f093ce77175867ed0',
  'CSV_CHANGED', 'El CSV original cambió; revisa la fuente antes de operar.', 500);
const [headers, ...rows] = parseCsv(buffer.toString());
const byDomain = new Map(rows.filter(row => row.length > 1).map(row => { const value = Object.fromEntries(headers.map((h, i) => [h, row[i]])); return [value['Merchant door'], value]; }));
const definitions = [
  ['coffee', 'cafeteria', 'blendstation.com.mx', ['250g', 'grano'], 2, '800', 'Cafetería', 20],
  ['mouse', 'equipo', 'acteck.com', ['multidispositivo'], 1, '400', 'Equipo', 3],
  ['feeder', 'hogar', 'wildone.com', ['lilac', 'comedero-gato'], 1, '35', 'Hogar', 149],
  ['table', 'respaldo', 'abchome.com', [], 1, '350', 'Respaldo US', 2]
];
export const candidates = definitions.map(([key, scenario, domain, attributes, quantity, budget, label, line]) => {
  const row = byDomain.get(domain); ensure(row, 'MERCHANT', 'Referencia de comercio ausente.', 500);
  const permalink = new URL(row['Cart permalink']);
  ensure(permalink.protocol === 'https:' && permalink.hostname === domain && !permalink.username && !permalink.password,
    'MERCHANT', 'Enlace del candidato requiere revisión.', 500);
  return Object.freeze({ key, scenario, domain, product: row['Test product'], variant: row['Variant ID'],
    currency: row.Currency, referencePrice: row['Item price'], shipsTo: row['Ships to'].split(',').map(x => x.trim()),
    permalink: row['Cart permalink'], attributes, quantity, budget, label, line, market: row.Market });
});
export function candidateFor(key) { return candidates.find(c => c.key === key); }
export function checkoutUrl(candidate, quantity) {
  ensure(Number.isInteger(quantity) && quantity >= 1 && quantity <= 10, 'QUANTITY', 'Cantidad inválida.');
  const url = new URL(candidate.permalink);
  url.pathname = `/cart/${candidate.variant}:${quantity}`;
  return url.href;
}
