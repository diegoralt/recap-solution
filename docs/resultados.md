# Evidencia del prototipo

Fecha de prueba: 2026-10-09 (America/Mexico_City). Primera verificación local: 29 pruebas pasando; correcciones posteriores: 41 pruebas pasando con `npm run verify`; sintaxis backend/frontend y casos de seguridad. El sandbox del entorno bloquea puertos de test con EPERM; se ejecutó verificación autorizada fuera de ese sandbox, servidores HTTP ligados solo a loopback.

## Matriz del README

| ID | Evidencia | Estado | Verificación |
|---|---|---|---|
| C1 | fixture | PASA | compra solo tras consulta, `test/policy.test.mjs` |
| C2 | fixture | PASA | envío excede límite, no intento checkout |
| C3 | fixture | PASA | cantidad incorrecta bloquea |
| E1 | fixture/HTTP local | PASA | solicitante no aprueba/envía, rol falseado no sirve |
| E2 | fixture | PASA | atributo no comprobado bloquea |
| E3 | fixture | PASA | cambios invalidan aprobación y pantalla antigua |
| H1 | fixture | PASA | Lilac, variante y destino MX; no prueba quote real |
| H2 | fixture | PASA | país fuera de lista bloquea |
| H3 | fixture | PASA | MXN vs USD bloquea sin conversión |
| T1 | fixture | PASA | total igual al límite permite |
| T2 | fixture | PASA | un centavo excedente bloquea |
| T3 | fixture | PASA | expiración exige recotizar/aprobar |
| T4 | fixture/HTTP local | PASA | doble clic y timeout tras compra; reinicio + quote expirada recuperan misma clave/body/checkout |
| T5 | fixture | PASA | PROCESSING no declara compra completada |
| T6 | fixture | PASA | FAILED/EXPIRED finales sin éxito |
| T7 | fixture, sin LLM | PASA | texto sin autoridad no altera presupuesto; no evaluación de prompt injection de un modelo |

Pruebas adicionales: sesiones, rotación/expiración/rate limit, CSRF, Host/Origin, cuentas separadas por HTTP, cambio de límites, hash sensible a dirección/centavos/quote, cambio de quote antes del envío, carrera edición/envío, intento inmutable, ventana de 23 h, 5xx cacheado y ausencia de header de simulación. Incidente detectado y corregido: respuesta COMPLETED sin importe/orden no muta el estado ni produce éxito.

Las 41 pruebas son locales; no son compras reales. T1/T2 comparten una prueba y T4 tiene dos; la matriz tiene 16 IDs. No hay credenciales de equipo en tests.

## Interfaz

Verificación automatizada en navegador Orca, instancia de QA en localhost:3001, almacenamiento en memoria y cuentas ficticias exclusivas de test. Login, formulario de solicitud, cotización 690 MXN, ausencia de autorización en solicitante, login del responsable, autorización interna, intento REQUIRES_ACTION, simulación fixture y compra conforme consultada. Consentimiento del diálogo se simuló solo en QA. No se llamó a Reap.

Captura local de UI ficticia en `.local/qa-screen.png` (ignorada por Git, no publicada). Verificación con dos perfiles reales, móvil y retorno cross-site alojado: NO VERIFICADOS todavía.

## Integración real

| Criterio | Modo | Estado |
|---|---|---|
| API key/base/version del equipo aceptadas | sandbox, preparación | VERIFICADO: enrollment y quote respondieron |
| Enrollment alojado y ACTIVE consultado | sandbox, preparación | REQUIRES_ACTION con enlace; ACTIVE pendiente |
| Cotización final del respaldo US | sandbox, preparación | QUOTED: 303.77 USD; producto/cantidad no confirmados |
| Retorno localhost | sandbox, preparación | API aceptó returnUrl al crear; navegador NO VERIFICADO |
| Aprobación alojada y GET COMPLETED conforme | sandbox-aprobación-alojada | NO EJECUTADO |
| Checkout con header de simulación | sandbox-simulado | NO IMPLEMENTADO por diseño; no satisface aceptación |

El código no está cerrado como solución integrada hasta completar recorrido real o aceptar por escrito un recorte. Primera revisión Claude recibida: 2 P1. Correcciones implementadas y verificadas por Claude; sin P0/P1 técnicos nuevos. Diego aprobó el ajuste de garantía de contenido el 9 de octubre al autorizar el plan de cierre.

## Métricas y límites

En casos ejecutados, assertions comprueban que violaciones no crean intento y que servidor proveedor HTTP de T4 registra una compra única ante timeout/replay. Hay una sola emisión CHECKOUT_DISPATCH en doble clic. Respuestas malformadas, PROCESSING y discrepancias de importe no cuentan como éxito conforme. Sin medición de carga, disponibilidad o garantía universal.

La prueba de discrepancia de importe introduce intencionalmente un resultado anómalo y comprueba su detección; no equivale a «cero discrepancias» del proveedor. Métricas Reap reales, demanda, ahorro y disposición a pagar: NO VERIFICADOS.

CSV preservado: git hash con filtros `c8b026381af72ad4119e0770a165dc00fe3b9ecb`; hash de bytes (`git hash-object --no-filters`) `228b336ae014e3b95c474d8f093ce77175867ed0`. La diferencia proviene del filtrado de finales de línea de Git; el runtime verifica bytes, sin modificar CSV.

## Límite del contrato externalCheckout

