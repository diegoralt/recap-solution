# Ajuste propuesto ante el contrato de Reap

Estado: aprobado por Diego el 2026-10-09 en el chat: «Correcto, avancemos con el plan», después de detallar la garantía reducida y las tareas de entrega. El plan aprobado y su hash se conservan como antecedente, sin reescritura retroactiva.

## Evidencia

Documentación oficial descargada el 2026-10-09: [Create quote](https://docs.reap.global/api-reference/agentic/create-quote.md) y [Get quote](https://docs.reap.global/api-reference/agentic/get-quote.md). El esquema 200 describe `id`, `shippingOptions`, `amountBreakdown` y `expiresAt`; no devuelve ítems, variante, cantidad ni atributos. El adaptador externalCheckout envía dominio, permalink con variante/cantidad y dirección. Eso acredita intención enviada, no confirmación del contenido por el proveedor.

[Create checkout](https://docs.reap.global/api-reference/agentic/create-checkout.md) sí exige `quoteId` y `enrollmentId` en la respuesta. Se conserva esta validación en POST. [Get checkout](https://docs.reap.global/api-reference/agentic/get-checkout.md) declara el eco opcional: se exige el mismo ID y una vinculación previa comprobada con quote/enrollment; cualquier eco presente debe coincidir. Un POST sin vinculación no puede validarse mediante un GET que también omita el eco.

## Propuesta para las cinco horas

Conservar los tres casos, Reap sandbox, dos roles, autorización ligada a términos, total final, moneda, vigencia, consulta GET e idempotencia. Cambiar la promesa de aceptación a **delegación con control de autorización e importe**. El contenido del carrito se envía según CSV/solicitud, pero queda expresamente no confirmado por Reap.

- UI de cotización y confirmación: «Producto, variante, cantidad y características enviados; no confirmados por Reap».
- UI final y métricas: «Pago confirmado» y «Pagos conformes», exclusivamente por GET COMPLETED, orden, importe/moneda y aprobación alojada observada; no afirmar compra/entrega conforme.
- Quote lleva `productEvidence: request-only`; la procedencia entra en el hash de autorización. Una respuesta que añade ítems contradictorios se bloquea; una sin ítems nunca se etiqueta como contenido confirmado.
- C3, H1 y E2 permanecen como pruebas locales/fixture. No cuentan como evidencia sandbox de producto/cantidad/atributos.
- No scraping, otro proveedor ni onchain para intentar cubrir esta carencia dentro del plazo.

Alternativa: conservar la exigencia original de confirmar producto/cantidad desde Reap, deshabilitar checkout real hasta conseguir del organizador un contrato/API que lo permita, y presentar solo el prototipo local. No satisface el recorrido integrado previsto.

## Qué cambia en aceptación

El pago sandbox alojado sigue siendo obligatorio, pero deja de demostrar conformidad de contenido de compra. Es una reducción explícita de garantía respecto al criterio de validar productos/cantidades del plan. Requiere aprobación del dueño según AGENTS.md y forma de trabajo AI-native; la revisión técnica por sí sola no la autoriza.

## Verificación preparada

`npm run verify`: pruebas de intención sin eco, carrito contradictorio, JSON 2xx cortado/abortado con misma clave/body, ID conservado sin eco, GET incoherente sin éxito/enlace, evidencia solo al finalizar, permisos y enrollment. Revisión independiente solicitada en `verificacion-implementacion-claude.md`.
