# Plan aprobado: compras delegadas con confianza

- Aprobado: 2026-10-09 por Diego en el chat.
- Cita: «Si, avanza con lo que tenemos, ya tengo también las credenciales para la API de Reap y la tarjeta a utilizar en el sandbox para utilizar en la solución cuando lo requieramos».
- Intent: [intent.md](intent.md), hash `6c25ab201a4ed380004da3fbe4e487c79bf73440`.
- Versión aprobada: candidato hash `c49a1b94370f5e6fc11384f546b43189a8b88558`.
- Revisión Claude: `revision-plan-claude.md`, `verificacion-p1-claude.md`, `verificacion-final-plan-claude.md` (roles invertidos por Diego).
- Presupuesto: 300 minutos desde 2026-10-10 00:26:07 UTC (2026-10-09 18:26:07 America/Mexico_City); límite 05:26:07 UTC. Sin topes de consumo de modelos acordados.
- Riesgo aceptado al aprobar: aceptación de retorno localhost NO VERIFICADA; ante rechazo, recorrido alojado pendiente hasta autorizar exposición concreta. No publicación, commits, push ni merges.

A continuación se conserva íntegro el candidato revisado como antecedente aprobado; su estado histórico ya no indica la situación actual.

---

# Plan candidato: compras delegadas con confianza

- Fecha: 2026-10-09. Estado: pendiente de revisión de Claude y aprobación explícita de Diego; no implementar todavía.
- Entrada: `intent.md` hash `6c25ab201a4ed380004da3fbe4e487c79bf73440`, más decisiones D1/D2/D3 en `sintesis.md` y spec actualizada.
- Diego: «El tiempo de desarrollo es de 5 horas, alineado con las recomendaciones».
- Roles: Codex implementa; Claude revisa. No commits, push, merges ni publicación en este plan.

## Resultado y límites

App local de compras delegadas: solicitante prepara una petición, el flujo asistido por herramientas propone un producto compatible, el servidor verifica restricciones y cotización; el responsable revisa términos, autoriza y abre aprobación alojada de Reap. Consulta del proveedor confirma el resultado. Tres contextos comparten flujo: cafetería, equipo, hogar. Un recorrido principal sandbox y dos contextos adicionales con fixtures claramente señalados.

Reap sandbox exclusivamente; Kwal/onchain pospuestos. Presupuesto por solicitud, solo MXN/USD, importes exactos en centavos, sin conversión. No guardar ni solicitar PAN/CVV/OTP en la app. Tarjeta compartida no acredita titularidad. Hipótesis comercial por contexto, no demanda demostrada.

V1: flujo asistido por herramientas con selección determinista de candidato permitido, cotización, verificación y solicitud de aprobación; formulario para intención explícita. UI y demo usan ese nombre; reservar «agente con LLM» para cuando exista. LLM opcional, primer recorte. Confirmar con organizadores si lo exigen; sin tiempo/acceso, declarar requisito pendiente, sin inventar cumplimiento.

## Stack y archivos

Node.js 24, módulos ESM, `node:http`, `node:crypto`, `node:sqlite`, `fetch` y `node:test`; HTML/CSS/JS sin build. Node local comprobado: 24.19.0; SQLite en memoria: 3.53.3. Evitar dependencias de runtime para reducir instalación. `node:sqlite` sirve para demo local, no compromiso de infraestructura de producción.