El esquema oficial de quote no devuelve producto/variante/cantidad/atributos. Se registran como intención enviada (`productEvidence: request-only`), nunca como confirmación de Reap. C3/H1/E2 no acreditan contenido del carrito sandbox. Las métricas finales de sandbox solo se refieren a conformidad del pago (importe/moneda/orden/estado), no producto ni entrega. Ajuste aprobado por Diego: [ajuste-contrato-reap.md](changes/2026-10-09-compras-delegadas/ajuste-contrato-reap.md).

Regresiones adicionales ejecutadas: 2xx ilegible/abortado recupera misma clave/body; respuesta sin eco conserva ID pero oculta enlace; GET incoherente no completa; evidencia alojada solo se asigna tras GET conforme. Fixtures se generan en código de tests; `test/fixtures/` no necesita archivos externos.

GET checkout permite omitir ecos opcionales solo después de un POST/GET que vinculó explícitamente quote/enrollment. ID y ecos presentes deben coincidir. Enrollment FAILED/EXPIRED/REVOKED admite un nuevo registro tras consulta final, sin borrar BD.

## Pruebas sandbox posteriores a revisión

Enrollment EXTERNAL creado en Reap y consultado por creación: REQUIRES_ACTION, enlace alojado disponible; localhost returnUrl aceptado al crear, retorno navegador todavía NO VERIFICADO. Sin datos de tarjeta manejados por el agente. Cotización café bloqueada por QUOTE_UNFULFILLABLE sin motivo documentado disponible. Respaldo abchome.com, destino US y dirección ficticia: QUOTED, 303.77 USD, dentro de 350 USD; intención de producto no confirmada (`request-only`). No se creó checkout. Una cotización válida tardó 18 934 ms (18.934 segundos); creación de quote ahora permite 45 s, resto 15 s. Verificación independiente del ajuste completada: verificacion-latencia-claude.md, APTO sin P0/P1 nuevos.

Desde la app HTTPS reiniciada se repitió la quote del respaldo: QUOTED, 303.77 USD en 17 655 ms (17.655 segundos), sin checkout. El ajuste de garantía está aprobado; la aceptación integral sigue pendiente de tarjeta ACTIVE y pago alojado completo. El navegador Orca mostró chrome-error al abrir HTTPS local; la respuesta HTTP de health se validó usando el certificado local como CA de esa conexión. No se instaló confianza global.

## Cierre de interfaz · 22:51 CDMX

Verificación independiente en `changes/2026-10-09-compras-delegadas/verificacion-cierre-ui-claude.md`: APTO, cinco P2 corregidos, sin P0/P1 ni regresiones. Entrada SHA-256 `7166c1574eb303a0119aaf0a7c8db3720ae7e94f5f98bcb8aab86efcae37a697`. Las 41 pruebas pasan después del último cambio de código.

QA en navegador con servidor local en memoria y cuentas de test: el respaldo US cotiza 284 USD en fixture; cambiar cantidad a dos invalida cotización y autorización; recotizar bloquea por presupuesto. El solicitante puede editar y no aprobar; el responsable puede aprobar y no editar. Segundo recorrido con mouse: cotización 349 MXN, autorización, preparación, pago simulado y consulta conforme; último paso visual completado y aclaración del entorno local visible. El consentimiento del diálogo se simuló únicamente en esta instancia de QA. Estos resultados no son pagos Reap.

El registro de tarjeta Reap expirado fue renovado tras consultar su estado final. Última consulta: REQUIRES_ACTION; enlace alojado disponible. ACTIVE, aprobación alojada y GET COMPLETED del sandbox: NO VERIFICADOS. El botón Actualizar bandeja vuelve a consultar el registro. La dirección completa está visible; la edición conserva la segunda línea. Al vencer la cotización se retiran las acciones de autorizar y preparar pago; comportamiento visual del vencimiento automático NO VERIFICADO en navegador.

## Primer pago alojado sandbox · 23:16 CDMX (10-oct 05:16 UTC)

Enrollment ACTIVE (Diego registró la tarjeta solo en Reap; el agente no manejó PAN/CVV/OTP). Respaldo US (abchome.com, Amiko End Table, 1 unidad): quote 303.77 USD, autorizada por el responsable, checkout `4ada45d6-651d-421b-b2f3-0ec2a212f194` creado con enlace alojado. Secuencia consultada por GET: REQUIRES_ACTION → PROCESSING → **FAILED** (05:16:52 UTC). Reap no devuelve motivo (`nextAction: null`, sin código de error) y la app no detecta anomalía. Resultado: **pago fallido; no hay COMPLETED**. Causa NO VERIFICADA (puede ser el comercio/producto request-only, la tarjeta de prueba o el sandbox). No presentar como éxito.

## Segundo pago alojado sandbox · 23:25 CDMX

Hogar (wildone.com, Cat Slow Feeder Lilac, 1 unidad): con dirección MX la quote falló («No fue posible cotizar con esa dirección»); con dirección US (NY 10001) cotizó 23.96 USD (12 producto + 10 envío + 1.96 impuestos). Autorizada por el responsable; checkout `52ddf330-7b9b-4d51-9fcf-d1201676c6cc` (orden ord_01M4J4ANV6JK15235Q9ATMADQW) → REQUIRES_ACTION → PROCESSING → **FAILED** (05:25:20 UTC), `nextAction: null`, sin motivo. Dos fallos con comercios distintos y misma tarjeta/enrollment: sospecha sobre la tarjeta de prueba o el sandbox, NO VERIFICADA; pendiente preguntar a Reap con ambos ids. Sin COMPLETED.

Ajuste de UI: `public/app.js` preset() ahora usa la dirección del mercado del comercio (US) aunque el comercio envíe también a MX. 41/41 verde posterior.
