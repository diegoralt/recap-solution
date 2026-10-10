import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]); }
for (const file of ['src', 'scripts', 'public', 'test'].flatMap(files).filter(p => /\.(mjs|js)$/.test(p))) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' }); if (result.status) process.exit(result.status);
}
const tests = files('test').filter(p => p.endsWith('.test.mjs'));
if (!tests.length) { console.error('Faltan pruebas ejecutables.'); process.exit(1); }
const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
process.exit(result.status ?? 1);
