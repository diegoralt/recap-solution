import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';
import { config, body } from './helpers.mjs';
import { configFrom } from '../src/config.mjs';
import { Auth } from '../src/auth.mjs';
import { Store } from '../src/store.mjs';
import { request as httpRequest } from 'node:http';

test('HTTP · sesión, CSRF, autorización y flujo completo con cuentas separadas', async t => {
  const c = { ...config };
  const app = createApp(c);
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.server.close(() => { app.store.close(); resolve(); })));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  // Socket is ephemeral, but Host/Origin must remain the configured application origin.
  async function call(path, method = 'GET', input, s, extras = {}) {
    const res = await new Promise((resolve, reject) => {
      const req = httpRequest(base + path, { method, headers: { Host: 'localhost:3000',
      ...(method !== 'GET' ? { Origin: c.origin, 'Content-Type': 'application/json' } : {}),
      ...(s ? { Cookie: s.cookie, 'X-CSRF-Token': s.csrf } : {}), ...extras } }, response => {
        const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => {
          const headers = new Headers(); for (const [key, value] of Object.entries(response.headers)) {
            if (Array.isArray(value)) for (const v of value) headers.append(key, v); else if (value !== undefined) headers.set(key, value);
          }
          resolve(new Response(Buffer.concat(chunks).toString(), { status: response.statusCode, headers }));
        });
      });
      req.on('error', reject); req.end(input === undefined ? undefined : JSON.stringify(input));
    });
    return { res, data: await res.json() };
  }
  const login = async (username, password) => {
    const result = await call('/api/login', 'POST', { username, password }); assert.equal(result.res.status, 200);
    assert.match(result.res.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    return { cookie: result.res.headers.get('set-cookie').split(';')[0], csrf: result.data.csrf };
  };
  const req = await login('solicitante', c.requesterPassword), resp = await login('responsable', c.approverPassword);
  const r = (await call('/api/requests', 'POST', body(), req)).data;
  const q = (await call(`/api/requests/${r.id}/quote`, 'POST', {}, req)).data;
  assert.equal((await call(`/api/requests/${r.id}/approve`, 'POST', { termsHash: q.termsHash }, req)).res.status, 403);
  assert.equal((await call(`/api/requests/${r.id}/approve`, 'POST', { termsHash: q.termsHash }, resp, { 'X-CSRF-Token': 'wrong' })).res.status, 403);
  assert.equal((await call(`/api/requests/${r.id}/approve`, 'POST', { termsHash: q.termsHash }, resp)).res.status, 200);
  const pending = await call(`/api/requests/${r.id}/checkout`, 'POST', {}, resp); assert.equal(pending.data.status, 'REQUIRES_ACTION');
  const ownView = await call(`/api/requests/${r.id}`, 'GET', undefined, req); assert.equal(ownView.data.attempt.approvalUrl, null);
  const done = await call(`/api/requests/${r.id}/fixture-approve`, 'POST', {}, resp); assert.equal(done.data.attempt.completeConform, true);
  assert.equal((await call('/api/requests', 'GET')).res.status, 401);
  assert.equal((await call('/api/requests', 'POST', body(), req, { Origin: 'https://evil.example' })).res.status, 403);
  assert.equal((await call('/api/health', 'GET', undefined, null, { Host: 'evil.example' })).res.status, 403);
  assert.equal((await call('/api/requests', 'POST', { ...body(), cardNumber: 'test' }, req)).res.status, 400);
  const sensitive = JSON.stringify(app.store.events(r.id)); assert.ok(!sensitive.includes(c.requesterPassword)); assert.ok(!sensitive.includes('/fixture'));
  await call('/api/logout', 'POST', {}, req); assert.equal((await call('/api/requests', 'GET', undefined, req)).res.status, 401);
});
test('sesión expira, se rota al login y límite de intentos bloquea', t => {
  const store = new Store(); t.after(() => store.close()); let now = Date.now(); const auth = new Auth(store, config, () => now);
  const first = auth.login('solicitante', config.requesterPassword, 'local');
  const second = auth.login('solicitante', config.requesterPassword, 'local', first.token);
  assert.throws(() => auth.session(first.token), { code: 'SESSION' }); assert.equal(auth.session(second.token).user.id, 'solicitante');
  now += 7200000; assert.throws(() => auth.session(second.token), { code: 'SESSION' });
  for (let i = 0; i < 10; i++) assert.throws(() => auth.login('solicitante', 'wrong', 'limit-ip'));
  assert.throws(() => auth.login('solicitante', config.requesterPassword, 'limit-ip'), { code: 'LOGIN_LIMIT' });
});
test('config sandbox incompleta no cae a fixture; producción y origen mixto rechazados', () => {
  const env = { APP_MODE: 'sandbox', APP_ORIGIN: 'https://localhost:3443', DEMO_REQUESTER_PASSWORD: config.requesterPassword, DEMO_APPROVER_PASSWORD: config.approverPassword };
  assert.throws(() => configFrom(env), { code: 'CONFIG' });
  assert.throws(() => configFrom({ ...env, REAP_API_KEY: 'test', REAP_VERSION: '2026-01-01', REAP_BASE_URL: 'https://api.reap.global' }), { code: 'CONFIG' });
  assert.throws(() => configFrom({ ...env, APP_ORIGIN: 'http://localhost:3000' }), { code: 'CONFIG' });
});
