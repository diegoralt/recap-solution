# Verificación de P2 · cierre UI (Claude)

Fecha: 2026-10-09 22:47 CDMX (2026-10-10T04:47Z). Alcance: los 5 P2 de `revision-cierre-ui-claude.md` y ajustes relacionados. El veredicto APTO de esa revisión se mantiene.
Modelo efectivo: Opus 5.5 (`claude-opus-5-5`). Esfuerzo efectivo: NO VERIFICADO.

## Veredicto

**APTO.** Los 5 P2 están corregidos. No hay regresiones, P0 ni P1. Quedan tres detalles residuales que no bloquean.

## Hashes

`entrada-cierre-ui-final.json`: SHA-256 `7166c1574eb303a0119aaf0a7c8db3720ae7e94f5f98bcb8aab86efcae37a697`. Coincide.
Los 6 archivos del manifiesto coinciden. Comparado con `entrada-cierre-ui.json`, solo cambió `public/app.js`:
- antes: `6f9e7e00…207d`
- ahora: `7f591b06735b15461167161374e0f3faff11c9f8c50015804b27c0cb7ebd038c`

`index.html`, `styles.css`, `src/agent.mjs`, `ajuste-contrato-reap.md` y `plan.md` no cambiaron.

## P2 anteriores

| # | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| 1 | Texto del diálogo | Corregido | `public/app.js:74`: «Producto, variante, cantidad y características enviados; no confirmados por Reap.» Coincide con `ajuste-contrato-reap.md:15`. |
| 2 | Fixture mencionaba Reap | Corregido | Quote: «Calculando la cotización local…» fuera de sandbox (`public/app.js:69`). Autorización: «El siguiente paso es una simulación local de pago.» (`public/app.js:66`). Las menciones a Reap que quedan en fixture son aclaraciones negativas, como «No se llamó a Reap» (`public/app.js:89`) y «no proviene de Reap» (`public/app.js:93`). |
| 3 | Vencimiento | Corregido | «Cotización vencida a las…» (`public/app.js:62`). La autorización vencida cambia a «La autorización anterior venció…» (`public/app.js:66`). `quoteTimer` vuelve a renderizar al vencer (`public/app.js:96`), se limpia en cada render (`public/app.js:42`) y no depende de `poll`: solo se arma sin intento, y `poll` solo con intento (`public/app.js:97`). Tras un logout o un 401, el timer pendiente termina en `return` porque `r` no existe (`public/app.js:43`), así que no accede a `session` nulo. |
| 4 | Edición con versión vieja | Corregido | `api` adjunta `code` y `status` al error (`public/app.js:14`). Ante `STALE`, el mensaje pide cancelar y reabrir y dice «Tus cambios no se guardaron» (`public/app.js:156`). La edición sigue abierta con el borrador en el formulario: no se descarta en silencio. |
| 5 | Entrega incompleta | Corregido | La entrega muestra calle, `addressLine2`, ciudad, región, CP, país y teléfono, sin vacíos (`public/app.js:53`). |

## Ajustes relacionados

- **«Actualizar bandeja»** vuelve a consultar el enrollment, solo para el responsable en sandbox (`public/app.js:148`). Usa `GET /api/enrollment` y no crea registro. Si falla, el error aparece en el aviso después de recargar la bandeja.
- **`money`** ahora usa `currencyDisplay: 'narrowSymbol'` (`public/app.js:3`). Comprobado con Node 24:
  - USD: «$35.00 USD» (antes «USD 35.00 USD»).
  - MXN: «$800.00 MXN», sin cambio.

  El código de moneda sigue al final, así que «$» no se vuelve ambiguo.

## Residuales (no bloquean, no son regresiones)

1. El diálogo de autorización todavía muestra solo el país de entrega (`public/app.js:74`). El detalle ya muestra la dirección completa.
2. La sección plegada «Qué confirma esta cotización» dice «Producto, variante y cantidad» y no menciona características (`public/app.js:56`). La cubre «Reap no confirma el contenido del carrito».
3. El re-render al vencer cierra los `<details>` que estuvieran abiertos (`public/app.js:96`). Es solo cosmético.

## Verificación

`npm run verify`, sin pipes ni env-file: sintaxis correcta y `tests 41 · pass 41 · fail 0`. No usé API real, `.env.local`, `data/` ni `.local/`.

## NO VERIFICADO

- **QA en navegador con fixture.** Lo reporta el coordinador; no lo repetí porque levantar el servidor requiere env y data. Esto es lo que las pruebas del backend sí cubren:

  | Afirmación del coordinador | Prueba |
  |---|---|
  | El solicitante no autoriza | `test/policy.test.mjs:26` (E1) |
  | El responsable no edita | `test/provider-contract.test.mjs:66` |
  | Un cambio elimina la aprobación y el quote | `test/policy.test.mjs:38` (E3) y `src/agent.mjs:72` |
  | Exceso de presupuesto se bloquea sin checkout | `test/policy.test.mjs:14` (C2) |

  El comportamiento visual del timer, del mensaje STALE y del formato de moneda en el navegador real sigue NO VERIFICADO.
- La tarjeta ACTIVE y el checkout en sandbox dependen de Diego en Reap.
- Esfuerzo efectivo del modelo.
