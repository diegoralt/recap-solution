# recap-solution

Lee `AGENTS.md`, `spec.md` y `ESTADO.md` al iniciar. Excepción local autorizada (rol invertido 2026-10-09): Claude implementa; Codex revisa/verifica. No commits, push ni merges.

## Revisión (cuando Claude actúe como revisor)

Escribe solo el archivo de revisión asignado. El prompt indica entradas, hashes y salida. No leas la revisión de Codex durante la fase a ciegas. Anota hash real, modelo/esfuerzo efectivos, veredicto, P0/P1, P2 y NO VERIFICADO, con evidencia `archivo:línea`. Si el hash difiere, repórtalo.

## Producto

Compras delegadas con presupuesto verificable mediante Reap, solo sandbox. Tres escenarios, mismo flujo. No PAN/CVV, secretos en logs ni scraping de checkout. No declarar éxito sin consultar el pago; no confundir fixtures con sandbox.

## Comandos

- Estado del repositorio: `git status --short`.
- Hash de entrada: `git hash-object <archivo>`.
- Verificación local (sintaxis y pruebas): `npm run verify`.
- Iniciar: `npm start`. TLS local: `npm run tls`. Preflight: `npm run preflight`.

verificación: `npm run verify`

Node 24 sin dependencias de runtime. `.env.local`, data y TLS ignorados: no leer/imprimir secretos en revisión. Pruebas locales no verifican sandbox. Adopción de hooks/allowlist y confinamiento del revisor: NO VERIFICADOS; reglas escritas no son sandbox técnico.

## Incidente observado en QA

Los envíos de formulario pueden llegar con `event.submitter === null` (por ejemplo, `requestSubmit()` sin botón). El envoltorio `run` debe tolerarlo y ejecutar la acción; no exigir un botón para iniciar sesión. Se corrigió en `public/app.js` y se comprobó el flujo de acceso en QA. Al cambiar ese envoltorio, comprobar también el envío sin submitter.
