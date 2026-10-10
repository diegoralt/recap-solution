# Revisión de implementación · Claude

- Fecha: 2026-10-09. Rol: revisor (roles invertidos por Diego, `AGENTS.md`). Solo lectura salvo este archivo.
- Entrada: `entrada-implementacion.json` SHA-256 `89a91437785f0334cdfd6fa0641e0c2a6d03d0e70d2dc30977d133c4b00f1ffa`: **coincide**.
- Archivos del manifiesto: 24/24 con SHA-256 **coincidente**. Sin discrepancias.
- `plan_hash` `c49a1b94370f5e6fc11384f546b43189a8b88558` = `git hash-object plan-candidato.md` (coincide). `plan.md` (envoltorio de aprobación) tiene `42d673a4ab2ed5bdbcec17e4234e850fab4c7a9e` y no está en el manifiesto; su cuerpo reproduce el candidato.
- CSV: `git hash-object --no-filters` = `228b336ae014e3b95c474d8f093ce77175867ed0`, igual a la constante de `src/merchants.mjs:19`; con filtros = `c8b026381af72ad4119e0770a165dc00fe3b9ecb` (spec). Coherente.
- Sin HEAD (repo sin commits): revisión local de código sensible, no revisión de diff pre-push.
- Modelo efectivo: `claude-opus-5-5`. Esfuerzo efectivo: NO VERIFICADO (la sesión no expone el nivel y no lo fijé; la tabla global pide `high` para auth/dinero). Anotarlo como posible desviación.
- Verificación: `env -i PATH HOME npm run verify` → sintaxis OK, `tests 29 · pass 29 · fail 0` (Node v24.19.0). Además, sonda local en scratchpad (fetch simulado, sin red ni edición del repo) para confirmar P1-1 y P1-2.
- No leídos: `.env.local`, `data/`, `.local/` (solo permisos de directorio), revisiones de Codex.

## Veredicto

**Aprobable con condiciones: 0 P0, 2 P1.** Auth, CSRF/Origin/Host, roles, hash de términos, carreras edición/aprobación/checkout, idempotencia persistente y no éxito sin GET están bien resueltos y probados. Antes del recorrido sandbox real hay que corregir dos puntos: los controles de producto/cantidad no se verifican contra Reap, y una respuesta 2xx ilegible o no conforme pierde la referencia del checkout y bloquea el replay seguro.

## P0

Ninguno.

## P1

### P1-1 · En sandbox, producto, variante y cantidad de la quote no vienen de Reap: la validación es tautológica

- Evidencia: `src/providers/reap.mjs:25-26` construye la quote normalizada con `merchant: candidate.domain, productId: candidate.product, variantId: candidate.variant, quantity: request.quantity`, sin leer datos del `raw`. Así `src/policy.mjs:42-44` compara la solicitud consigo misma. `termsHash` (`src/policy.mjs:26-28`) firma entonces valores locales como si fueran términos del proveedor. C3/H1/E2 solo se prueban con fixture (`test/policy.test.mjs:20-25,47-51,33-37`).
- Escenario: el carrito del merchant (`checkoutUrl`, `src/merchants.mjs:39-43`) cotiza 1 unidad por stock, o la variante del permalink se resuelve a otra. La sonda con quote simulada que trae `lineItems: [{ variantId: 'OTHER', quantity: 1 }]` terminó en `APPROVED`, con cantidad local 2 y variante `47607777984690`. El presupuesto sigue protegido porque el total sí viene de Reap. Pero la aprobación declara «2 × variante X» sin evidencia, contra el criterio 2 y contra «validar productos y cantidades» de `spec.md`. En `docs/resultados.md`, C3/H1 podrían aparecer como verificados en sandbox sin haberse comprobado.
- Arreglo: en `normalizeQuote`, extraer merchant/variante/cantidad de los ítems de la quote de Reap y fallar cerrado (`PROVIDER_SCHEMA` → `BLOCKED`) si faltan. Añadir una prueba con mock HTTP cuya quote traiga otra cantidad o variante. Si el contrato de Reap no expone ítems, documentarlo, mostrar en UI «producto/cantidad enviados, no confirmados por Reap» y no contar C3/H1/E2 como evidencia sandbox.

### P1-2 · Una respuesta 2xx ilegible o no conforme de checkout pierde el ID del proveedor y bloquea el replay previsto

