import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { configFrom } from './config.mjs';
import { Store } from './store.mjs';
import { Auth } from './auth.mjs';
import { PurchaseFlow } from './agent.mjs';
import { FixtureProvider } from './providers/fixture.mjs';
import { ReapProvider } from './providers/reap.mjs';
import { candidates } from './merchants.mjs';
import { ensure } from './errors.mjs';

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(x => x.trim().split('=')).filter(x => x.length === 2));
}
async function readBody(req) {
  ensure(req.headers['content-type']?.split(';')[0] === 'application/json', 'CONTENT_TYPE', 'Usa JSON.', 415);
  let length = 0; const chunks = [];
  for await (const chunk of req) { length += chunk.length; ensure(length <= 32768, 'BODY_SIZE', 'Solicitud demasiado grande.', 413); chunks.push(chunk); }
  try { const body = JSON.parse(Buffer.concat(chunks).toString()); ensure(body && typeof body === 'object' && !Array.isArray(body), 'BODY', 'JSON inválido.'); return body; }
  catch { throw Object.assign(new Error('JSON inválido.'), { status: 400, code: 'BODY' }); }
}
function allowed(body, fields) { ensure(Object.keys(body).every(x => fields.includes(x)), 'FIELDS', 'Campos no admitidos. No introduzcas datos de tarjeta en la app.'); }

export function createApp(config, options = {}) {
  const store = options.store || new Store(config.dbPath);
  const auth = new Auth(store, config, options.now);
  const provider = options.provider || (config.mode === 'fixture' ? new FixtureProvider(store, config) : new ReapProvider(config));
  const flow = new PurchaseFlow(store, provider, config, options.now);
  const origin = new URL(config.origin);
  const staticFiles = new Map([['/', ['index.html', 'text/html']], ['/return', ['index.html', 'text/html']],
    ['/fixture', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/styles.css', ['styles.css', 'text/css']]]);
  const cookie = (value, remove = false) => `session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remove ? 0 : 7200}${config.secure ? '; Secure' : ''}`;
  async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
    const json = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      ensure(req.headers.host === origin.host, 'HOST', 'Host no permitido.', 403);
      ensure(!req.headers.origin || req.headers.origin === config.origin, 'ORIGIN', 'Origen no permitido.', 403);
      const url = new URL(req.url, config.origin);
      if (req.method === 'GET' && staticFiles.has(url.pathname)) {
        const [file, mime] = staticFiles.get(url.pathname);
        res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
        res.end(readFileSync(new URL('../public/' + file, import.meta.url))); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/health') return json({ mode: config.mode, status: 'ready', integrationVerified: false });
      const sessionToken = cookies(req).session;
      if (req.method === 'GET' && url.pathname === '/api/session') {
        let session = null; try { session = auth.session(sessionToken); } catch { /* anonymous */ }
        return json({ ...(session || { user: null, csrf: null }), mode: config.mode, origin: config.origin });
      }
      const mutation = ['POST', 'PATCH', 'DELETE'].includes(req.method);
      if (mutation) ensure(req.headers.origin === config.origin, 'ORIGIN', 'Origen no permitido.', 403);
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const body = await readBody(req); allowed(body, ['username', 'password']);
        const result = auth.login(body.username, body.password, req.socket.remoteAddress, sessionToken);
        res.setHeader('Set-Cookie', cookie(result.token)); return json({ user: result.user, csrf: result.csrf, mode: config.mode });
      }
      const session = auth.session(sessionToken);
      if (mutation) ensure(req.headers['x-csrf-token'] === session.csrf, 'CSRF', 'Actualiza la sesión antes de continuar.', 403);
      const user = session.user;
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        auth.logout(sessionToken); res.setHeader('Set-Cookie', cookie('', true)); return json({ ok: true });
      }
      if (req.method === 'GET' && url.pathname === '/api/candidates') {
        return json(candidates.map(({ permalink, ...candidate }) => candidate));
      }
      if (url.pathname === '/api/enrollment') {
        ensure(['GET', 'POST'].includes(req.method), 'METHOD', 'Método no permitido.', 405);
        if (req.method === 'POST') allowed(await readBody(req), []);
        return json(await flow.enrollment(user, req.method === 'POST'));
      }
      if (req.method === 'GET' && url.pathname === '/api/requests') return json(store.list(user).map(r => flow.view(r, user)));
      if (req.method === 'POST' && url.pathname === '/api/requests') {
        const body = await readBody(req); allowed(body, ['candidateKey', 'quantity', 'budget', 'currency', 'address', 'requiredAttributes', 'description']);
        if (body.address) allowed(body.address, ['firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'country']);
        return json(flow.create(body, user), 201);
      }
      const match = url.pathname.match(/^\/api\/requests\/([a-f0-9-]{36})(?:\/(quote|approve|checkout|refresh|recover|fixture-approve))?$/);
      if (match) {
        const [, id, action] = match;
        if (req.method === 'GET' && !action) return json(flow.view(flow.owned(id, user), user));
        if (req.method === 'PATCH' && !action) {
          const body = await readBody(req); allowed(body, ['version', 'budget', 'quantity', 'address', 'currency']);
          return json(flow.update(id, body, user));
        }
        if (req.method === 'POST' && action) {
          const body = await readBody(req); allowed(body, action === 'approve' ? ['termsHash'] : []);
          if (action === 'approve') return json(flow.approve(id, body.termsHash, user));
          if (action === 'quote') return json(await flow.quote(id, user));
          if (action === 'checkout') return json(await flow.checkout(id, user));
          if (action === 'fixture-approve') return json(await flow.fixtureApprove(id, user));
          return json(await flow.refresh(id, user, action === 'recover'));
        }
      }
      json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }, 404);
    } catch (e) {
      json({ error: { code: typeof e.code === 'string' && /^[A-Z_0-9]+$/.test(e.code) ? e.code : 'INTERNAL',
        message: e.status ? e.message : 'No se pudo completar la operación.' } }, e.status || 500);
    }
  }
  const server = config.secure ? https.createServer({ key: readFileSync('.local/key.pem'), cert: readFileSync('.local/cert.pem') }, handler) : http.createServer(handler);
  server.requestTimeout = 30_000; server.headersTimeout = 15_000;
  return { server, store, flow, auth, provider };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = configFrom(); const app = createApp(config);
    app.server.listen(config.port, 'localhost', () => console.log(`Recap · ${config.mode} · ${config.origin}`));
    app.server.on('error', () => { console.error('No se pudo abrir el servidor local. Revisa puerto y TLS.'); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.server.close(() => { app.store.close(); process.exit(0); }));
  } catch (e) { console.error(e.status ? e.message : 'No se pudo iniciar. Revisa .env.local y certificados TLS.'); process.exitCode = 1; }
}
