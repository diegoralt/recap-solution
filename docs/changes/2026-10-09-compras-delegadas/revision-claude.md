# Revisión a ciegas del intent — Claude

- Fecha: 2026-10-09.
- Modelo efectivo: `claude-opus-5-5` (declarado por el entorno de la sesión). Esfuerzo efectivo: NO VERIFICADO.
- Entrada: `docs/changes/2026-10-09-compras-delegadas/intent.md`.
- Hash revisado: 6c25ab201a4ed380004da3fbe4e487c79bf73440 (`git hash-object` coincide con el esperado).
- Contexto leído: `spec.md`, `README.md`, `AGENTS.md`, `ESTADO.md`, CSV (hash `c8b026381af72ad4119e0770a165dc00fe3b9ecb`, 152 registros, coincide con `README.md:5` y `README.md:47`), `~/.claude/reference/forma-de-trabajo-ai-native.md` (Revisión cruzada, Modelo y esfuerzo). No se leyó `revision-codex.md`.

## Veredicto

Requiere cambios: dirección sólida y prudente con la evidencia, pero hay 3 P1 que Diego debe decidir o que deben precisarse en `sintesis.md` antes del plan candidato.

## Bloqueantes (P0/P1)

Sin P0.

### P1-1. Decisiones de Diego mezcladas con propuestas de Codex, incluida la exclusión de onchain

- **Escenario que falla:** el plan se construye sobre decisiones que Diego no tomó. Las citas piden información sobre onchain (`intent.md:9`), preguntan si existe un benchmark o si la decisión le toca a Diego (`intent.md:11`) y piden 2 casos de uso más con pruebas (`intent.md:13`). No aprueban construir la aplicación, los tres escenarios concretos ni la exclusión de onchain. Aun así, `intent.md:23` afirma que «Onchain no agrega valor identificado para la primera versión» y `intent.md:37` saca wallet/onchain/Kwal del alcance. Eso cierra el premio 3, «Mejor puente entre onchain y mundo real» (`README.md:39`), y descarta Kwal, que el bot declara alternativa válida (`README.md:22`). La categoría de premio sigue pendiente (`README.md:8`, `README.md:41`). `intent.md:17` advierte que es una propuesta, pero no separa qué está decidido y qué no.
- **Corrección necesaria:** en `sintesis.md`, listar como decisiones explícitas de Diego: (a) dirección «compras delegadas» (hoy solo «me parece», `intent.md:9`); (b) categoría de premio objetivo; (c) exclusión de onchain/Kwal y su motivo; (d) aceptación de los tres escenarios. La respuesta a la pregunta de `intent.md:11` (benchmark propio = matriz de controles, no evidencia de decisión comercial; la decisión es de Diego) debe quedar escrita.

### P1-2. «Aprobación aplicable» no es verificable y confunde la aprobación interna con la de Reap

- **Escenario que falla:** E1/E3 (`README.md:134`, `README.md:136`) pasan con una implementación que no liga la aprobación a nada comprobable. `intent.md:29` exige «aprobación aplicable a los términos finales» sin definir a qué se liga (quote ID, total, moneda, variante, dirección) ni qué identidad la emite. La identidad queda para el plan (`intent.md:44`), y la spec permite recortar la demo de roles (`spec.md:19`), alternativa que el intent no menciona. Además, todos los escenarios usan la tarjeta de prueba del equipo (`spec.md:14`) con OTP de prueba público para el equipo (`README.md:29`). La aprobación alojada de Reap no distingue quién aprueba (NO VERIFICADO, `README.md:117`). Por eso «tarjeta de quien autoriza» (`spec.md:27`) y «obtiene autorización» (`intent.md:21`) pueden presentarse en la demo como un control de identidad que no existe.
- **Corrección necesaria:** redactar el criterio así: «la revisión interna registra el hash de los términos finales (producto/variante, cantidad, dirección, moneda, total del quote, quote ID) y la identidad del aprobador. Un cambio en cualquiera de ellos la invalida». Declarar explícitamente una de dos: identidad verificable mínima o recorte de la demo de roles, con la limitación dicha en la demo. Precisar también que la aprobación de Reap con la tarjeta compartida demuestra autorización de pago en sandbox, no la identidad del responsable ni del dueño de la tarjeta.

### P1-3. Sin presupuesto de tiempo ni orden de recorte para la demo

