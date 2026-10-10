# Verificación de correcciones · Claude

- Fecha: 2026-10-09. Rol: revisor/verificador (roles invertidos, `AGENTS.md`). Única escritura: este archivo.
- Entrada: `entrada-correcciones.json` SHA-256 `66e15587781ed5dd45788e49efac4024674d1aa0b435f9c012e2d050423ca8a7`: **coincide**.
- Archivos del manifiesto: 28/28 con SHA-256 **coincidente**. Sin discrepancias. `plan_hash` sin cambio (`c49a1b94…`).
- Sin commits ni HEAD: verificación local por hashes, no revisión pre-push.
- Modelo efectivo: `claude-opus-5-5`. Esfuerzo: `high` solicitado al lanzar; efectivo NO VERIFICADO (la sesión no lo expone).
- Pruebas: `env -i PATH HOME npm run verify` (sin `--env-file`, claves ficticias de test) → sintaxis OK, `tests 37 · pass 37 · fail 0`.
- Sonda local en scratchpad con fetch simulado según el esquema oficial: sin red real hacia la API, sin editar el repo.
- Fuentes oficiales públicas consultadas (solo documentación, ninguna llamada a la API):
  - `create-quote.md`, `get-quote.md`, `create-checkout.md`
  - `get-checkout.md`, `create-enrollment.md`
  - `api-reference/idempotency`
- No leídos: `.env.local`, `data/`, `.local/`.

## Veredicto

**P1-2 cerrado. P1-1 atendido como propuesta, coherente técnicamente, pero su cierre depende de que Diego apruebe `ajuste-contrato-reap.md`. Aparece un P1 nuevo (regresión parcial): GET checkout sin eco opcional.** El P1 nuevo no produce éxito falso ni duplicados, pero puede impedir el recorrido sandbox real. De los 10 P2 anteriores, 10 están corregidos; hay 2 P2 nuevos.

## Contraste con documentación oficial

- **Quote (create/get).** La respuesta 200 solo trae `id`, `shippingOptions`, `amountBreakdown` (`itemsSubtotal`, `discounts`, `additionalCharges`, `finalAmount` requeridos; `shipping`/`tax` opcionales) y `expiresAt`. No devuelve ítems, variante ni cantidad. **Confirma la premisa de `ajuste-contrato-reap.md`.**
- **`shippingAddress`.** `addressLine2`, `region` y `postalCode` son opcionales; `phone` va en formato internacional. Coincide con `src/providers/reap.mjs:63` (omite nulos) y `src/policy.mjs:22`.
- **Create checkout.** El body (`quoteId`, `enrollmentId`, `presentation{REDIRECT,returnUrl}`) coincide con `src/agent.mjs:161-162`. La respuesta 200 exige `quoteId`, `enrollmentId` (string o null) y `nextAction`. Estados `REQUIRES_ACTION/PROCESSING/COMPLETED/FAILED/EXPIRED`.
- **Get checkout.** `quoteId` y `enrollmentId` son **opcionales**. `orderId` y `nextAction` son requeridos y aceptan null. `finalAmount` es opcional. Esto es la base del P1-N1.
- **Idempotencia.**
  - El encabezado `Idempotent-Replayed: true` existe.
  - `400 IDEMPOTENT_PARAMETER_MISMATCH` y `409 IDEMPOTENCY_REQUEST_IN_PROGRESS` existen y coinciden con `src/agent.mjs:179-181`.
  - Se cachean todos los resultados, 5xx incluidos, salvo 401/422/429. La ventana es de 24 h.
- **Create enrollment.** El payload `source: EXTERNAL`, `owner{type: CLIENT_REFERENCE,id,email}`, `presentation` coincide con `src/agent.mjs:121-123`. Los estados son `REQUIRES_ACTION/ACTIVE/FAILED/EXPIRED/REVOKED`; ver P2-N1.
- **`Reap-Version`.** Enum `2025-02-14`. La documentación del repo lo indica; `src/config.mjs` solo valida el formato de fecha.

