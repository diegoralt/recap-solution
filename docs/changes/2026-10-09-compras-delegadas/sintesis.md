# Síntesis del intent: compras delegadas con confianza

- Fecha: 2026-10-09. Codex planifica/implementa; Claude revisa/verifica.
- Hash de entrada: `6c25ab201a4ed380004da3fbe4e487c79bf73440`. Comprobado después de ambas revisiones; coincide.
- Estado: decisiones D1/D2/D3 confirmadas por Diego; listo para plan candidato. No autoriza implementación sin revisión y aprobación del plan.

## Índice y autoridad

`intent.md` es la entrada congelada. `revision-codex.md` es la revisión propia del planificador, escrita antes de consultar a Claude; no es validación independiente. `revision-claude.md` es la revisión independiente a ciegas del mismo hash. Esta síntesis registra acuerdos y decisiones pendientes. `spec.md` es la fuente del producto, todavía provisional; `README.md` contiene contexto y 16 pruebas propuestas, NO EJECUTADAS.

No existen `plan-candidato.md` ni `plan.md`. El primero requiere resolver estos desacuerdos; el segundo, revisión y aprobación explícita de Diego.

## Autorización y propuestas

Diego pidió avanzar en la preparación, expresó preferencia por compras delegadas con confianza, pidió dos casos adicionales y autorizó invertir los roles (`intent.md:9`, `intent.md:13`, `intent.md:15`). Esto permite preparar y revisar artefactos; no aprueba cada merchant, arquitectura, categoría o exclusión de onchain.

Son propuestas pendientes: Reap como única integración de v1, posponer Kwal/onchain, los escenarios cafetería/equipo/hogar y sus presupuestos de ejemplo (`intent.md:17`, `intent.md:23`, `intent.md:37`; `spec.md:25`). Categorías definitivas del evento: NO VERIFICADAS.

Los benchmarks y la matriz justifican evaluar controles; no demuestran demanda, ahorro de tiempo ni disposición a pagar. Diego decide construir la hipótesis para el hackathon; no se exige completar entrevistas antes del evento.

## Coincidencias y discrepancias

Ambas revisiones piden priorizar un recorrido, ligar aprobación a términos, resolver identidad, persistencia e idempotencia y separar fixtures de sandbox (`revision-codex.md:20`, `revision-codex.md:21`, `revision-codex.md:22`, `revision-codex.md:23`; `revision-claude.md:25`, `revision-claude.md:30`, `revision-claude.md:36`).

Codex no identificó P1 al entender que esos contratos se resolverían en el plan (`revision-codex.md:16`). Claude identificó tres P1: alcance sin decisión, autorización ambigua y tiempo sin límite (`revision-claude.md:17`, `revision-claude.md:22`, `revision-claude.md:27`). Se acepta resolverlos antes del plan candidato; no se descartan por ser sandbox.

## D1 — Alcance y categoría (P1-1)

**Recomendación:** confirmar compras delegadas con confianza; conservar cafetería, equipo y hogar como hipótesis de una misma app, con un recorrido principal y dos escenarios adicionales. Usar Reap en v1 y posponer Kwal/onchain. Orientar la presentación al problema que vale la pena resolver, sujeto a confirmar la categoría oficial.

Esto concentra la demo en presupuesto, términos, autorización y resultado. Wallet/contrato exige otra integración y pruebas, sin requisito de producto identificado que la necesite ahora. Supone renunciar a competir por el puente onchain en v1; no significa que onchain carezca de valor.

Alternativa: exigir Kwal/onchain y reformular el alcance antes del plan. **Decisión de Diego: recomendación aceptada el 2026-10-09.**

## D2 — Quién autoriza y qué autoriza (P1-2)

**Recomendación:** identidad mínima de demo validada en servidor, sesiones separadas para solicitante y responsable y permisos comprobados en servidor. Cuentas de prueba; sin afirmar identidad legal ni titularidad de tarjeta. Mecanismo concreto sujeto a revisión del plan.

