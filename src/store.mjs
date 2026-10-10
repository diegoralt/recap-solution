import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { ensure } from './errors.mjs';

export class Store {
  constructor(path = ':memory:') {
    if (path !== ':memory:') { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); chmodSync(dirname(path), 0o700); }
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, role TEXT NOT NULL, password TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, mode TEXT NOT NULL, requester TEXT NOT NULL, approver TEXT NOT NULL, revision INTEGER NOT NULL, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts (request_id TEXT PRIMARY KEY REFERENCES requests(id), id TEXT UNIQUE NOT NULL, idem_key TEXT UNIQUE NOT NULL, mode TEXT NOT NULL, payload TEXT NOT NULL, created INTEGER NOT NULL, document TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, request_id TEXT REFERENCES requests(id), time INTEGER NOT NULL, actor TEXT NOT NULL, type TEXT NOT NULL, details TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS provider_data (kind TEXT NOT NULL, id TEXT NOT NULL, document TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, document TEXT NOT NULL);`);
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); ensure(!(result instanceof Promise), 'TRANSACTION', 'Transacción inválida.', 500); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  createRequest(r) {
    this.db.prepare('INSERT INTO requests VALUES (?,?,?,?,?,?)').run(r.id, r.mode, r.requesterId, r.approverId, 1, JSON.stringify(r));
    return this.request(r.id);
  }
  request(id) {
    const row = this.db.prepare('SELECT document, revision FROM requests WHERE id=?').get(id);
    ensure(row, 'NOT_FOUND', 'Solicitud no encontrada.', 404);
    return { ...JSON.parse(row.document), _revision: row.revision };
  }
  list(user) {
    return this.db.prepare(`SELECT document, revision FROM requests WHERE ${user.role === 'approver' ? 'approver' : 'requester'}=? ORDER BY rowid DESC`).all(user.id)
      .map(row => ({ ...JSON.parse(row.document), _revision: row.revision }));
  }
  save(r) {
    const { _revision, ...document } = r;
    const result = this.db.prepare('UPDATE requests SET document=?, revision=revision+1 WHERE id=? AND revision=?').run(JSON.stringify(document), r.id, _revision);
    ensure(result.changes === 1, 'STALE', 'La solicitud cambió. Actualiza la pantalla.', 409);
    return this.request(r.id);
  }
  attempt(requestId) {
    const row = this.db.prepare('SELECT document FROM attempts WHERE request_id=?').get(requestId);
    return row ? JSON.parse(row.document) : null;
  }
  createAttempt(a) {
    this.db.prepare('INSERT INTO attempts VALUES (?,?,?,?,?,?,?)').run(a.requestId, a.id, a.key, a.mode, a.payload, a.createdAt, JSON.stringify(a));
    return a;
  }
  saveAttempt(a) {
    const row = this.db.prepare('SELECT id,idem_key,payload,mode,created FROM attempts WHERE request_id=?').get(a.requestId);
    ensure(row && row.id === a.id && row.idem_key === a.key && row.payload === a.payload && row.mode === a.mode && row.created === a.createdAt,
      'ATTEMPT_IMMUTABLE', 'No se puede modificar la identidad de un intento.', 409);
    this.db.prepare('UPDATE attempts SET document=? WHERE request_id=?').run(JSON.stringify(a), a.requestId);
  }
  event(r, actor, type, details = {}) {
    // Only explicit summaries; never provider payloads, card data, credentials or hosted URLs.
    this.db.prepare('INSERT INTO events(request_id,time,actor,type,details) VALUES (?,?,?,?,?)').run(r.id, Date.now(), actor, type, JSON.stringify(details));
  }
  events(requestId) {
    return this.db.prepare('SELECT time,actor,type,details FROM events WHERE request_id=? ORDER BY id').all(requestId)
      .map(row => ({ ...row, details: JSON.parse(row.details) }));
  }
  providerGet(kind, id) { const row = this.db.prepare('SELECT document FROM provider_data WHERE kind=? AND id=?').get(kind, id); return row ? JSON.parse(row.document) : null; }
  providerPut(kind, id, data) {
    this.db.prepare('INSERT INTO provider_data VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET document=excluded.document').run(kind, id, JSON.stringify(data));
  }
  setting(id, value) {
    if (value !== undefined) this.db.prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(id, JSON.stringify(value));
    const row = this.db.prepare('SELECT document FROM settings WHERE id=?').get(id);
    return row ? JSON.parse(row.document) : null;
  }
  close() { this.db.close(); }
}
