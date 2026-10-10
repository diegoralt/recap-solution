# Demo de compras delegadas

Estado: app local implementada; credenciales aceptadas para enrollment y cotización sandbox. Registro de tarjeta ACTIVE y recorrido completo alojado pendientes. No afirmar integración comprobada a partir de fixtures.

## Arranque

Requiere Node 24. Sin dependencias de runtime ni build. Desde `recap-solution`:

```sh
npm run verify
npm start
```

Default local: `http://localhost:3000`. `.env.local` ya se preparó con dos contraseñas aleatorias distintas y permisos 0600; está ignorado por Git. Abre ese archivo local en tu editor para obtener las contraseñas de `solicitante` y `responsable`. No copiarlas al chat, documentos, logs ni capturas. Si el archivo no existe en otra máquina, usar `.env.example` como plantilla y definir dos contraseñas distintas de al menos 16 caracteres; no sobrescribir un `.env.local` existente.

Usar dos perfiles o navegadores, cada uno con su propia sesión. Las cuentas son identidades de demo; no verificación legal ni titularidad de tarjeta.

## Conectar Reap

En `.env.local`, configura API key y base URL entregadas por el equipo. Solo se aceptan los hosts sandbox de Reap previstos. Añade `REAP_VERSION` según el equipo: es un header obligatorio según [versioning oficial](https://docs.reap.global/api-reference/versioning). No inferir una versión habilitada por la forma de la clave.

Para sandbox cambia:

```dotenv
APP_MODE=sandbox
APP_ORIGIN=https://localhost:3443
```

Mantén las contraseñas locales existentes. `DEMO_EMAIL` debe ser un email de prueba válido. `REAP_ENROLLMENT_ID` queda vacío si solo te entregaron API key y tarjeta.

```sh
npm run tls
npm run preflight
npm start
```

Detén con Ctrl+C el proceso anterior antes de reiniciar con la configuración nueva. No se lee configuración nueva en caliente. En sandbox, entrar y operar solo en `https://localhost:3443`; no alternar HTTP, IP o hostname. El certificado es local autofirmado de siete días: autoriza manualmente la excepción del navegador para localhost, sin instalar confianza global. La validación TLS saliente a Reap permanece activa.

Entra como responsable y pulsa **Registrar en Reap**. Luego **Continuar en Reap** abre su página alojada. Introduce allí número, vencimiento, CVV y OTP según indicaciones del equipo. No introducir esos datos en Recap ni en `.env.local`. Después pulsa **Consultar tarjeta** hasta comprobar ACTIVE. Las llamadas de registro conservan identidad/idempotencia si se pierde la respuesta.

`npm run preflight` no crea checkout ni compra. Sin enrollment configurado informa que falta registro; no demuestra que la API key tenga permisos. Comprobación efectiva: registro alojado, consulta ACTIVE, quote y checkout reales de sandbox.

La aceptación de returnUrl localhost está NO VERIFICADA hasta la primera operación alojada. Si Reap lo rechaza, documentar el error y preparar alternativa de exposición autenticada para aprobación de Diego. No abrir túnel ni publicar por este documento. Mientras tanto, fixtures e integración pendiente.

## Guion de 3 minutos

1. **Problema (20 s):** «Delegar una compra no debería significar entregar control sobre presupuesto, producto o destino». Contexto de transición digital, sin prometer cumplimiento de legislación.
2. **Solicitud (30 s):** solicitante elige cafetería, dos bolsas, 800 MXN total, dirección ficticia MX y características de la variante. Crear y cotizar. CSV es referencia; se revisa total con envío e impuestos.
3. **Confianza (50 s):** responsable revisa producto, cantidad, destino, moneda y total; autoriza términos. Solicitante no autoriza. Si cambian, aprobación anterior no sirve. Preparar pago y aprobar en Reap cuando haya sandbox alojado disponible.
4. **Resultado (30 s):** consultar estado hasta COMPLETED. Retorno de navegador no es éxito. En fixture usar botón explícito **Simular aprobación · fixture** y decir que no se llamó a Reap.
5. **Bloqueo (30 s):** nueva solicitud de cafetería con límite 650 MXN. Fixture: productos 600 + envío 90 = 690, por lo que bloquea. No llega a checkout. Precio de sandbox puede ser distinto.
6. **Extensiones (20 s):** equipo solicitado por colaborador y compra de variante Lilac para familiar usan los mismos controles; indicar evidencia disponible por contexto.

Un intento FAILED/EXPIRED se cierra. Una compra nueva requiere solicitud y aprobación nuevas. UNKNOWN no habilita otra compra: consultar/recuperar el mismo intento o conciliar con proveedor.

## Qué mostrar y qué no afirmar

- Fixtures, `sandbox-simulado` y `sandbox-aprobación-alojada` son categorías de evidencia distintas; simulación Reap está deshabilitada por diseño. Solo aprobación alojada seguida de GET COMPLETED conforme satisface recorrido integrado.
- Actualmente es un flujo asistido por herramientas deterministas; no contiene LLM. Confirmar requisito de agente/LLM con organizadores antes de declarar elegibilidad.
- Presupuesto por solicitud, no saldo agregado ni reservas mensuales. Dinero y entrega son simulados en sandbox.
- Demanda, disposición a pagar, ahorro y efectos de una ley: NO VERIFICADOS. La matriz evalúa controles, no impacto comercial.

## Garantía de la demo

Reap externalCheckout confirma total/vigencia, pero no devuelve ítems. Producto/cantidad/atributos son intención enviada, no contenido confirmado por Reap. Presentar el resultado como pago confirmado por importe/moneda/estado, sin afirmar producto o entrega conforme. C3/H1/E2 son pruebas locales. El ajuste está pendiente de aprobación de Diego antes del checkout real: `docs/changes/2026-10-09-compras-delegadas/ajuste-contrato-reap.md`. Versión inicial de API: `2025-02-14`, según documentación oficial de overview; puede cambiarse si el equipo proporciona otra versión.

Si un enrollment termina FAILED/EXPIRED/REVOKED, el responsable puede registrar otro desde la app. Si REAP_ENROLLMENT_ID está fijado en configuración, vaciar ese campo y reiniciar antes de registrar otro; nunca borrar la BD de compras para renovar tarjeta.

Respaldo probado: abchome.com, Amiko End Table, cantidad 1, límite 350 USD, destino US. Cotización observada: 303.77 USD; recotizar antes de aprobar porque vence. Café devolvió QUOTE_UNFULFILLABLE. Creación de cotización tiene margen 45 s; pagos, registros y consultas mantienen 15 s.
