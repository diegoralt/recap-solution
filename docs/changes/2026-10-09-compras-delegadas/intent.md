# Compras delegadas con presupuesto verificable

- **Pidió:** Diego · 2026-10-09 · chat.
- **Por qué es mediano:** permisos de aprobación y control de gasto; integración de compras/pagos sandbox. No se mueve dinero real.
- **Estado:** entrada para revisión a ciegas; no plan aprobado.

## Lo que se pidió

> Me parece que el enfoque de la solución con la problematica que mencionamos iria más apegado a delegar compras con confianza, solo para tener más contexto, dame más información sobre onchain

> En mi estado actual y con el tiempo para prepararme para el hackathon no llegaría con las entrevistas, algún benchmak que nos ayude con la decisión o es necesario tomar la decisión de mi lado?

> Podemos elegir otros 2 casos de uso con los cuales robustecer la solución, casos de uso y pruebas?

> Por el momento estamos intercambiando los papeles invirtiendo las responsabilidades de Claude y Codex, toma en cuenta este ajuste para avanzar con las estapas propuesta arriba

Las citas son textuales del chat. Los detalles siguientes son una propuesta de concreción de Codex basada en la conversación, no citas ni una aprobación implícita de implementación.

## Resultado propuesto

Una aplicación que recibe una compra explícita, interpreta sus condiciones, valida la propuesta y cotización por código, obtiene autorización y registra el resultado confirmado por Reap. Tres escenarios comparten el flujo: cafetería, equipo solicitado por colaborador y compra para familiar.

Reap Agentic Payments es la integración prevista. Todo ocurre en sandbox y en merchants compatibles del CSV. Onchain no agrega valor identificado para la primera versión.

## Qué cuenta como terminado

- Usuario ve producto/variante, cantidad, dirección, moneda, total final y límite antes de autorizar; datos inciertos se aclaran, no se inventan.
- Una compra que incumple presupuesto, moneda, proveedor, destino, especificación o autorización no alcanza checkout.
- Hay aprobación aplicable a los términos finales. Si cambian, se revisan de nuevo. El colaborador no puede aprobar por el responsable mediante un selector de rol.
- Se comprueba al menos un recorrido completo con Reap sandbox. Cada escenario adicional se identifica como probado con fixtures, integrado o pendiente según evidencia.
- Timeout/doble clic no crea una segunda compra. Retorno del navegador o estado pendiente no cuentan como éxito.
- Se ejecutan y reportan 16 casos del README, o su reemplazo revisado, con resultados de fixtures separados de resultados sandbox. Objetivos en casos ejecutados: cero envíos inválidos, duplicados y éxitos falsos; no son garantías universales.
- Demo presenta compra completa, bloqueo comprensible y evidencia, sin prometer ahorro o demanda no medidos.

## Fuera de alcance propuesto

Inventario predictivo, automatización periódica, wallet/onchain/Kwal, cobros SPEI/CoDi, CFDI, validación de CURP, producción, dinero real, scraping del checkout y datos crudos de tarjeta en el LLM o servidor.

## Restricciones y dudas para revisión

- Disponibilidad limitada antes del hackathon: sin entrevistas previas; evidencia secundaria y benchmark propio. NO VERIFICADO: demanda, disposición a pagar y ahorro de tiempo.
- CSV preservado: `c8b026381af72ad4119e0770a165dc00fe3b9ecb`; productos, precios y variantes son referencias, no disponibilidad/cotización confirmadas.
- Credenciales, host, versión, tarjeta y URL HTTPS pendientes. Si no hay acceso, se avanza en pruebas locales sin declarar integración verificada.
- Identidad del responsable, aprobación interna, persistencia/idempotencia y stack son decisiones del plan. Deben resolverse antes de implementar el flujo sensible.
- Presupuesto inicial por solicitud; presupuesto agregado por periodo queda fuera hasta diseñar reservas/persistencia.
- Revisión a ciegas del intent, síntesis y revisión del plan con roles invertidos. Diego aprueba el plan antes del código. No commits, push ni merges en esta autorización.

## Entradas de contexto

`spec.md`, `README.md`, `AGENTS.md`, `CLAUDE.md` y CSV original. Proceso base: `~/.claude/reference/forma-de-trabajo-ai-native.md`, con excepción local de roles autorizada en este chat.
