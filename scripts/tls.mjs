import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('.local', { recursive: true, mode: 0o700 });
chmodSync('.local', 0o700);
if (existsSync('.local/key.pem')) chmodSync('.local/key.pem', 0o600);
if (existsSync('.local/key.pem') || existsSync('.local/cert.pem')) {
  console.log('Certificados existentes conservados.');
} else {
  const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '7',
    '-keyout', '.local/key.pem', '-out', '.local/cert.pem', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1'], { stdio: 'ignore' });
  if (result.status) { console.error('No se pudo generar TLS local.'); process.exit(1); }
  chmodSync('.local/key.pem', 0o600); console.log('TLS local preparado. No se instaló confianza global.');
}
