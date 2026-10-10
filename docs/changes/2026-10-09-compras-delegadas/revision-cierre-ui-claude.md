# Verificación acotada · cierre UI (Claude)

Fecha: 2026-10-09 22:42 CDMX (2026-10-10T04:42Z). Roles invertidos autorizados en AGENTS.md: Codex implementa, Claude verifica.
Modelo solicitado: Opus 5.5 high. Modelo efectivo: Opus 5.5 (`claude-opus-5-5`, según el entorno). Esfuerzo efectivo: NO VERIFICADO (sin evidencia en la sesión).

## Veredicto

**APTO para el cierre de UI.** No hay P0 ni P1. Hay cinco P2 de texto o UX que no bloquean. No se encontraron regresiones de permisos, de reglas de pago ni de secretos.

## Entradas y hashes

`entrada-cierre-ui.json`: SHA-256 `2472e9a0679ff08d80a8458602bd31094e3de8277ad728457dbdd3c0cc4ae71a`. Coincide.

| Archivo | SHA-256 real | ¿Coincide? |
|---|---|---|
| public/index.html | 11eef412cbdca30768b1f0d65448d22373cd45a314b4c6074a76409df0a32be6 | sí |
| public/app.js | 6f9e7e0071619019257a956409cf1695db0c4a5d3ee1d63877e651d992ec207d | sí |
| public/styles.css | bbba35db4feebb686c3310b78aa15e8003a0e21c9069c16b665600458df58591 | sí |
| src/agent.mjs | a2f1bb0bba27595f66256376138e5092464c2cfc617e4810fcb79606ba52e510 | sí |
| ajuste-contrato-reap.md | dc0484d381a36c5c9aa7d63ef880170c67be4d76477aaa6e6b8fedf98d485e1d | sí |
| plan.md | a460ae0e3a96a434fe73212ddbaeb6115be749a507ba77c4f3a96ab6b6bcf7f0 | sí |

Contraste con `entrada-latencia.json`: solo cambiaron los seis archivos declarados y además `docs/resultados.md`, que no está en este manifiesto. Por eso queda fuera del alcance y NO VERIFICADO. `src/server.mjs`, `src/policy.mjs`, `src/store.mjs`, `src/auth.mjs`, los providers y los tests tienen el mismo hash que en la revisión de latencia. Por lo tanto, el PATCH, las reglas y la autenticación del backend no cambiaron. El repositorio no tiene historial git ni copia del snapshot anterior. El contraste se hizo por hash, más la lectura completa del estado actual de los archivos del delta. No hubo diff de texto línea por línea.

## Verificación ejecutada

Se ejecutó `npm run verify` sin `--env-file` (`scripts/verify.mjs` no carga `.env.local`): sintaxis correcta y `tests 41 · pass 41 · fail 0`. No se usó red real, API, `.env.local`, `data/` ni `.local/`. No hubo QA de navegador; según el prompt, queda a cargo del coordinador.

## Lo comprobado sin hallazgos

- **Permisos de edición.** «Modificar solicitud» solo aparece para el solicitante y sin intento (`public/app.js:70-71`). El servidor sigue impidiendo que el responsable cambie cantidad, dirección o moneda (`src/agent.mjs:61-62`) y bloquea la edición si ya hay intento (`src/agent.mjs:59`). El cambio exige `version` (`src/agent.mjs:60`) e invalida quote, approval y estado (`src/agent.mjs:72`). Una prueba existente cubre el rechazo al responsable (`test/provider-contract.test.mjs:68`).
- **Edición limitada.** El PATCH de la UI envía solo `version`, `quantity` y `address` (`public/app.js:153`). Producto, límite, moneda, descripción y características se deshabilitan (`public/app.js:120`) y se reactivan al cancelar o al terminar (`public/app.js:114`). `addressLine2` se conserva (`public/app.js:117`, `public/app.js:152`). Tras guardar, el mensaje pide una cotización nueva (`public/app.js:154`).
- **`run` con submitter nulo.** `if (b)` protege el disabled y el finally (`public/app.js:18`).
- **Cotización vencida.** Oculta Autorizar y Preparar pago (`public/app.js:73`, `public/app.js:77`), muestra el aviso de recotizar (`public/app.js:64`) y regresa el paso a Cotización (`public/app.js:49`). El servidor sigue validando la vigencia al aprobar y al hacer checkout (`src/agent.mjs:104`, `src/agent.mjs:151-153`).
- **Preset de país.** Coincide con el CSV: coffee y mouse solo MX, feeder incluye MX y table solo CA y US. Al cambiar de candidato se ajustan el país y la dirección ficticia (`public/app.js:105-109`). La política sigue bloqueando un destino no compatible (`src/policy.mjs:34`).
- **Errores de quote en `src/agent.mjs`.** Solo cambia `blockedReason.message` para `QUOTE_UNFULFILLABLE` y `NETWORK_UNKNOWN` (`src/agent.mjs:93-94`). Se conservan el código, el estado BLOCKED y el evento. No expone datos del proveedor ni secretos.
- **Sandbox.** Hay un solo indicador en el encabezado (`public/index.html:12`, `public/app.js:133`), con la variante «Prueba local» y estilo de aviso en fixture. Los detalles del entorno indican «sin cobros ni entregas reales» (`public/index.html:66`). En sandbox, «Pago confirmado» depende de `completeConform`, y una ausencia de aprobación alojada cuenta como anomalía (`src/agent.mjs:35`, `src/agent.mjs:216`, `public/app.js:5`). Cumple el ajuste: no afirma compra ni entrega conforme.
- **Límites de Reap.** Se conserva la sección «Qué confirma esta cotización» en el detalle (`public/app.js:56`) y la advertencia en el diálogo de autorización (`public/app.js:74`). No hay `innerHTML`: todo usa `textContent`. Los enlaces externos usan `noopener noreferrer` (`public/app.js:19`).

