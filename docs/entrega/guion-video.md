# Video de Recap · duración objetivo 2:30–3:00

## Antes de grabar

Abrir dos perfiles/navegadores: solicitante y responsable, cada uno con su sesión. Evitar mostrar .env.local, login con contraseña visible, tarjeta, CVV, OTP y URL alojada completa. No capturar el formulario de tarjeta. Mantener visible el indicador Sandbox. Usar títulos y nombres de casos; distinguir video de resultados reales frente a simulación local.

Recorrido principal de integración: respaldo US abchome.com, Amiko End Table,1unidad, límite350USD, dirección ficticia NewYork/NY/10001. Recotizar:303.77USD fue una observación previa, no precio garantizado. Café devolvió QUOTE_UNFULFILLABLE; no depender de él para el camino exitoso.

## Narración y pantallas

0:00–0:20 · Login o bandeja
“Recap permite delegar una compra sin convertir una instrucción en permiso para gastar. El solicitante prepara la petición; el responsable conserva la autorización del pago.”

0:20–0:55 · Solicitud y cotización
“Definimos producto, cantidad, destino y presupuesto. Reap devuelve el total final. Este presupuesto se valida en el servidor, incluidos los costos cotizados de envío.”
Mostrar total y límite. Si el costo excede el límite, enseñar el bloqueo; no modificar el límite con el solicitante.

0:55–1:25 · Cambiar a responsable
“El solicitante no puede autorizar. El responsable revisa los términos y los aprueba. Cambiar cantidad, destino o límite invalida la autorización anterior.”
Mostrar aprobación, registro y una modificación en una solicitud separada que todavía no tenga intento checkout.

1:25–2:05 · Reap
“Los datos de tarjeta se registran directamente en Reap. Después de aprobar estos términos, el pago requiere su aprobación alojada.”
Mostrar solo enlace/botón y regreso a la app. Omitir toda entrada de tarjeta/OTP del video. Confirmación final solo si se observa en la API: GET COMPLETED, importe/moneda y orden. Si queda pendiente, decir “Este es el último estado observado; la app no lo cuenta como pago completado”.

2:05–2:35 · Resultado y actividad
“El regreso al navegador no es prueba de pago. Consultamos a Reap. Ante una respuesta incierta, conservamos el mismo intento y la misma clave para evitar crear otro checkout.”
No simular fallo real ni repetir pagos durante la grabación. Explicar la recuperación mostrando registro y evidencia de pruebas, sin afirmar que se provocó un fallo en sandbox.

2:35–3:00 · Cierre
“Un mismo flujo cubre reposición de cafetería, compras para un colaborador y necesidades del hogar. Construimos control de autorización e importe. Reap no devuelve confirmación de producto o cantidad en la cotización, y hacemos ese límite explícito.41 pruebas locales verifican los controles; el siguiente paso es evaluar utilidad con usuarios reales.”

## Si no hay pago completo a tiempo

Grabar la cotización real y la aprobación interna; mostrar el estado pendiente con su texto. Una secuencia de simulación local debe llevar el indicador Prueba local y narración explícita. No editar escenas para sugerir que una compra simulada fue confirmada por Reap. Priorizar un video honesto y accesible sobre una grabación incompleta sin enlace al cierre.

## Envío

Subir video a YouTube no listado o Drive con acceso para jueces. Verificar reproducción desde otra sesión. No enviar archivo sin enlace si el formulario pide URL. Guardar confirmación/folio del registro y captura del envío sin credenciales.