- `package.json`: `start`, `test`, `verify` sin dependencias de terceros.
- `src/server.mjs`: HTTP/HTTPS local, rutas, sesión, CSRF, límites de body, servir solo archivos públicos.
- `src/auth.mjs`: cuentas de demo, hashes scrypt, sesiones y permisos.
- `src/store.mjs`: SQLite, migración inicial, transacciones y eventos mínimos.
- `src/policy.mjs`: validaciones, centavos, hash canónico de términos.
- `src/agent.mjs`, `src/merchants.mjs`: herramientas acotadas y selección de referencias del CSV original, preservándolo.
- `src/providers/reap.mjs` y `fixture.mjs`: mismo contrato normalizado; no mezclar modos ni bases de datos.
- `public/index.html`, `app.js`, `styles.css`: solicitud, bandeja del responsable, revisión y estado; modo fixture/sandbox siempre visible.
- `test/*.test.mjs`, `test/fixtures/`: matriz y contratos HTTP simulados.
- `.env.example`: nombres y ejemplos sin secretos; `.gitignore`: env, SQLite/WAL, sesiones, certificados/claves TLS locales y resultados sensibles.
- `docs/demo.md`, `docs/resultados.md`: guion, evidencia y límites; actualizar `README.md`, `CLAUDE.md`, `ESTADO.md`, `.claude/ESTADO.md`.

## Identidad y acceso

Un solicitante y un responsable fijos de demo; sin registro público, multitenancy ni selector de rol autorizado por cliente. Inicialización local genera contraseñas separadas o recibe variables; almacenar solo hashes salados scrypt. No contraseñas predeterminadas en repo ni impresas en logs de app. Instrucciones para configurar credenciales locales fuera del repo; si faltan, app no habilita login/checkout.

Sesiones opacas aleatorias con hash en SQLite, vencimiento 2 horas; rotar al login, revocar al logout. Cookie HttpOnly, SameSite=Strict, Secure en HTTPS; HTTP solo loopback. Login limitado por IP/cuenta con ventana y mensaje genérico. En mutaciones autenticadas exigir CSRF por sesión y Origin igual a origen configurado. Rechazar otros orígenes/hosts y cuerpos >32 KB. Salida de catálogos con textContent, CSP sin scripts inline.

Responsable asignado por servidor a cada solicitud. Solicitante solo lee/edita sus solicitudes anteriores al intento; responsable lee las asignadas, aprueba y crea checkout. El solicitante propone un límite inicial; es un término que el responsable acepta explícitamente y solo el responsable puede aumentarlo. Todo cambio de límite invalida aprobación. Ni rol, aprobador, quote ni importe enviados por cliente constituyen autoridad. En APIs: 401 sin sesión, 403 sin permiso; no exponer IDs/URLs sensibles a otro usuario.

## Modelo persistente y términos

Modo fijado al arrancar por variable server-side (`fixture` o `sandbox`), nunca por petición. Un proceso por modo; sin fallback silencioso. SQLite separado (`data/fixture.sqlite`, `data/sandbox.sqlite`), modo en filas, WAL, foreign keys. Tablas: usuarios, sesiones, solicitudes (versión), cotizaciones (snapshot validado), aprobaciones, intentos, eventos. Un intento único por solicitud; claves de idempotencia únicas, payload exacto y fecha persistidos antes de red. Sin presupuesto agregado ni decremento de saldo.

Hash SHA-256 construido por servidor: prefijo `terms:v1`, seguido de JSON de array con orden fijo: solicitud ID, versión, merchant, producto ID, variante ID, cantidad, dirección como array de campos fijos (nombre, apellido, teléfono, línea1, línea2, ciudad, región, código postal, país), moneda, total centavos, quote ID, envío seleccionado, expiración ISO UTC, límite centavos. Cadenas con trim + NFC; ausentes null explícito; cantidades/importes enteros. El mismo snapshot normalizado se muestra y envía al proveedor. Aprobación registra responsable, hash, fecha. Cualquier modificación/recotización elimina aprobación; cliente envía versión/hash mostrado para detectar pantalla antigua. Aprobación expira junto a quote.

Antes de checkout: releer quote del proveedor; normalizar y comparar términos con aprobación; validar total, moneda, cantidades, atributos con evidencia y destino compatible explícito. Dato ausente, expiración inválida o discrepancia bloquea. Precios CSV no son total; `*` de envío no significa cualquier país. Merchant/enlace solo desde allowlist verificada, sin URL arbitraria.