## P0/P1

Ninguno.

## P2 (no bloquean)

1. **El diálogo de autorización usa un texto más corto que el del ajuste.** Dice «Producto y cantidad enviados, no confirmados por Reap» (`public/app.js:74`). El contrato pide «Producto, variante, cantidad y características enviados; no confirmados por Reap» (`ajuste-contrato-reap.md:15`). La aclaración del detalle está plegada dentro de `<details>` (`public/app.js:56`), y «Características» aparece sin ese matiz en los términos (`public/app.js:52`). No engaña, porque declara que no hay confirmación, pero no es el texto literal acordado. Arreglo: copiar la frase del ajuste en el diálogo.
2. **Textos que mencionan Reap en modo fixture.** «Consultando el total y el envío con Reap…» (`public/app.js:69`) y «El pago se confirma por separado en Reap» (`public/app.js:66`) también aparecen en fixture. Lo compensan el badge «Prueba local», la nota «Simulación local» (`public/app.js:93`) y los botones de prueba. Conviene condicionarlos a `r.mode`, porque el QA del coordinador se hará con fixtures.
3. **Mensajes contradictorios con la cotización vencida.** Se sigue mostrando «Cotización vigente hasta HH:MM» (`public/app.js:62`) junto a «La cotización venció» (`public/app.js:64`). Si había aprobación, también se mantiene «Solicitud autorizada…» (`public/app.js:66`) aunque ya no se puede pagar. Además, el vencimiento se calcula solo al renderizar (`public/app.js:44`): si vence con la pantalla abierta, los botones siguen visibles hasta recargar. El servidor rechaza la acción con un mensaje claro, así que no hay riesgo.
4. **La edición puede quedar con una versión vieja.** `editing.version` se captura al abrir el formulario (`public/app.js:117`). Si en el intermedio alguien recotiza, guardar responde 409 «La solicitud cambió. Actualiza.» y «Actualizar bandeja» no refresca la versión: hay que cancelar y volver a abrir la edición. No hay riesgo para los datos.
5. **El responsable no ve toda la entrega.** El detalle muestra nombre, calle, ciudad, CP y país (`public/app.js:53`), pero no región, teléfono ni `addressLine2`, que el solicitante ahora puede editar y que entran en `termsHash` (`src/policy.mjs:28`). El diálogo solo muestra el país (`public/app.js:74`). Por eso el responsable autoriza términos que no ve completos. Arreglo: incluir esos campos en «Entrega».

Notas (no son hallazgos): la congelación de límite y moneda existe solo en la UI. El PATCH del solicitante sigue aceptando que baje el límite o cambie la moneda (`src/agent.mjs:61-71`). Esto es igual que antes y es seguro: subir el límite exige al responsable, y una moneda distinta termina en BLOCKED.

## NO VERIFICADO

- QA en navegador: layout, móvil, foco y flujo real de edición. No hay pruebas de UI.
- No hay prueba automática de que el solicitante haga PATCH de `address` conservando `addressLine2`. Solo se verificó leyendo el código.
- Que Reap devuelva exactamente el código `QUOTE_UNFULFILLABLE`: no está en las pruebas ni en los documentos revisados.
- Que el enrollment y el pago en el sandbox de Reap no cobren ni entreguen nada, como afirman los detalles del entorno. Depende de Reap y no se probó.
- `docs/resultados.md` cambió y no está en el manifiesto.
- Comportamiento real contra el sandbox. Las pruebas locales no lo verifican.
- Esfuerzo efectivo del modelo.