- Evidencia:
  - `src/providers/reap.mjs:44-45`: si `response.json()` falla con status 2xx (cuerpo cortado por `AbortSignal.timeout`, JSON inválido), lanza `ProviderError('PROVIDER_SCHEMA', 503)`.
  - `src/agent.mjs:178-179`: `consume` lanza antes de persistir `providerId` y `approvalUrl` si `quoteId`/`enrollmentId` no se repiten exactamente o si `status` no está en el conjunto esperado.
  - `src/agent.mjs:169-172`: en ambos casos el estado queda `UNKNOWN` con `recoverable=false`, y `src/agent.mjs:214` rechaza el replay.
  - `public/app.js:78` sigue ofreciendo «Recuperar el mismo intento», que siempre falla.
- Escenario: Reap crea el checkout y responde `{ id, status: 'REQUIRES_ACTION', nextAction }` sin repetir `quoteId`/`enrollmentId`, una forma de respuesta NO VERIFICADA. La sonda dio `UNKNOWN`, `providerId null`, `recoverable false`, 1 POST, y el replay respondió `RECONCILIATION`. Se pierden el ID y la URL alojada, así que el recorrido sandbox (criterio 1) queda imposible y la conciliación manual no tiene referencia. El plan dice «Sin ID tras timeout/red, replay dentro de 23 horas». Un cuerpo abortado por timeout es exactamente ese caso, y el código lo trata como no recuperable. Falla cerrado: no hay duplicado ni falso éxito.
- Arreglo:
  1. En `call()`, un 2xx con cuerpo ilegible se trata como `NETWORK_UNKNOWN` (recuperable con la misma clave).
  2. En `consume`, si `raw.id` es válido, persistir `providerId` (y la URL segura si existe) antes de las comprobaciones de correspondencia. Ante una discrepancia, dejar `RECONCILIATION_REQUIRED` con anomalía `schema_mismatch`; un GET posterior sigue sin poder declarar éxito si no corresponde.
  3. Tolerar la ausencia de los campos de eco solo cuando el contrato de Reap esté confirmado.
  4. Añadir pruebas «2xx sin eco» y «cuerpo abortado».

## P2

1. **Etiqueta de estado engañosa.** `COMPLETED` con `amount_mismatch` o `missing_hosted_approval` se muestra como «Compra confirmada» en el chip y en la lista (`public/app.js:4,34,43`), aunque se añada aviso (`public/app.js:59`). Usar una etiqueta distinta cuando `attempt.anomaly` exista.
2. **`evidenceMode` asignado antes de observar nada.** Queda como `sandbox-aprobación-alojada` en todo intento sandbox desde su creación (`src/agent.mjs:156`), incluso FAILED o sin `nextAction`. Derivarlo al cerrar, o renombrarlo «previsto», para no contaminar `docs/resultados.md`.
3. **La recotización en checkout no deja rastro.** El camino `TERMS_CHANGED` (`src/agent.mjs:141-143`) cambia la quote e invalida la aprobación sin evento y sin `version++`. El hash cambia por el total, pero el registro no explica por qué se pidió una aprobación nueva.
4. **Enrollment atascado.** Si la creación devuelve un 4xx definitivo, la clave persistida (`src/agent.mjs:116-123`) se reutiliza siempre; pasadas 23 h queda `RECONCILIATION` permanente sin camino de reinicio salvo borrar la BD. Documentar el procedimiento manual o descartar la clave ante un 4xx definitivo.
5. **Permisos de archivos locales.** `data/` y `.local/` están en `drwxr-xr-x` (`mkdirSync` solo aplica `mode` al crear, `src/store.mjs:8`, `scripts/tls.mjs:3`). `chmod 600` cubre el `.sqlite` pero no los `-wal`/`-shm` (`src/store.mjs:10-11`), que contienen hashes de sesión y URLs alojadas. Aplicar `chmodSync` al directorio.
6. **UI de error y sesión.** El botón «Recuperar» aparece aunque el intento no sea recuperable (`public/app.js:78`). Una sesión vencida solo muestra el error y no regresa a la pantalla de login (`public/app.js:11`).
7. **Hash y forma de la quote.** `expiresAt` entra al hash tal como lo envía Reap, sin normalizar a ISO UTC (`src/policy.mjs:28`; el plan pide ISO UTC). Es estable porque se relee la misma cadena, pero difiere del contrato escrito.
8. **Ediciones del responsable.** El responsable también puede cambiar cantidad, dirección o moneda vía PATCH (`src/server.mjs:86-88`, `src/agent.mjs:55-72`). Requiere una aprobación nueva, así que no rompe controles, pero se aparta del reparto de roles del plan.
9. **Clave de idempotencia visible al solicitante.** El evento `CHECKOUT_DISPATCH` incluye `key` (`src/agent.mjs:158`) y llega al solicitante en `view`. No es un secreto, pero no hace falta mostrarlo.
10. **Artefactos pendientes.** Faltan `docs/demo.md` y `docs/resultados.md` (bloque 6 del plan); `test/fixtures/` está vacío.

