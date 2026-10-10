import { ensure } from './errors.mjs';
export const SANDBOX_HOSTS = new Set([
  'https://mx.sandbox.api.reap.global', 'https://sg.sandbox.api.reap.global', 'https://sandbox.api.reap.global'
]);
export function configFrom(env = process.env) {
  const mode = env.APP_MODE || 'fixture';
  ensure(['fixture', 'sandbox'].includes(mode), 'CONFIG', 'APP_MODE debe ser fixture o sandbox.');
  const origin = env.APP_ORIGIN || (mode === 'sandbox' ? 'https://localhost:3443' : 'http://localhost:3000');
  const url = new URL(origin);
  ensure(url.origin === origin && url.hostname === 'localhost' && !url.username && !url.password,
    'CONFIG', 'La aplicación se sirve exclusivamente en localhost.');
  ensure(mode !== 'sandbox' || origin === 'https://localhost:3443', 'CONFIG', 'Sandbox requiere https://localhost:3443.');
  ensure(mode !== 'fixture' || ['http:', 'https:'].includes(url.protocol), 'CONFIG', 'Origen no válido.');
  const requesterPassword = env.DEMO_REQUESTER_PASSWORD || '';
  const approverPassword = env.DEMO_APPROVER_PASSWORD || '';
  ensure(requesterPassword.length >= 16 && approverPassword.length >= 16 && requesterPassword !== approverPassword,
    'CONFIG', 'Configura dos contraseñas de demo distintas de al menos 16 caracteres en .env.local.');
  const baseUrl = env.REAP_BASE_URL || '';
  const apiKey = env.REAP_API_KEY || '';
  const apiVersion = env.REAP_VERSION || '';
  if (mode === 'sandbox') {
    ensure(SANDBOX_HOSTS.has(baseUrl), 'CONFIG', 'Host sandbox de Reap no permitido.');
    ensure(apiKey.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(apiVersion), 'CONFIG', 'Faltan API key o versión Reap en .env.local.');
  }
  const email = env.DEMO_EMAIL || 'demo@example.com';
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'CONFIG', 'Configura email de prueba válido.');
  return { mode, origin, port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    secure: url.protocol === 'https:', dbPath: `data/${mode}.sqlite`, requesterPassword, approverPassword,
    baseUrl, apiKey, apiVersion, email, enrollmentId: env.REAP_ENROLLMENT_ID || '', returnUrl: `${origin}/return` };
}
