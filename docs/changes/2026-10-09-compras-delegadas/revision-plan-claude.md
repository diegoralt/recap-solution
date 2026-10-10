# Revisión del plan candidato (Claude)

- Fecha: 2026-10-09. Revisor: Claude (rol revisor; Codex planifica/implementa).
- Modelo efectivo: `claude-opus-5-5`. Esfuerzo efectivo: NO VERIFICADO (la sesión no lo expone).
- Hashes comprobados con `git hash-object`; todos coinciden con el encargo:
  - `plan-candidato.md`: `9d2a948809ddba8e50749012e80bc15f80424f01`
  - `intent.md`: `6c25ab201a4ed380004da3fbe4e487c79bf73440`
  - `sintesis.md`: `6885a312d9c8239e732e0672094e35ce32abd25e`
  - `spec.md`: `cf1eba6ebc070f5388c56eb6e8f56a7e10f1b684`
  - Contexto: CSV `c8b026381af72ad4119e0770a165dc00fe3b9ecb` (coincide con `README.md:5`); Node local `v24.19.0` (coincide con `plan-candidato.md:18`).
- Leídos: `AGENTS.md`, `CLAUDE.md`, `intent.md`, `sintesis.md`, `spec.md`, `README.md`, `ESTADO.md`, plan candidato, CSV líneas 20 y 149, secciones Revisión cruzada y Modelo y esfuerzo del proceso global. Documentación oficial de Reap consultada el 2026-10-09: idempotency, setup, one-time-purchases, lifecycle. No leí `revision-codex.md`. Sin llamadas a API, instalación ni ejecución de código.

## Veredicto

**Aprobable tras corregir 2 P1.** Sin P0. D1/D2/D3 están bien incorporadas y no las reabro. Identidad, permisos, hash de términos, la transacción editar/aprobar/checkout y la idempotencia persistida antes de red están bien planteados (`plan-candidato.md:34-48`, `:58`). Los dos P1 afectan al único criterio que requiere al proveedor (`spec.md:33`). El primero lo hace inalcanzable sin una aprobación que el plan deja fuera; el segundo permite cumplirlo de forma falsa. Los P2 son contratos de Reap mal descritos o ambiguos que conviene corregir en el mismo pase; ninguno exige rediseño.

## Bloqueantes (P0/P1)

### P1-1 — El recorrido sandbox depende de un túnel público que el plan no autoriza, aunque la confirmación no lo necesita