## Estado de los P1 anteriores

### P1-1 · Producto/cantidad no confirmados por Reap: atendido como propuesta, cierre pendiente de Diego

- El esquema oficial confirma que la quote no devuelve contenido de carrito, así que no existe una corrección técnica que lo verifique contra Reap.
- Qué se implementó:
  - `productEvidence: 'request-only'` en la quote (`src/providers/reap.mjs:35`), firmado en el hash (`src/policy.mjs:29`).
  - Bloqueo si una respuesta trae `lineItems` contradictorios (`src/providers/reap.mjs:27-31`; prueba `test/provider-contract.test.mjs:9-14`).
  - Aviso en la cotización y en el diálogo de autorización (`public/app.js:53,69`).
  - «Pago confirmado», «Finalizada con discrepancia» y «Compra fixture confirmada» (`public/app.js:5`), con el texto «no confirma producto, cantidad ni entrega» (`public/app.js:84`) y la métrica «PAGOS CONFORMES» (`public/index.html:37`).
  - `docs/resultados.md` deja C3/H1/E2 como fixture y declara el límite.
- Evaluación: es coherente y no exagera garantías. Reduce explícitamente el criterio «validar productos y cantidades» de `spec.md`/plan, así que **no lo doy por cerrado** hasta que Diego apruebe `ajuste-contrato-reap.md`. La revisión técnica no sustituye esa decisión. Si Diego lo rechaza, queda la alternativa escrita en el ajuste: checkout real deshabilitado.

### P1-2 · 2xx ilegible y respuesta no conforme: cerrado

- **2xx ilegible o abortado.** Ahora es `NETWORK_UNKNOWN`, recuperable (`src/providers/reap.mjs:54`). El replay usa la misma clave y el mismo body (`test/provider-contract.test.mjs:23-38`, comprueba `identities[0]` igual a `identities[1]`).
- **Respuesta no conforme.** Se conserva el ID válido antes de comprobar la correspondencia (`src/agent.mjs:187-188`). Un eco o una acción inválidos llevan a `RECONCILIATION_REQUIRED` + `schema_mismatch`, sin enlace público. El enlace provisional se guarda privado en `pendingApprovalUrl`, que no aparece en `view` (`src/agent.mjs:31-37,189-196`).
- **Conciliación.** Ocurre por GET, sin éxito falso (`test/provider-contract.test.mjs:39-56`).
- **Límites de recuperación.** Están acotados: 3 intentos y 23 h (`src/agent.mjs:236`).

## P0

Ninguno.

## P1 nuevo

### P1-N1 · El GET de checkout exige un eco que la documentación marca opcional: oculta el enlace alojado e impide confirmar

- Evidencia: `src/agent.mjs:197` exige `raw.quoteId === payload.quoteId && raw.enrollmentId === payload.enrollmentId` también cuando `consulted=true`, y si no se cumple aplica `reconcile()`, que anula `approvalUrl` (`:191`). Según `get-checkout.md` esos campos son opcionales. `ajuste-contrato-reap.md` se apoya solo en `create-checkout.md`.
- Escenario reproducido con la sonda (respuestas conformes al esquema oficial de GET, sin los campos opcionales):
  - El POST da `REQUIRES_ACTION` con enlace.
  - El primer GET de polling (`public/app.js`, cada 5 s) sin eco da `RECONCILIATION_REQUIRED`, `approvalUrl` desaparece y la anomalía es `schema_mismatch`.
  - Un GET `COMPLETED` con `orderId` y `finalAmount` correctos pero sin eco sigue en `RECONCILIATION_REQUIRED`, `completeConform false`, y así indefinidamente.
  - Solo con eco llega a `COMPLETED` conforme.
