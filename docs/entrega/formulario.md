# Registro del proyecto · Reap × AI Builders México

Límite confirmado por Diego: 9 de octubre de 2026, 23:50 CDMX (10 de octubre, 05:50 UTC). Objetivo interno: material terminado23:27, formulario revisado23:35, envío23:40; conservar10min de margen. No se ha enviado el formulario.

## Campos

| Campo | Valor preparado | Pendiente |
|---|---|---|
| Team name | Recap (propuesta) | Confirmar nombre del equipo |
| Team captain | — | Nombre público de Diego |
| Contact email | — | Correo de contacto; no usar email técnico del sandbox |
| Project link | https://github.com/diegoralt/recap-solution | URL que realmente puedan abrir los jueces; localhost no sirve remotamente |
| Demo video link | — | Grabar y subir video; probar acceso sin la cuenta del autor |
| Team members | Opcional | Nombres de integrantes o dejar vacío si corresponde |
| Sponsor prize eligibility | Reap – Most Worthwhile Problem | Seleccionar solo este track |

No seleccionar “Best Bridge Between Onchain and Real World”: la versión entregada no implementa wallet, stablecoins ni contratos onchain.

## Project description · texto en inglés listo para pegar

Recap helps small teams delegate purchases while keeping control over approval and spending. A requester defines what is needed, the quantity, delivery address and budget. A separate responsible person reviews the final quoted amount, authorizes those terms and completes the payment approval through Reap.

The problem is the gap between asking someone or an automated system to buy something and safely giving it permission to spend. Recap makes that permission explicit and tied to a specific request, instead of treating a purchase instruction as payment authorization.

We built one workflow for three contexts: replenishing a cafe, purchasing equipment for a colleague and buying supplies for a household. The implementation includes separate requester and approver sessions, merchant and destination restrictions, currency and budget checks, quote expiration, approval invalidation when terms change, persistent checkout idempotency and a purchase activity log. Card details are entered only on Reap's hosted page and never pass through our application or an AI model.

Reap Agentic Payments provides the hosted card enrollment, final quotes and payment checkout. Recap queries Reap to determine payment status; a browser redirect alone does not count as success. Uncertain responses keep the same purchase intent so recovery does not create another checkout.

Judges should focus on three moments: a request that exceeds its budget is blocked; the requester cannot approve or pay their own request; and changing the purchase terms invalidates the previous approval. The key contribution is a controlled execution layer for delegated purchasing, with explicit permission and recoverable payment handling.

The current version uses a deterministic workflow rather than an LLM planner. Reap sandbox enrollment and a live sandbox quote of USD303.77 have been exercised, and41 automated local tests pass. Hosted payment completion remains unverified: two sandbox checkouts (USD303.77 and USD23.96) were created and reached Reap's hosted payment step, but both ended FAILED without a reason in Reap's response, so no completed payment is claimed. Reap's externalCheckout quote response does not echo cart contents: product, variant and quantity are recorded as submitted intent, while amount and quote validity come from Reap. We make that distinction explicit at approval. No commercial impact, legal compliance or production readiness is claimed.

## Descripción en español · alternativa

Recap permite delegar compras conservando el control del presupuesto y la autorización. Una persona define qué necesita, cuánto puede gastar y dónde debe entregarse; otra revisa el total cotizado y autoriza esos términos antes de aprobar el pago en Reap.

Resolvemos la distancia entre pedir una compra y dar permiso para gastar. La autorización queda vinculada a una solicitud concreta: cambiar sus términos exige aprobar de nuevo. Un mismo flujo sirve para reposición de una cafetería, equipo para un colaborador y compras del hogar.

Construimos cuentas separadas para solicitante y responsable, restricciones de comercio y destino, controles de moneda y presupuesto, vencimiento de cotizaciones, registro de actividad y recuperación de pagos con claves de idempotencia persistentes. Los datos de tarjeta se introducen directamente en la página alojada de Reap; nunca pasan por nuestra aplicación ni por un modelo.

La integración utiliza Reap Agentic Payments para registrar la tarjeta, cotizar y preparar el pago. El resultado se consulta al proveedor: regresar al navegador no confirma el pago. Ante incertidumbre, se recupera el mismo intento para evitar crear otro checkout.

Pedimos al jurado observar tres controles: una compra que excede el presupuesto se bloquea; el solicitante no puede autorizar ni pagar; modificar los términos invalida la aprobación anterior. El aporte es una capa de ejecución con permisos explícitos para compras delegadas.

La versión actual utiliza un flujo determinista, sin planificador LLM. Se comprobaron el registro de tarjeta (ACTIVE) y cotizaciones sandbox de303.77USD;41 pruebas automatizadas locales pasan. El pago alojado completo sigue sin verificarse: dos checkouts sandbox (303.77 y 23.96 USD) llegaron al paso de pago alojado de Reap, pero ambos terminaron FAILED sin motivo en la respuesta; no afirmamos un pago completado. Reap confirma importe y vigencia de la cotización, pero no devuelve el contenido del carrito: producto, variante y cantidad representan la intención enviada. Esa diferencia se muestra al autorizar. No afirmamos impacto comercial medido ni cumplimiento legal.

## Actualización obligatoria antes de pegar

Si se completa el recorrido alojado, reemplazar “Hosted payment completion remains to be verified” por “A hosted sandbox payment was completed and confirmed through a Reap status query”, solo después de comprobar GET COMPLETED, importe/moneda conformes, orden y aprobación alojada. Actualizar español igual. Si no se completa, conservar la versión honesta y grabar hasta el último paso efectivamente observado.

## Acceso de jueces

La app tiene login; eso permite restringir funciones a cuentas invitadas, pero no constituye una allowlist verificada de jueces. Dos cuentas compartidas dan acceso por rol, no por identidad de cada juez. No publicar credenciales en descripción, repositorio o video. Compartir acceso únicamente por el canal privado permitido por organizadores.

Actualmente solo localhost. Antes de publicar necesitamos un destino concreto, origen HTTPS y revisar los controles de Host/Origin, cookies y almacenamiento. No hay despliegue autorizado ni enlace remoto disponible. Alternativa preparada: archivo de código sin secretos + video accesible a los jueces; confirmar que un enlace a ese material satisface Project link antes de enviarlo.
