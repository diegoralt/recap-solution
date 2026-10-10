# Verificación final acotada · Claude

- Fecha: 2026-10-09. Rol: verificador (roles invertidos, `AGENTS.md`). Única escritura: este archivo; informes anteriores intactos.
- Entrada: `entrada-correcciones-final.json` SHA-256 `a1d1b6dd76f78d52323815df88a5a6a724154f3e85409484548b98dcb71b53d2`: **coincide**.
- Archivos: 28/28 con SHA-256 **coincidente**, sin discrepancias. Respecto de `entrada-correcciones.json` cambiaron:
  - Código y pruebas: `public/app.js`, `src/agent.mjs`, `test/provider-contract.test.mjs`.
  - Documentos: `docs/resultados.md`, `docs/demo.md`, `ajuste-contrato-reap.md`.
- Modelo efectivo: `claude-opus-5-5`. Esfuerzo efectivo: NO VERIFICADO.
- Pruebas:
  - `env -i PATH HOME npm run verify`, sin `--env-file` → `tests 40 · pass 40 · fail 0`.
  - Sonda propia de la verificación anterior (fetch simulado con el esquema oficial de GET, sin red ni API).
- Alcance: P1-N1 y P2 nuevos. No leí `.env.local`, `data/` ni `.local/`. No revisé el enrollment real preparado fuera de esta revisión.

## Veredicto

**P1-N1 cerrado. P2-N1 y P2-N2 cerrados. Sin P0/P1 abiertos en el código revisado.** P1-1 sigue pendiente de la decisión de Diego sobre `ajuste-contrato-reap.md`. El checkout real no debe ejecutarse hasta esa aprobación, como se declara.

## P1-N1 · GET sin eco opcional: cerrado

- **Vinculación:** `src/agent.mjs:200-205`.
  - Con eco completo y coincidente, se vincula (`echoMatches`).
  - Sin eco, solo se acepta si el GET es posterior a un POST o GET ya vinculado (`consulted && next.bindingVerified`) y cada eco presente coincide.
  - El ID siempre debe ser idéntico al guardado.
  - `bindingVerified` se marca únicamente en el camino conforme (`:205`) y se persiste con el intento.
- **POST:** conserva el requisito de eco, porque `documentedGet` exige `consulted` (`:201`).
- **POST no vinculado + GET sin eco:** cae en `reconcile()` y no llega a éxito (`:204`). Prueba: `test/provider-contract.test.mjs:88-94`.
- **Enlace pendiente:** se conserva y el pago se completa con un GET sin eco tras un POST vinculado. Prueba: `test/provider-contract.test.mjs:80-87`.
- **Sonda repetida:** antes daba `RECONCILIATION_REQUIRED` y ocultaba el enlace. Ahora:
  - GET `REQUIRES_ACTION` sin eco → `REQUIRES_ACTION`, el enlace sigue presente.
  - GET `COMPLETED` sin eco → `COMPLETED`, `completeConform true`.
- **Ecos incorrectos:** siguen en conciliación sin enlace (`test/provider-contract.test.mjs:50-56`).

## P2-N1 · Enrollment en estado final: cerrado

- `src/agent.mjs:136` acepta `FAILED/EXPIRED/REVOKED`. El enlace solo se expone en `REQUIRES_ACTION` (`:137`).
- El POST del responsable tras un estado final guardado descarta el registro y crea uno con clave nueva, siempre que no haya `REAP_ENROLLMENT_ID` fijo (`src/agent.mjs:116-118`). El checkout sigue exigiendo `ACTIVE`.
- Prueba: `test/provider-contract.test.mjs:95-104`; comprueba que la clave final no se reutiliza.
- UI: `public/app.js:104,106`. Procedimiento con ID fijo: `docs/demo.md:67`.

## P2-N2 · Documentación del eco: cerrado

`ajuste-contrato-reap.md:9` y `docs/resultados.md:63` distinguen ya el POST (eco exigido) del GET (eco opcional tras vinculación).

## P2 menores (no bloquean)

1. **Mensaje engañoso con ID fijo.** Si `REAP_ENROLLMENT_ID` está fijado y su estado es final, la UI dice «puedes iniciar otro» y muestra el botón (`public/app.js:104,106`), pero el POST vuelve a leer el mismo ID (`src/agent.mjs:116-119`). Está documentado en `docs/demo.md:67`. Lo ideal es que el mensaje lo indique.
2. **Eco `enrollmentId: null` en GET.** No se trata como ausente (`src/agent.mjs:203` compara con `undefined`), así que lleva a conciliación. Falla cerrado. El esquema de create permite `null`; para GET es NO VERIFICADO.
3. **Nombre de prueba impreciso.** `test/provider-contract.test.mjs:88` dice «eco incorrecto tampoco», pero solo cubre el caso sin vincular. El eco incorrecto se cubre en `:50-56`.

## NO VERIFICADO

- **Decisión de Diego** sobre `ajuste-contrato-reap.md` (P1-1).
- **Recorrido sandbox real:** enrollment ACTIVE (el preparado en `REQUIRES_ACTION` no fue revisado), aceptación de `returnUrl` localhost, aprobación alojada, GET `COMPLETED` y forma real de las respuestas (eco, `nextAction` null, `finalAmount`/`orderId`).
- **Navegador**, dos perfiles y esfuerzo efectivo. Confinamiento del revisor: la escritura única es una regla por instrucción.