La aprobación interna registrará al aprobador y un hash de términos finales: producto/variante, cantidad, dirección de prueba, moneda, total cotizado y quote ID. Cualquier cambio la invalida. Una quote expirada requiere recotizar y aprobar nuevamente. Antes de checkout se comprobarán identidad/permisos, aprobación vigente y restricciones.

La aprobación alojada de Reap demuestra autorización de pago en sandbox. Tarjeta compartida y OTP de prueba no demuestran identidad del responsable ni del dueño de la tarjeta; se explicará en la demo (`revision-claude.md:24`).

Alternativa: un solo usuario confirma términos, declarando que la delegación entre personas no está implementada. **Decisión de Diego: identidad mínima de demo aceptada el 2026-10-09.**

## D3 — Tiempo y orden de entrega (P1-3)

Tiempo de desarrollo: **5 horas**, confirmado por Diego. El plan distribuye 300 minutos e incluye verificación y demo; no se toma la agenda no verificada como disponibilidad personal.

**Prioridad recomendada:**

1. Comprobar acceso y merchant/variante/destino compatibles; completar un recorrido real consultando estado final. Sin acceso, usar fixtures y declarar integración no verificada.
2. Incluir controles necesarios para ese recorrido: D2, presupuesto/moneda, persistencia y protección contra duplicados. No activar checkout sin ellos. Priorizar C2, T1, T2, H3, T4 y T5, además del éxito.
3. Mostrar los otros contextos con fixtures identificados. Recortar adornos, LLM y automatización adicional antes que controles.
4. Ampliar al resto de los 16 casos y preparar presentación. Prueba omitida = NO EJECUTADA. Un fallo de control impide afirmar que el recorrido es seguro; no se oculta como recorte.

**Decisión de Diego: prioridad aceptada; 5 horas.** Cita textual del 2026-10-09: «El tiempo de desarrollo es de 5 horas, alineado con las recomendaciones». Responde a D1/D2/D3 de la síntesis y a las recomendaciones presentadas en el chat. No equivale a aprobar una arquitectura todavía no revisada.

## Mapa de hallazgos a futuros pasos y verificación

Este mapa indica cobertura requerida del futuro plan; no constituye plan candidato ni aprobación.

| Hueco | Paso que debe definir el plan | Evidencia prevista |
|---|---|---|
| Alcance/hipótesis | Incorporar D1 y una hipótesis por contexto | Decisión escrita; sin claims de demanda comprobada |
| Identidad y aprobación | Concretar D2, permisos y términos | Solicitante no aprueba; E1/E3; cambios invalidan aprobación |
| Tiempo | Incorporar D3 y bloques con recortes | Casos ejecutados/no ejecutados |
| Merchant/presupuesto hogar | Principal y respaldo US con destino compatible | Quote real; H1 según restricciones, sin forzar éxito |
| Duplicados/estado incierto | Confirmar contrato del proveedor y persistir intento | T4/T5; registros de validación y reconciliación con proveedor |
| Quote expirada | Orden cotización/aprobación/checkout | T3; sin reutilizar aprobación anterior |
| HTTPS | Acceso de demo y compuerta de publicación | Configuración revisada; permiso antes de publicar |
| LLM | Formulario funcional; interpretación opcional | Recorrido sin LLM; T7 fixture si aplica |
| Datos/secretos | Dirección ficticia y registros mínimos | Sin claves, OTP ni datos de tarjeta en logs/documentos |

## Estado de cierre

Sin P0 reportados; los tres P1 del intent se resuelven mediante D1/D2/D3 y se concretan en el plan candidato, sujeto a revisión. Sin implementación ni pruebas ejecutadas. Acceso efectivo del sandbox, categorías/agenda oficiales, demanda comercial y confinamiento técnico del revisor: **NO VERIFICADOS**.

Terminal de Claude cerrada después de comprobar el archivo. Próxima fase en sesión nueva. No commits, push, merges ni publicación.
