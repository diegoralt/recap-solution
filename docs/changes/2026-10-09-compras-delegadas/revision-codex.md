# Revisión del intent — Codex

- Fecha: 2026-10-09.
- Revisor: Codex (basado en GPT-6); identificador exacto y esfuerzo efectivos: NO VERIFICADOS en esta sesión.
- Hash revisado: `6c25ab201a4ed380004da3fbe4e487c79bf73440`.
- Hash comprobado con `git hash-object`; coincide con la entrada congelada para esta revisión.
- Modalidad: revisión propia del planificador en la fase a ciegas prevista por el proceso; no es validación independiente. No se consultó una revisión de Claude.

## Veredicto

Intent apto para revisión cruzada y síntesis, sin P0/P1 identificados en la definición; no autoriza implementar ni confirma viabilidad del proveedor.

## Bloqueantes (P0/P1)

Ninguno identificado para el intent. Los contratos de identidad, autorización e idempotencia deben concretarse en el plan antes de código sensible, como requiere `intent.md:44`.

## Debería (P2)

1. **Prioridad de demo:** elegir un escenario principal y separar claramente los dos adicionales como pruebas de restricciones. `intent.md:21` define tres escenarios y `intent.md:30` exige un recorrido completo: la síntesis debe convertir esa diferencia en una secuencia explícita para no dispersar el tiempo.
2. **Identidad y retorno:** el plan debe explicar quién es el responsable, cómo se valida su identidad en servidor y qué evidencia del proveedor confirma el pago. `intent.md:29` rechaza el selector de rol como autorización; `intent.md:31` rechaza el retorno como éxito. Un enlace de retorno o una aprobación interna no demuestran por sí mismos identidad del pagador.
3. **Cambios de términos:** el plan debe ligar aprobación interna a producto/variante, cantidad, destino, moneda y total final y precisar qué cambios la invalidan (`intent.md:27`, `intent.md:29`). Validar otra vez inmediatamente antes de checkout.
4. **Resultado incierto:** concretar un registro persistente del intento y su clave de idempotencia antes del envío, y tratamiento de concurrencia/reinicio (`intent.md:31`, `intent.md:44`). El presupuesto por solicitud evita por ahora la complejidad del saldo agregado (`intent.md:45`).
5. **Acceso externo:** definir configuración server-side y acceso limitado para una URL HTTPS de demo sin interpretarla como permiso de producción (`intent.md:37`, `intent.md:43`). Capturar mínimos datos y no registrar credenciales, enlaces sensibles ni direcciones completas sin necesidad.
6. **Evidencia de evaluación:** congelar fixtures de comparación y separar datos locales de resultados reales; no atribuir ahorro de tiempo/demanda a la matriz (`intent.md:32`, `intent.md:33`, `intent.md:41`). La disponibilidad de merchants debe comprobarse pronto (`intent.md:42`).

## NO VERIFICADO

- Claude no ha emitido su revisión independiente al redactar este archivo.
- Credenciales, tarjeta, host/versión, URL HTTPS y aceptación de productos, monedas y destinos.
- Autenticación, persistencia, bloqueo concurrente e idempotencia: no hay implementación ni plan candidato.
- Los 16 casos están diseñados, no ejecutados (`README.md`, sección Matriz de pruebas propuesta).
- Demanda comercial, disposición a pagar y ahorro de tiempo (`intent.md:41`).
- Hooks, allowlist y confinamiento técnico de la revisión. Instrucciones por archivo no equivalen a sandbox.
- Modelo exacto/esfuerzo efectivos y consumo de presupuesto de modelos; no se atribuyen valores ficticios.
