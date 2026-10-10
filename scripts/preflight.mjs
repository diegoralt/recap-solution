import { configFrom } from '../src/config.mjs';
import { ReapProvider } from '../src/providers/reap.mjs';
try {
  const config = configFrom();
  if (config.mode !== 'sandbox') { console.log('Fixture configurado. Cambia APP_MODE y APP_ORIGIN para probar sandbox.'); }
  else if (!config.enrollmentId) { console.log('Sandbox configurado. El responsable debe registrar la tarjeta en la app mediante Reap. No se creó ninguna compra.'); }
  else {
    const raw = await new ReapProvider(config).readEnrollment(config.enrollmentId);
    console.log(raw.status === 'ACTIVE' ? 'Enrollment ACTIVE comprobado. No se creó ninguna compra.' : 'Enrollment todavía no activo.');
  }
} catch (e) { console.error(e.status ? e.message : 'Preflight falló. Revisa configuración.'); process.exitCode = 1; }