## Comprobado sin hallazgo

- **Sesiones y login.** Sesión opaca con hash, 2 h, rotación al login y revocación al logout (`src/auth.mjs:41-53`). Cookie HttpOnly/SameSite=Strict/Secure en HTTPS (`src/server.mjs:34`). Scrypt con hash ficticio cuando el usuario no existe (`src/auth.mjs:33`). Límite de intentos por IP y cuenta (`src/auth.mjs:28-38`).
- **CSRF, Origin y Host.** Host exacto en todas las rutas (`src/server.mjs:41`). Origin exigido en toda mutación, login incluido (`:56`). CSRF por sesión (`:63`). Cuerpo JSON ≤ 32 KB y campos permitidos (`:18-24`). CSP sin inline (`:38`). UI construida solo con `textContent`.
- **Permisos.** Solo el responsable aprueba, crea checkout, consulta y recupera (`src/agent.mjs:22,97,132,205`). Solo el responsable sube el límite (`:62`). `approvalUrl` solo llega al responsable (`:34`). Un rol falsificado se rechaza por id (`test/policy.test.mjs:30`).
- **Carreras.** Revisión optimista en `save` (`src/store.mjs:40-41`). `unlocked` impide editar o recotizar con un intento existente. La transacción de checkout compara revisión y hash antes de crear el intento (`src/agent.mjs:147-160`). PK de `attempts` por solicitud. Prueba de carrera edición-checkout (`test/recovery.test.mjs:69-77`) y de doble clic.
- **Idempotencia y reinicio.** Payload y clave persistidos antes de la red y verificados como inmutables (`src/store.mjs:52-56`). Replay con la misma clave tras reinicio y quote vencida (`test/recovery.test.mjs:19-55`). Límite de 23 h y máximo 3 recuperaciones (`src/agent.mjs:215`). Un 5xx cacheado pasa a `RECONCILIATION_REQUIRED` sin bucle. Timeout de 15 s y `redirect: 'error'` (`src/providers/reap.mjs:41`).
- **Expiración y éxito.** Quote vencida bloquea aprobar y enviar; la aprobación vence con la quote (`src/policy.mjs:48-49`). `COMPLETED` solo cuenta tras un GET con `finalAmount` y `orderId` (`src/agent.mjs:187-193`). Un importe o moneda distintos generan anomalía sin éxito conforme.
- **Aislamiento fixture/sandbox.** El modo se fija al arrancar, con BD separada y modo en cada fila (`src/config.mjs:28`, `src/agent.mjs:19`). Sandbox sin configuración no recurre a fixtures (`src/config.mjs:21-24`). Allowlist de hosts sandbox. `fixture-approve` solo funciona en fixture (`src/agent.mjs:229`). El encabezado de simulación no existe.
- **Datos sensibles.** No hay PAN/CVV/OTP: los campos de tarjeta se rechazan. Los logs de servidor son genéricos. Los eventos se limitan a resúmenes y no guardan cuerpos crudos.

## NO VERIFICADO

- **Recorrido sandbox real.** No se hizo ninguna llamada a Reap. Faltan: enrollment ACTIVE, aceptación de `returnUrl` `https://localhost:3443/return`, aprobación alojada y GET `COMPLETED`.
- **Contrato Reap supuesto por el código, sin contrastar con la documentación** (el README no fija esquemas):
  - Quote: `amountBreakdown.finalAmount{amount,currency}`, `shippingOptions[].selected` y ausencia de un paso para seleccionar envío.
  - Checkout: `nextAction{type:'REDIRECT',url}`, eco de `quoteId`/`enrollmentId`, `finalAmount` y `orderId` en el GET, y estados `REQUIRES_ACTION/PROCESSING/COMPLETED/FAILED/EXPIRED`.
  - Enrollment: estados `ACTIVE/REQUIRES_ACTION/REVOKED` y payload (`source: EXTERNAL`, `owner.type: CLIENT_REFERENCE`, `presentation`).
  - Encabezado `Idempotent-Replayed` y códigos `IDEMPOTENT_PARAMETER_MISMATCH` / `IDEMPOTENCY_REQUEST_IN_PROGRESS`.
  - `shippingAddress` con `null` en `addressLine2`/`region`.
  - Hosts `sg.` y `sandbox.api.` del allowlist.
- **Navegador.** Prueba manual con dos perfiles, CSP efectiva, excepción del certificado local y polling.
- **Proceso.** Esfuerzo efectivo de esta revisión. Adopción de hooks/allowlist y confinamiento técnico del revisor: escribir solo este archivo es una regla por instrucción, no un sandbox.