- **Evidencia:** `plan-candidato.md:68`: «no abrir túnel… Sin URL HTTPS habilitada, recorrido alojado queda pendiente». `plan-candidato.md:74`: en el bloque 1 hay que «confirmar HTTPS» antes del minuto 30. `plan-candidato.md:54`: el enrollment alojado también requiere retorno HTTPS. Reap exige `presentation.returnUrl` HTTPS tanto en enrollment como en checkout ([setup](https://docs.reap.global/agentic-payments/setup), [one-time purchases](https://docs.reap.global/agentic-payments/one-time-purchases)). El resultado se confirma con `GET /agentic/checkouts/:id` desde el servidor; el retorno no prueba nada, y el plan ya lo asume en `plan-candidato.md:56` y `:60`.
- **Escenario que falla:** al minuto 30 hay credenciales y enrollment, pero nadie aprobó el túnel. El plan declara el recorrido alojado «pendiente», las 5 horas terminan solo con fixtures y `spec.md:33` (criterio 1) queda incumplido. El bloqueo viene de confundir «returnUrl HTTPS» con «app expuesta públicamente». El navegador del responsable sigue la redirección; Reap no necesita alcanzar la app, y la app consulta el estado por GET saliente.
- **Arreglo concreto:**
  1. Separar en el plan «returnUrl HTTPS» de «exposición pública». Opción por defecto sin exposición: `https://localhost:<puerto>/return` servido con `node:https` y un certificado autofirmado generado con `openssl` (viene con macOS; sin dependencias nuevas). La confirmación se hace por GET disparado desde la app (botón «Consultar estado» del responsable y polling acotado mientras haya `REQUIRES_ACTION`/`PROCESSING`), sin depender de que el retorno cargue.
  2. En el preflight del bloque 1, crear un checkout sandbox con ese `returnUrl` y registrar si Reap acepta `localhost`. NO VERIFICADO hoy.
  3. Solo si Reap rechaza `localhost`, Diego decide sobre la configuración concreta del túnel. Esa decisión debe pedirse junto con la aprobación del plan, no a mitad del bloque 1, para no gastar los 30 minutos esperando.

### P1-2 — `X-Simulate-Checkout` puede cumplir el criterio 1 sin aprobación alojada, y los resultados no lo distinguen

- **Evidencia:** `plan-candidato.md:62`: header de simulación «registrado como simulado». `plan-candidato.md:91`: `docs/resultados.md` solo distingue «fixture/sandbox». `plan-candidato.md:87`: «éxito… sandbox si habilitado». Según Reap, `X-Simulate-Checkout: COMPLETED` simula un checkout completado solo en sandbox ([one-time purchases](https://docs.reap.global/agentic-payments/one-time-purchases)). El checkout pasa a `COMPLETED` sin `nextAction`, o sea, sin la aprobación alojada que exigen `spec.md:17` y `sintesis.md:41`.
- **Escenario que falla:** la aprobación alojada falla por HTTPS o por OTP. Para tener la demo se usa el header, `GET` devuelve `COMPLETED` con `orderId`, y `resultados.md` lo anota como «sandbox / ejecutado / éxito». Así se reporta un «recorrido completo en Reap sandbox» (`spec.md:33`) que se saltó la autorización de pago: es justo la confusión entre evidencias que prohíben `CLAUDE.md` y `AGENTS.md`.
- **Arreglo concreto:**
  1. `resultados.md` usa tres valores de modo: `fixture`, `sandbox-simulado` y `sandbox-aprobación-alojada`.
  2. Solo `sandbox-aprobación-alojada` con `GET` `COMPLETED` cumple el criterio 1.
  3. Activar el header requiere una variable server-side explícita, nunca un parámetro del cliente. Se persiste en el intento y la UI y la demo lo muestran como «simulado».
  4. Prueba: con la variable desactivada, ninguna petición lleva el header.

## Debería (P2)

1. **Contrato de enrollment/mandato erróneo** (`plan-candidato.md:54`). La fuente se llama `"EXTERNAL"`, no `EXTERNAL_CARD` ([setup](https://docs.reap.global/agentic-payments/setup)). Los endpoints de mandatos «are not live in sandbox or production» ([lifecycle](https://docs.reap.global/agentic-payments/lifecycle)). Si se aplica al pie de la letra, «Verificar condiciones/mandato habilitado; si no se pueden confirmar, no enviar checkout» nunca deja pasar el checkout. Arreglo: exigir `GET /agentic/enrollments/:id` con `status: ACTIVE`, no depender de mandatos y tratar un checkout sin `nextAction` como anomalía, porque nuestra demo requiere aprobación alojada.
2. **5xx cacheado convierte la recuperación en un bucle.** Reap cachea todos los resultados, incluidos los 5xx, salvo 401/422/429, y los reproduce con `Idempotent-Replayed: true` ([idempotency](https://docs.reap.global/api-reference/idempotency)). No hay forma documentada de listar checkouts ni de buscarlos por clave. `plan-candidato.md:58` reintenta 5xx con la misma clave hasta 23 h. Arreglo: si la respuesta trae `Idempotent-Replayed: true` y un 5xx, dejar de reintentar y pasar a `RECONCILIATION_REQUIRED` de inmediato. Reintentar solo ante timeout, error de red sin respuesta, 409 `IDEMPOTENCY_REQUEST_IN_PROGRESS` o 429. Tratar 400 `IDEMPOTENT_PARAMETER_MISMATCH` como un defecto propio, nunca como un fallo del proveedor. Fijar un timeout explícito por petición (`AbortSignal.timeout`).
3. **La recuperación no debe pasar por la compuerta previa al checkout.** `plan-candidato.md:44-46` hace que la aprobación expire con la quote y bloquea ante expiración. `plan-candidato.md:58` permite reenviar la misma clave hasta 23 h. Si la recuperación tras reinicio reutiliza el validador previo, la quote vencida bloquea el replay y el intento queda `UNKNOWN` aunque el checkout exista. Arreglo: el replay es el mismo request ya autorizado. Solo verifica que el payload persistido sea idéntico byte a byte y que no se haya pasado la ventana; no revalida la quote. Prueba: timeout, reinicio y quote vencida terminan en el mismo checkout ID.
4. **Retorno con `SameSite=Strict`** (`plan-candidato.md:36`). Cuando el navegador vuelve desde Reap (navegación cross-site), la cookie Strict no se envía en esa petición. Si la ruta de retorno exige sesión, el responsable cae en 401 o en el login. Arreglo: `/return` es HTML estático sin autenticación ni efectos y no lee parámetros de la query; su JS llama a los endpoints autenticados (same-site, donde la cookie sí viaja). Probarlo manualmente en el flujo de dos perfiles (`plan-candidato.md:85`).
5. **Estados y bloqueos no cubiertos** (`plan-candidato.md:60`). No hay estado para un bloqueo de política antes del checkout (C2, H2, H3, T2) ni para `COMPLETED` con `finalAmount` distinto del aprobado. Arreglo: añadir `BLOCKED` con motivo y una marca `amount_mismatch` sobre `COMPLETED`. Contar esto último como «violación que alcanzó checkout» en las métricas (`README.md:150`), no como éxito. Indicar también dónde se guarda `nextAction.url`: los eventos lo excluyen, pero hace falta para volver a abrir la aprobación tras un doble clic o un reinicio. Puede ir en la fila del intento, servido solo al responsable, o volver a pedirse con GET (NO VERIFICADO que el GET lo devuelva).
6. **Hash canónico sin definir.** `plan-candidato.md:44` dice «JSON canónico» pero no la regla. Arreglo: un prefijo de versión (`terms:v1`), una lista fija de campos en orden explícito, importes enteros en centavos, cadenas con `trim` + NFC y `null` explícito para los ausentes. Prueba: mismos términos dan el mismo hash, y un cambio de un centavo, de dirección o de quote ID da otro.
7. **Quién fija el límite.** `plan-candidato.md:38` niega autoridad a lo que manda el cliente, pero el límite lo captura el formulario del solicitante (`plan-candidato.md:66`). Si lo fija el solicitante, el control de presupuesto se reduce a lo que el responsable acepte al revisar. Arreglo: escribir que el límite es un término aprobado por el responsable (ya va en el hash) y que solo el responsable puede subirlo.
8. **Separación de modos.** `plan-candidato.md:26` y `:42` separan bases y adaptadores, pero no dicen cómo se elige el modo. Arreglo: modo fijado por variable al arrancar el proceso, un proceso por modo, modo guardado en cada fila y nunca seleccionable por petición. Prueba: el modo sandbox sin configuración no arranca con el adaptador fixture.
9. **Viabilidad de 5 horas.** La tabla de `plan-candidato.md:72-79` es plausible para un implementador agente, pero el bloque 1 consume reloj en dependencias externas: credenciales, host (la doc muestra `https://sandbox.api.reap.global`; `README.md:67` cita `mx.sandbox`), enrollment `ACTIVE` y merchant. Arreglo:
   - Hacer el preflight y la decisión de P1-1 antes de arrancar los 300 minutos.
   - Fijar una lista de recortes ordenada, por ejemplo: creación propia de enrollment (usar el del equipo); límite de login por IP mientras sea solo loopback; segundo contexto con fixture; LLM. Ningún recorte toca D2, idempotencia ni presupuesto.
   - Definir qué se enseña si al minuto 300 el checkout sigue deshabilitado por P0/P1 (`plan-candidato.md:81`): bloqueo y fixtures, sin compra sandbox.
10. **Fallo definitivo cierra la solicitud.** Con un intento único por solicitud (`plan-candidato.md:42`), un `EXPIRED` en la aprobación alojada obliga a crear una solicitud nueva. Reap también exige quote y checkout nuevos ([lifecycle](https://docs.reap.global/agentic-payments/lifecycle)), así que es correcto, pero el guion de demo debe preverlo para no perder minutos.
11. **Flujo agéntico** (`plan-candidato.md:10`, `:14`). La línea 10 dice «un agente acotado propone», pero en v1 la selección es determinista. Para no contradecir `plan-candidato.md:14`, la UI y la demo deben llamarlo «flujo asistido por herramientas», y reservar «agente» para cuando haya un LLM. La confirmación con los organizadores sigue pendiente.

## NO VERIFICADO

- Que Reap acepte `returnUrl` con `https://localhost` o `127.0.0.1` (P1-1).
- Host y `Reap-Version` válidos para la clave del equipo: la doc de compras usa `https://sandbox.api.reap.global` y `README.md:67`, `mx.sandbox.api.reap.global`.
- Si `POST /agentic/quotes` exige `Idempotency-Key`: los ejemplos lo incluyen, pero la doc no lo dice.
- Si `GET /agentic/checkouts/:id` devuelve `nextAction.url` mientras está en `REQUIRES_ACTION`.
- Duración de `expiresAt` en quotes y checkouts.
- Si una respuesta 5xx cacheada implica que no se creó checkout.
- Aceptación de Blend Station (MX), Wild One (US, `Ships to` incluye MX; CSV:149) y del enlace de carrito del CSV con `externalCheckout`.
- Enrollment `ACTIVE` disponible para el equipo; disponibilidad de credenciales y tarjeta.
- Si los organizadores exigen LLM; categorías y agenda oficiales.
- Esfuerzo efectivo de este revisor y confinamiento técnico de escritura (solo instrucción).