Edición/recotización prohibida mientras existe intento no resuelto. Transacción corta sin await: comparar versión, aprobación y ausencia de intento; guardar intento y payload, bloquear solicitud. Esto evita carreras entre editar/aprobar/enviar. Red fuera de transacción. Si hay intento existente, retornar su estado; no iniciar otro checkout. Quote puede vencer después de validar: error del proveedor no se convierte en éxito.

## Contrato Reap y manejo de incertidumbre

Configuración server-side: `REAP_API_KEY`, `REAP_VERSION`, host sandbox permitido, `APP_ORIGIN`, `REAP_ENROLLMENT_ID` si ya existe. Host solo sandbox de Reap confirmado con equipo; rechazar producción/host arbitrario. Configuración ausente deshabilita modo sandbox; no sustituir automáticamente con fixtures.

[Setup oficial](https://docs.reap.global/agentic-payments/setup): enrollment alojado, consulta de estado ACTIVE. Preferir uno del equipo; creación propia, si necesaria, usa fuente `EXTERNAL`, referencia del responsable, idempotencia y retorno HTTPS; datos de tarjeta solo en Reap. Exigir ACTIVE consultado antes del primer checkout. No depender de endpoints de mandato para v1. Checkout debe ofrecer aprobación alojada para cumplir la demo; sin nextAction inicial, registrar anomalía, consultar estado y no contar ese recorrido como aprobación alojada.

[Compras puntuales](https://docs.reap.global/agentic-payments/one-time-purchases): cotizar vía descubrimiento o checkout URL permitido; seleccionar envío, conservar quote/expiración, consultar total final. Para v1 usar carrito del CSV solo si está admitido por integración; si no, búsqueda/detalle/variante Reap dentro de merchant permitido. No usar IDs CSV como IDs internos Reap. Checkout enlaza quote/enrollment y retorno HTTPS; presentar `nextAction` si existe. Confirmar mediante GET, no parámetros del retorno.

[Idempotencia oficial](https://docs.reap.global/api-reference/idempotency): misma clave/body; ventana 24 horas. Persistir body exacto antes del primer POST. Sin ID tras timeout/red, replay dentro de 23 horas desde primer envío; luego reconciliación sin reenvío. Con ID, GET. Replay verifica responsable, body byte a byte y ventana; no revalida quote expirada ni constituye nueva compra. Backoff solo timeout/red, 409 de operación en curso o 429: máximo tres intentos de recuperación, luego UNKNOWN y consulta manual. Timeout por request 15 segundos. 5xx conserva incertidumbre sin loop; replay 5xx cacheado pasa a RECONCILIATION_REQUIRED. Error de parámetros idempotentes = defecto local; nunca nueva clave ante incertidumbre. Error definitivo cierra solicitud; nueva solo tras confirmar ausencia de compra pendiente/completada.

Estados locales: DRAFT, BLOCKED (motivo), QUOTED, APPROVED, SUBMITTING, UNKNOWN, REQUIRES_ACTION, PROCESSING, COMPLETED, FAILED, EXPIRED, RECONCILIATION_REQUIRED. Solo GET válido con quote/enrollment y COMPLETED confirma compra. Importe/moneda final discrepante: conservar estado real, marca amount_mismatch y contar violación, sin éxito conforme. Respuesta desconocida/malformada mantiene pendiente. `/return` es HTML estático público sin efectos ni lectura de query; JS consulta endpoints autenticados same-site, para cookie Strict. Botón del responsable y polling cada 5 segundos, máximo 2 minutos; luego consulta manual. Persistir order ID y nextAction URL en fila privada del intento para reinicio; URL solo responsable, nunca eventos/logs. Sin body bruto en registros. FAILED/EXPIRED definitivos requieren solicitud, quote y checkout nuevos; guion lo anticipa.

Solo responsable accede al enlace alojado obtenido del API por HTTPS; no URL de cliente. Datos solo a sandbox confirmado. **No implementar ni enviar `X-Simulate-Checkout`**, tampoco mediante variable o petición. Prueba de adapter exige ausencia del header en cada POST. Evidencia usa `fixture`, `sandbox-simulado` y `sandbox-aprobación-alojada`; modo simulado queda reservado como categoría de evidencia y no cuenta como aceptación. Solo aprobación alojada observada seguida de GET COMPLETED sin discrepancias cumple criterio de recorrido completo; el sandbox sigue sin mover dinero real.

## Recorrido principal y acceso externo

Primero probar cafetería/Blend Station. Si no está habilitado, probar Wild One (US, CSV línea 149) con destino y presupuesto de prueba explícitos; si quote >35 USD, mostrar bloqueo y solicitar límite nuevo al responsable, no aumentar silenciosamente. Respaldo final: merchant US del CSV con destino US y dirección ficticia compatible, manteniendo controles y documentando sustitución. No afirmar entrega MX cuando se usó US.

App solo loopback. En sandbox, login, UI, API y retorno se sirven exclusivamente en el mismo origen `https://localhost:3443`; HTTP y 127.0.0.1 no son orígenes alternativos de sesión. ReturnUrl: `https://localhost:3443/return`, servido con node:https; certificado autofirmado con SAN localhost/127.0.0.1 generado por openssl en carpeta ignorada. OpenSSL local comprobado 3.6.5. Documentar excepción manual de navegador para certificado local; no instalar confianza global ni desactivar validación TLS saliente. Confirmación por GET desde servidor, sin depender del retorno; botón y polling del responsable.

Aceptación de returnUrl localhost por Reap: **NO VERIFICADA**; comprobar en primer checkout autorizado del recorrido, sin crear uno extra de preflight. Si se rechaza, no hay alternativa automática: preparar configuración concreta de túnel con autenticación y pedir aprobación para exposición antes de abrirlo. No túnel, despliegue/publicación en este plan. Si no se autoriza o no alcanza el tiempo, reportar recorrido completo pendiente. Este riesgo y límite deben constar en la aprobación del plan; no confundir HTTPS con necesidad de publicación.

## Cinco horas: 300 minutos desde aprobación del plan

| Bloque | Minutos | Entrega y corte |
|---|---:|---|
| 1. Preflight y contratos | 0–30 | Comprobar credenciales/config sin imprimirlas, enrollment y merchant; preparar HTTPS local. Sin acceso al minuto 30: fixtures, sandbox pendiente; no consumir toda la sesión investigando |
| 2. Núcleo y acceso | 30–100 | SQLite, sesiones/roles, términos y validaciones; pruebas de permisos y límites antes de checkout |
| 3. Proveedor e intento | 100–170 | Adapter, persistencia, idempotencia/recuperación, estados; prueba completa si prerrequisitos listos |
| 4. UI y escenarios | 170–215 | Flujo principal, bandeja y revisión; dos contextos con fixtures, sin LLM ni adornos si hay retraso |
| 5. Verificación y revisión | 215–270 | Prioritarios + matriz restante según tiempo; Claude revisa código sensible sin commits; corregir P0/P1 y repetir verificación |
| 6. Demo y evidencia | 270–300 | Guion, evidencia éxito/bloqueo, tabla probado/pendiente; demo honesta |

Si bloque 2/3 no satisface controles, no habilitar checkout. Al minuto 215 congelar nuevas funciones. Recortes: LLM/adornos, creación propia de enrollment (usar el del equipo; si falta, integración pendiente), automatización extra de escenarios. Ningún recorte toca D2, idempotencia ni presupuesto. Mantener preflight dentro de 300 minutos para no esconder tiempo. Con P0/P1 al minuto 300, enseñar bloqueos y fixtures con checkout deshabilitado, sin compra sandbox. No prometer 16 pruebas ni extender 5 horas sin Diego.

## Verificación y criterios

Comando propuesto para `CLAUDE.md` al introducir código: `verificación: npm run verify`. `verify` ejecuta `node --test` y chequeo sintáctico de módulos/backend/frontend con script Node, falla ante cualquier error. No requiere proveedor ni secretos; no confundir verde local con integración real. Prueba manual en dos perfiles de navegador para login, aprobación, retorno y etiquetas de modo.

Prioritarios: éxito fixture y sandbox alojado si habilitado; C2, E1/E3, H3, T1/T2, T4/T5; expiración/cambio dirección/quote, sesión/CSRF, rol falsificado, concurrencia y reinicio tras timeout con quote ya expirada. Proveedor HTTP de prueba cuenta compras únicas por clave; recuperar mismo checkout tras reinicio. Además: 5xx cacheado no loop, header de simulación ausente, modo sandbox sin config no fallback, solicitante no sube límite, hash estable y sensible a centavo/dirección/quote. No basta inspeccionar logs cliente.

Resto: C3, E2, H1/H2, T3, T6/T7 según matriz README. T7 fixture con texto malicioso no cambia política; si no hay LLM, se declara prueba de tratamiento de datos, no evaluación de prompt injection del modelo. H1 depende de quote; exceso presupuesto bloquea correctamente. Expiración invalida toda aprobación aun si nuevo total es igual.

`docs/resultados.md`: ID, modo de evidencia (`fixture`, `sandbox-simulado`, `sandbox-aprobación-alojada`), ejecutado/no ejecutado, resultado, evidencia y fecha. Solo último modo con aprobación alojada observada y GET COMPLETED conforme cumple criterio 1. Contar intentos y compras únicas proveedor; importes discrepantes son violaciones aunque proveedor COMPLETE. Sin secretos/URLs sensibles. Objetivo cero violaciones, duplicados y falsos éxitos en casos ejecutados; sin garantía universal.

Hipótesis NO VERIFICADAS: cafetería reduce supervisión de reposición puntual; responsable de equipo evita compras no autorizadas o incompatibles; familiar conserva control de variante/destino al delegar. Sin claims de ahorro ni cumplimiento legal.

## Compuertas y cierre

Claude revisa este candidato; corregir P0/P1 y pedir verificación de cierre. Diego aprueba la versión revisada antes de crear `plan.md` y escribir código. Revisión técnica del núcleo sensible al final dentro del bloque 5, con hashes de archivos porque no hay commits autorizados; no sustituye revisión pre-push si se autoriza push posteriormente.

Sin topes de consumo acordados: registrar uso por fase como medido o n/m; no inventar topes ni disponibilidad. Sin git HEAD inicial, trabajar en checkout actual; no crear commit para generar worktree. Confinamiento técnico del revisor NO VERIFICADO; escritura limitada por instrucción al archivo asignado.

Al cierre: verificación posterior al último cambio, estado/continuidad, resultados reales, demo, pendientes y limitaciones. `plan.md` solo se marca cerrado cuando criterios aprobados se cumplen o Diego acepta por escrito el recorte restante; no marcar terminado si falta integración obligatoria sin esa decisión.

- 2026-10-09: timeout de creación de quote ampliado a 45 s tras cotización sandbox válida US de 18 934 ms (18.934 segundos); checkout/enrollment/consultas permanecen en 15 s. Ajuste técnico de latencia, sin cambio de presupuesto, permisos ni recuperación de pagos. La reducción de garantía de contenido sigue pendiente en ajuste-contrato-reap.md.

- 2026-10-09 22:27 CDMX: Diego aprobó avanzar con el plan de cierre y presentación: «Correcto, avancemos con el plan». Se adopta el ajuste de garantía documentado, controles de pago e intención de producto sin confirmación de contenido. Plazo de desarrollo/mejoras: una hora desde reanudación; registro antes de23:50CDMX (05:50UTC). Pulido de UI conserva indicador sandbox, detalle del entorno y advertencia de contenido en confirmación.
