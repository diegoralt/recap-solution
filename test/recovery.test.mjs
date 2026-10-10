import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { Store } from '../src/store.mjs';
import { ReapProvider, ProviderError } from '../src/providers/reap.mjs';
import { PurchaseFlow } from '../src/agent.mjs';
import { approved, rig, config, approver, requester } from './helpers.mjs';

test('T4 · doble clic concurrente crea un único checkout', async t => {
  const { flow, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  const results = await Promise.allSettled([flow.checkout(r.id, approver), flow.checkout(r.id, approver)]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(store.db.prepare("SELECT count(*) AS n FROM provider_data WHERE kind='checkout'").get().n, 1);
  assert.equal(store.events(r.id).filter(x => x.type === 'CHECKOUT_DISPATCH').length, 1);
});
test('T4 · HTTP timeout después de crear compra + reinicio + quote expirada recupera misma identidad', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'recap-test-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  let now = Date.now(), lost = false, providerPurchases = 0;
  const keys = new Map(), quoteId = 'quote_http', enrollmentId = 'enrollment_http';
  const sandboxConfig = { ...config, mode: 'sandbox', baseUrl: 'https://mx.sandbox.api.reap.global', apiKey: 'test-key-not-real', apiVersion: '2026-01-01', enrollmentId };
  const quoteRaw = { id: quoteId, expiresAt: new Date(now + 600000).toISOString(), shippingOptions: [],
    amountBreakdown: { finalAmount: { amount: 690, currency: 'MXN' } } };
  const mock = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    if (req.url === '/agentic/quotes' || req.url === '/agentic/quotes/' + quoteId) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(quoteRaw)); return; }
    if (req.url === '/agentic/enrollments/' + enrollmentId) { res.end(JSON.stringify({ id: enrollmentId, status: 'ACTIVE' })); return; }
    if (req.url === '/agentic/checkouts' && req.method === 'POST') {
      assert.equal(req.headers['x-simulate-checkout'], undefined);
      const key = req.headers['idempotency-key'];
      if (!keys.has(key)) { keys.set(key, { body, id: 'checkout_http' }); providerPurchases++; }
      assert.equal(keys.get(key).body, body);
      if (!lost) { lost = true; req.socket.destroy(); return; }
      res.end(JSON.stringify({ id: 'checkout_http', quoteId, enrollmentId, status: 'REQUIRES_ACTION', nextAction: { type: 'REDIRECT', url: 'https://approval.reap.example/test' } })); return;
    }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => mock.close(resolve)));
  const endpoint = `http://127.0.0.1:${mock.address().port}`;
  const localFetch = (url, options) => fetch(url.replace(sandboxConfig.baseUrl, endpoint), options);
  let store = new Store(join(dir, 'restart.sqlite'));
  let provider = new ReapProvider(sandboxConfig, localFetch);
  let flow = new PurchaseFlow(store, provider, sandboxConfig, () => now);
  const r = await approved(flow), result = await flow.checkout(r.id, approver);
  assert.equal(result.status, 'UNKNOWN'); assert.equal(providerPurchases, 1);
  const original = store.attempt(r.id); store.close(); now += 601000;
  store = new Store(join(dir, 'restart.sqlite')); t.after(() => store.close());
  provider = new ReapProvider(sandboxConfig, localFetch); flow = new PurchaseFlow(store, provider, sandboxConfig, () => now);
  const recovered = await flow.refresh(r.id, approver, true);
  assert.equal(recovered.status, 'REQUIRES_ACTION'); assert.equal(recovered.attempt.providerId, 'checkout_http'); assert.equal(providerPurchases, 1);
  assert.equal(store.attempt(r.id).key, original.key); assert.equal(store.attempt(r.id).payload, original.payload);
});
test('recuperación fuera de 23 horas no reenvía ni crea clave nueva', async t => {
  let now = Date.now(); const { flow, provider, store } = rig({ now: () => now }); t.after(() => store.close());
  const r = await approved(flow); let sends = 0;
  provider.checkout = async () => { sends++; throw new ProviderError('NETWORK_UNKNOWN'); };
  await flow.checkout(r.id, approver); const key = store.attempt(r.id).key; now += 23 * 3600000;
  assert.equal((await flow.refresh(r.id, approver, true)).status, 'RECONCILIATION_REQUIRED'); assert.equal(sends, 1); assert.equal(store.attempt(r.id).key, key);
});
test('5xx cacheado exige reconciliación sin loop', async t => {
  const { flow, provider, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  let sends = 0; provider.checkout = async () => { sends++; throw new ProviderError('AGENTIC_SERVICE_UNAVAILABLE', 503, true); };
  assert.equal((await flow.checkout(r.id, approver)).status, 'RECONCILIATION_REQUIRED');
  await assert.rejects(flow.refresh(r.id, approver, true), { code: 'RECONCILIATION' }); assert.equal(sends, 1);
});
test('carrera edición mientras se verifica quote no alcanza checkout', async t => {
  const { flow, provider, store } = rig(); t.after(() => store.close()); const r = await approved(flow);
  let release, entered; const gate = new Promise(resolve => { release = resolve; }); const waiting = new Promise(resolve => { entered = resolve; });
  const original = provider.readQuote.bind(provider);
  provider.readQuote = async (...args) => { const q = await original(...args); entered(); await gate; return q; };
  const send = flow.checkout(r.id, approver); await waiting;
  flow.update(r.id, { version: r.version, quantity: 1 }, requester); release();
  await assert.rejects(send, { code: 'STALE' }); assert.equal(store.attempt(r.id), null);
});
test('identidad/body del intento son inmutables en SQLite', async t => {
  const { flow, store } = rig(); t.after(() => store.close()); const r = await approved(flow); await flow.checkout(r.id, approver);
  assert.throws(() => store.saveAttempt({ ...store.attempt(r.id), payload: '{}' }), { code: 'ATTEMPT_IMMUTABLE' });
});
test('adapter sandbox no añade header de simulación ni permite redirección API', async () => {
  const calls = [], c = { ...config, baseUrl: 'https://mx.sandbox.api.reap.global', apiKey: 'test-only', apiVersion: '2026-01-01' };
  const p = new ReapProvider(c, async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify({ id: 'result' }), { status: 200 }); });
  await p.checkout('{"quoteId":"q"}', 'same-key'); await p.createEnrollment('{}', 'enrollment-key');
  for (const call of calls) { assert.equal(call.options.headers['X-Simulate-Checkout'], undefined); assert.equal(call.options.redirect, 'error'); }
  assert.equal(calls[0].options.headers['Idempotency-Key'], 'same-key');
});