- Por qué es una regresión parcial: antes, el mismo caso lanzaba `PROVIDER_SCHEMA` y conservaba `REQUIRES_ACTION` con el enlace. Ahora el responsable pierde el botón «Aprobar pago en Reap» en cuanto corre el polling. No hay riesgo de éxito falso ni de duplicado. Bloquea el criterio 1 si Reap omite los campos opcionales, algo NO VERIFICADO en real.
- Arreglo:
  1. En GET (`consulted=true`), exigir `raw.id === next.providerId`, ID obtenido del POST propio con la clave persistida.
  2. Si `quoteId`/`enrollmentId` vienen, deben coincidir; si faltan, aceptar.
  3. Mantener la exigencia de eco en el POST, donde es requerida.
  4. Añadir una prueba con el GET documentado sin eco que llegue a `COMPLETED` conforme y conserve el enlace mientras está `REQUIRES_ACTION`.
  5. Corregir la frase correspondiente de `ajuste-contrato-reap.md`.

## P2 anteriores

| # | Estado | Evidencia |
|---|---|---|
| 1 Etiqueta COMPLETED con anomalía | Corregido | `public/app.js:5,37,46` |
| 2 `evidenceMode` prematuro | Corregido | `src/agent.mjs:165,213`; prueba `test/provider-contract.test.mjs:57-65` |
| 3 Recotización sin evento ni versión | Corregido | `src/agent.mjs:150-151` |
| 4 Enrollment 4xx atascado | Corregido | `src/agent.mjs:127-131`; prueba `:72-79` |
| 5 Permisos `data/` y `.local/` | Corregido | `src/store.mjs:8`, `scripts/tls.mjs:4-5` (el directorio 0700 cubre WAL/SHM) |
| 6 Recuperar no recuperable / 401 | Corregido | `public/app.js:13,82` |
| 7 `expiresAt` ISO UTC | Corregido | `src/providers/reap.mjs:32-35`, `src/policy.mjs:29`; prueba `:15-22` |
| 8 Responsable edita términos | Corregido | `src/agent.mjs:61-62`; prueba `:66-71` |
| 9 Clave en eventos visibles | Corregido | `src/agent.mjs:30` (sigue en BD, aceptable) |
| 10 Documentos de demo y resultados | Corregido | `docs/resultados.md`, `docs/demo.md` presentes |

## P2 nuevos

1. **Enrollment FAILED/EXPIRED rechazado como esquema inválido.** `src/agent.mjs:133` solo acepta `ACTIVE/REQUIRES_ACTION/REVOKED`. Si Reap devuelve `FAILED` o `EXPIRED`, cada consulta lanza `PROVIDER_SCHEMA`. Como el `id` queda guardado (`:116`), no se ofrece registro nuevo y hay que borrar la BD. Aceptar esos estados y permitir un registro nuevo tras un estado final.
2. **Encabezados de `ajuste-contrato-reap.md` y `docs/resultados.md`.** Atribuyen la exigencia de eco solo a create y no mencionan que en GET es opcional. Actualizarlos junto con P1-N1.

## NO VERIFICADO

- **Recorrido sandbox real**: credenciales, enrollment ACTIVE, aceptación de `returnUrl` localhost, aprobación alojada y GET `COMPLETED`.
- **Respuestas reales de Reap** frente al esquema:
  - Si el GET incluye el eco opcional.
  - Si `nextAction` queda en null fuera de `REQUIRES_ACTION`. Hoy, un `nextAction` no nulo en `PROCESSING` o `COMPLETED` lleva a conciliación (`src/agent.mjs:201`).
  - Si siempre hay una opción de envío `selected`.
  - Si `finalAmount` y `orderId` llegan en `COMPLETED`.
- **503 `CHECKOUT_TEMPORARILY_UNAVAILABLE` cacheado.** Deja el intento en `UNKNOWN` sin replay útil; sin evidencia de si crea checkout.
- **QA de navegador Orca** declarado en `docs/resultados.md`: no lo reproduje. Tampoco la prueba con dos perfiles reales.
- **Aprobación de Diego** de `ajuste-contrato-reap.md`.
- **Proceso**: esfuerzo efectivo `high`. Confinamiento técnico del revisor: la escritura única es una regla por instrucción.