- **Escenario que falla:** el hackathon anuncia unas cuatro horas de desarrollo (`README.md:43`, agenda NO VERIFICADA) y Diego tiene disponibilidad limitada (`intent.md:41`). La definición de terminado exige a la vez: tres escenarios, identidad del responsable, idempotencia con persistencia, consulta de estado, recotización, 16 casos ejecutados y demo (`intent.md:27-33`). Si no da el tiempo, el criterio es todo o nada y no dice qué se entrega. El riesgo es llegar sin el único recorrido sandbox obligatorio (`intent.md:30`) por haber invertido en escenarios o en identidad.
- **Corrección necesaria:** fijar un límite de tiempo y un núcleo ordenado no negociable, por ejemplo: (1) un recorrido completo en sandbox con consulta hasta estado final; (2) bloqueo por presupuesto/moneda (C2, T1, T2, H3); (3) T4/T5 sin duplicados ni éxitos falsos; (4) los demás escenarios con fixtures; (5) identidad o su recorte declarado. Indicar qué casos de la matriz se reportan «no ejecutado» si se recorta, en lugar de «ejecutar los 16» (`intent.md:32`).

## Debería (P2)

1. **Merchant del recorrido sandbox obligatorio.** El bot recomienda merchants de Estados Unidos (`README.md:24`). Dos de los tres candidatos son de mercado MX (`spec.md:25-26`; CSV líneas 3 y 20, `Market = MX`). La aceptación con las credenciales del equipo está NO VERIFICADA (`spec.md:29`). Elegir de antemano qué escenario intenta el recorrido sandbox obligatorio y un candidato de respaldo US que envíe a MX o a una dirección de prueba compatible.
2. **El escenario hogar quizá no pueda completarse.** Wild One cuesta 12 USD de referencia (CSV línea 149) con envío internacional a MX y límite de 35 USD (`spec.md:27`). `README.md:125` admite que puede bloquearse. Si ocurre, H1 nunca pasa y el escenario solo demuestra bloqueo. Declarar H1 como «resultado según quote» o preparar un límite alternativo, sin forzar el resultado.
3. **Evidencia medible para «cero envíos inválidos, duplicados y éxitos falsos»** (`intent.md:31-32`). Definir cómo se mide: cada llamada a checkout registrada con el resultado de validación y la clave de idempotencia; duplicados comprobados consultando a Reap por intento, no solo con logs locales; éxito solo con `COMPLETED` consultado (`README.md:69`). Sin esto, el criterio se reduce a autodeclaración.
4. **Quote que expira mientras se espera la aprobación interna.** La aprobación debe aplicarse a los términos finales (`intent.md:29`) y una quote expirada obliga a recotizar (T3, `README.md:142`). Si la aprobación del responsable tarda más que la vigencia de la quote (NO VERIFICADA), la demo entra en un ciclo sin fin. El plan debe fijar el orden de los pasos y qué cambios se consideran materiales (por ejemplo, el mismo total con otra quote ID).
5. **URL HTTPS de retorno y exposición.** Setup exige URL HTTPS (`README.md:66`; pendiente en `intent.md:43`). Un túnel o despliegue expone un servidor con la API key y choca con «Publicación de una demo requiere… compuerta» (`spec.md:43`). Decidirlo en el plan, con la compuerta de aprobación.
6. **El LLM no debe ser requisito de ningún criterio.** Los modelos disponibles están NO VERIFICADOS (`spec.md:51`). Conviene que el formulario (`spec.md:13`) cubra todos los criterios y que la interpretación por LLM sea opcional. T7 (`README.md:146`) solo se puede probar con fixtures: etiquetarlo así.
7. **Datos personales y secretos.** La «dirección del beneficiario» (`README.md:123`) debe ser una dirección ficticia de prueba. Agregar un criterio comprobable de «sin API key, OTP ni datos de tarjeta en logs/registros» (`AGENTS.md:25`); hoy el intent solo excluye datos crudos de tarjeta (`intent.md:37`).
8. **Hipótesis comercial explícita.** El intent dice qué no prometer (`intent.md:33`, `intent.md:41`) pero no enuncia la hipótesis (quién delega, qué dolor, quién pagaría). Lo evalúan el jurado («potencial comercial», `README.md:43`) y el premio 1 (`README.md:37`). Escribirla como hipótesis no verificada, una línea por escenario.

## NO VERIFICADO

- Esfuerzo efectivo de esta revisión.
- Acceso del equipo a Reap sandbox: credenciales, host (`mx.sandbox` frente al alias de Singapur), `Reap-Version`, endpoints, mandatos, vigencia de quotes, aceptación de los merchants/variantes/destinos/monedas de los tres escenarios (`README.md:67`, `README.md:71`, `spec.md:29`).
- Si la aprobación alojada o el retorno de Reap permiten identificar al aprobador (`README.md:117`).
- Si existe un mecanismo de idempotencia de Reap para checkout aplicable al caso de doble clic (`README.md:68` lo menciona sin detalle). No se consultó la documentación del proveedor en esta revisión.
- Agenda real del hackathon, duración de desarrollo, formato de demo y categorías de premio vigentes (`README.md:41`, `README.md:43`).
- Demanda, disposición a pagar y ahorro de tiempo (`intent.md:41`).
- Confinamiento técnico de escritura de este revisor: la restricción a un solo archivo se cumplió por instrucción, no por mecanismo (`CLAUDE.md`).
