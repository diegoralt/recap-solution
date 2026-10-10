import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { ensure } from './errors.mjs';
export const digest = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
function passwordHash(password) {
  const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 32).toString('hex');
}
function matches(password, hash) {
  const [salt, key] = hash.split(':');
  return timingSafeEqual(scryptSync(password, salt, 32), Buffer.from(key, 'hex'));
}
export class Auth {
  constructor(store, config, now = Date.now) {
    this.store = store; this.config = config; this.now = now; this.failures = new Map();
    for (const [id, role, password] of [['solicitante', 'requester', config.requesterPassword], ['responsable', 'approver', config.approverPassword]]) {
      const previous = store.db.prepare('SELECT * FROM users WHERE id=?').get(id);
      if (!previous || !matches(password, previous.password)) {
        store.db.prepare('INSERT INTO users VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET password=excluded.password').run(id, role, passwordHash(password));
        store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
      }
    }
    this.dummy = passwordHash(token());
  }
  login(username, password, ip, previousToken) {
    ensure(typeof username === 'string' && typeof password === 'string' && username.length <= 50 && password.length <= 200,
      'LOGIN', 'Usuario o contraseña incorrectos.', 401);
    const now = this.now(), key = ip + ':' + username;
    for (const k of [ip, key]) {
      const attempts = this.failures.get(k);
      ensure(!attempts || attempts.until <= now || attempts.count < 10, 'LOGIN_LIMIT', 'Demasiados intentos. Espera 10 minutos.', 429);
    }
    const user = this.store.db.prepare('SELECT * FROM users WHERE id=?').get(username);
    const valid = matches(password, user?.password || this.dummy);
    if (!user || !valid) {
      for (const k of [ip, key]) {
        const old = this.failures.get(k);
        this.failures.set(k, old && old.until > now ? { ...old, count: old.count + 1 } : { count: 1, until: now + 600_000 });
      }
      throw Object.assign(new Error('Usuario o contraseña incorrectos.'), { status: 401, code: 'LOGIN' });
    }
    if (previousToken) this.logout(previousToken);
    const sessionToken = token(), csrf = token();
    this.store.db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
    this.store.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(digest(sessionToken), user.id, csrf, now + 7_200_000);
    return { token: sessionToken, csrf, user: { id: user.id, role: user.role } };
  }
  session(sessionToken) {
    ensure(typeof sessionToken === 'string' && sessionToken.length <= 128, 'SESSION', 'Inicia sesión.', 401);
    const row = this.store.db.prepare('SELECT s.*,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(digest(sessionToken), this.now());
    ensure(row, 'SESSION', 'La sesión terminó. Inicia sesión.', 401);
    return { user: { id: row.user_id, role: row.role }, csrf: row.csrf };
  }
  logout(sessionToken) { if (typeof sessionToken === 'string') this.store.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(sessionToken)); }
}
