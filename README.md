# Recap — compras delegadas con presupuesto verificable

Reap × AI Builders México. Un solicitante pide una compra con presupuesto; un responsable distinto autoriza el total cotizado y aprueba el pago en la página alojada de Reap. Solo sandbox.

## Inicio rápido (modo fixture, sin credenciales)

Requiere Node 24, sin dependencias.

1. `cp .env.example .env.local`
2. `npm start` y abre http://localhost:3000
3. Entra como `solicitante` o `responsable` con las contraseñas de `.env.local` (valores de ejemplo en `.env.example`).
4. Pruebas: `npm run verify` (41 pruebas).

El modo fixture simula el proveedor localmente; no demuestra la integración con Reap. Para sandbox real, descomenta el bloque de Reap en `.env.example`, usa tus propias credenciales y ejecuta `npm run tls` antes de `npm start` (https://localhost:3443).

## Estado honesto

Comprobado en sandbox de Reap: registro de tarjeta ACTIVE, cotizaciones, autorización y creación de checkout con pago alojado. Dos checkouts terminaron FAILED sin motivo en la respuesta de Reap; **no hay pago COMPLETED**. Detalle en [docs/resultados.md](docs/resultados.md). Sin planificador LLM: flujo determinista. Los datos de tarjeta solo se introducen en Reap.

Licencia: MIT.

---

# Reap × AIBM — espacio de trabajo

Contexto revisado el 2026-10-09. Carpeta solicitada: `recap-solution`.
Entrada local: `Reap - List of Supported Merchant - All Supported Merchants.csv`.
Hash calculado con `git hash-object`: `c8b026381af72ad4119e0770a165dc00fe3b9ecb`.
No se proporcionó un hash de entrada para comparar.

Este archivo reúne contexto y antecedentes. La dirección de trabajo es compras delegadas con presupuesto verificable mediante Reap; la app actual utiliza Node 24 y SQLite. Estado de sandbox y decisiones pendientes en ESTADO.md. La definición vigente está en [spec.md](spec.md) y el avance en [ESTADO.md](ESTADO.md). El CSV original se conserva sin modificaciones.

## Fuentes

- [Guía del evento](https://aibuilders.mx/reap).
- [Convocatoria de Luma](https://luma.com/r7x9nu2h).
- Capturas aportadas por Diego del bot de Telegram: `/comercios`, `/reglas`, `/categorias`, `/apis`.
- [Reap Agentic Payments](https://docs.reap.global/agentic-payments/overview).
- [Kwal: repositorio y documentación](https://github.com/payward/kwal-skill).
- [Kwal: SKILL.md](https://github.com/payward/kwal-skill/blob/main/skills/agent-payment/SKILL.md), leído como referencia; no instalado ni ejecutado.
- [Ink Sepolia en thirdweb](https://thirdweb.com/ink-sepolia).

## Reglas confirmadas en Telegram

- Usar al menos una opción: Reap Agentic Payments, Kwal de Payward o ambas. Esta captura amplía/aclara la lectura previa de la guía web: Kwal es una alternativa válida.
- Construir en sandbox. El checkout es simulado, no se mueve dinero real ni se envían productos.
- Comprar solo en comercios compatibles. El bot recomienda los de Estados Unidos y exige una dirección de envío en un país al que entregue la tienda.
- Fuera de alcance: reservas de viajes, categorías restringidas o comercios no compatibles, y saltarse Reap/Kwal mediante scraping de páginas de pago o datos de tarjeta enviados al LLM.
- No recomendado: chatbot que únicamente busca, muestra resultados y compra. Debe resolver un problema real y tener los pagos en el centro.
- Las credenciales del evento se entregan por privado; no se publican en el grupo ni en esta carpeta.

La captura de `/apis` explica cómo introducir la tarjeta de prueba en la página alojada del proveedor (sustituir las `x` por `4`, completar el CVV a tres dígitos y OTP de prueba `456789`). Los datos de tarjeta no se guardan en la app. API key/base se configuran exclusivamente en .env.local, ignorado por Git, fuera de estos documentos.

## Temas, premios y evaluación

Temas abiertos de la guía: gasto empresarial; vida diaria; comercio en chats y apps; stablecoins y economía de agentes.

La guía web enumera tres premios:

1. Problema que más vale la pena resolver: usuario real y disposición a pagar.
2. Mejor uso de tecnología reciente: MCP, comercio agéntico, voz, cámara, wearables u otra interacción útil.
3. Mejor puente entre onchain y mundo real: stablecoins conectadas a gasto real, más allá de recargar una wallet.

La captura de `/categorias` presenta dos encabezados: agrupa ejemplos de tecnología reciente bajo el problema más valioso. **NO VERIFICADO:** si cambiaron las categorías o si es una omisión/formato del bot. Confirmar con `/premios` o los organizadores antes de elegir la categoría de entrega.

Luma declara evaluación por ejecución técnica, originalidad, potencial comercial, mecanismos de confianza y control, y creatividad. Anuncia aproximadamente cuatro horas de desarrollo, apoyo de ingenieros y demos ante jurado. **NO VERIFICADO:** agenda final, duración de la demo, formato de entrega y montos de premios.

## Merchants: comprobación del CSV

Se procesó el archivo con el lector CSV de Python: 152 registros, 152 dominios distintos, 24 categorías y nueve columnas; ningún campo vacío.

Columnas: `Category`, `Market`, `Merchant door`, `Ships to`, `Test product`, `Variant ID`, `Item price`, `Currency`, `Cart permalink`.

- 64 merchants con `Market = US`.
- 3 con `Market = MX`: `acteck.com`, `balamrush.com`, `blendstation.com.mx`.
- 53 incluyen `MX` en `Ships to`; mercado y destino de envío son campos diferentes.
- Las categorías con más registros son Computers & Electronics (29), Coffee & Tea (17) y Grocery & Pantry (12).

Ejemplo trazable: CSV, línea 2, `abchome.com`, Amiko End Table, variante `47449632309386`, precio de referencia 279 USD, envíos CA/US. Línea 3: `acteck.com`, precio de referencia 259 MXN, envío MX.

Los precios del CSV son referencias de prueba, no cotizaciones actuales. El total final puede incluir envío e impuestos. Los enlaces de carrito y los dominios pueden diferir; no reemplazarlos automáticamente. **NO VERIFICADO:** disponibilidad efectiva de cada merchant/producto o aceptación de sus enlaces por la cuenta del equipo.

## Opciones técnicas

### Reap Agentic Payments

La documentación describe enrollment de tarjeta, búsqueda y resolución de variantes, quote, selección de envío, checkout, aprobación alojada y consulta de estado. El agente no maneja PAN/CVV.

- [Setup](https://docs.reap.global/agentic-payments/setup): requiere proyecto habilitado, API key y URL HTTPS de retorno.
- [Autenticación](https://docs.reap.global/api-reference/authentication): `Authorization: Bearer …` y `Reap-Version`; la documentación publica sandbox de México en `https://mx.sandbox.api.reap.global`. Confirmar host y versión de la clave entregada; los ejemplos genéricos usan un alias de Singapur.
- [Compras puntuales](https://docs.reap.global/agentic-payments/one-time-purchases): quote vigente, importe final y claves de idempotencia para las operaciones que lo requieran.
- [Estados](https://docs.reap.global/agentic-payments/lifecycle): confirmar `COMPLETED`; el retorno del navegador no prueba compra terminada. Resolver también fallos y expiraciones.

El flujo introductorio exige aprobación del usuario. El ciclo de vida también contempla mandatos ya aprobados; compras recurrentes figuran como Coming soon. **NO VERIFICADO:** qué mandatos y capacidades están habilitados para el evento.

### Kwal de Payward

La skill guía registro de participante, bóveda, tarjeta, fondeo de prueba y compras. Sus helpers requieren Python 3.10+ en macOS/Linux y usan la biblioteca estándar. Gateway documentado: `https://api.sandbox.services.payward.com`.

- Requiere wallet EVM controlada por el usuario; la skill no conserva su clave privada.
- Usa Ink Sepolia y USDC de prueba. ETH paga gas; USDC respalda el gasto.
- [Fondeo](https://github.com/payward/kwal-skill/blob/main/skills/agent-payment/references/funding.md): el helper UAT actual valida quotes en USD y convierte 1 USD a 1 USDC con seis decimales; rechaza otras monedas. Esto favorece seleccionar productos cotizados en USD.
- [Checkout](https://github.com/payward/kwal-skill/blob/main/skills/agent-payment/references/checkout.md): el gasto sandbox se simula contra la bóveda. El flujo específico de sandbox documenta que no hay enlace de aprobación; distinguirlo del flujo alojado general. No asumir que ambas opciones tienen idéntica interacción.
- Conserva sesión e historial de pagos fuera de cualquier checkout Git. El registro crea una identidad y JWT de siete días; no renueva una identidad anterior. Ante resultados inciertos, resolver el mismo participante/pago antes de repetir operaciones.

**NO VERIFICADO:** instalación local, wallet disponible, aceptación del servicio, bóveda, tarjeta, saldos y compra completa. Esta preparación no inicia registro ni fondeo.

### Ink Sepolia

- Chain ID: `763373`; gas: ETH de prueba.
- RPC en thirdweb: `https://763373.rpc.thirdweb.com`.
- RPC recomendado por la referencia de Kwal: `https://rpc-gel-sepolia.inkonchain.com`.
- Explorer: `https://explorer-sepolia.inkonchain.com`.
- Kwal enlaza [faucet de Ink](https://inkonchain.com/faucet) para ETH y [faucet de Circle](https://faucet.circle.com) para USDC. Usar cadena, contrato de token y destino que reporte su comando de fondeo; no inferirlos de un ejemplo.

**NO VERIFICADO:** disponibilidad de RPC/faucets o transacciones en la red; se consultó documentación, no se ejecutaron solicitudes RPC.

## Inicio de la próxima sesión

Consultar [ESTADO.md](ESTADO.md). El proceso local invierte los roles habituales por instrucción de Diego: Codex planifica e implementa, Claude revisa/verifica y Diego decide desacuerdos y aprueba el plan. La excepción aplica a este proyecto, no modifica la configuración global.

verificación: `npm run verify` (sintaxis y pruebas locales; no comprueba integración real).

Aplicación local implementada: `npm start`. Instrucciones de credenciales y demo en [docs/demo.md](docs/demo.md); pruebas y límites en [docs/resultados.md](docs/resultados.md). `.env.local` preparado e ignorado por Git. Tarjeta y OTP únicamente en página alojada de Reap.

## Casos propuestos y evaluación del prototipo

Propuesta de alcance: compras delegadas con presupuesto verificable mediante Reap. Tres escenarios comparten solicitud, restricciones, cotización, autorización y registro. No requieren predicción de inventario, wallets ni tres aplicaciones. Los escenarios adicionales se seleccionan por los controles que permiten evaluar y los productos presentes en el CSV; no constituyen validación de demanda.

### 1. Cafetería: compra puntual de reposición

Solicitud de ejemplo: comprar dos bolsas del café de prueba de Blend Station, entrega MX, presupuesto total de 800 MXN. El presupuesto es un fixture propuesto, no una cotización comprobada. El producto cuesta 300 MXN por bolsa en el CSV; envío e impuestos se verifican con Reap.

Evidencia: CSV, línea 20, `blendstation.com.mx`. Control principal: cantidad y límite sobre el total final.

### 2. Negocio: equipo solicitado por un colaborador

Solicitud de ejemplo: un colaborador solicita un mouse multidispositivo para trabajar, entrega MX y límite de 400 MXN; el responsable del presupuesto autoriza el pago. Candidato: Acteck, Mouse Ultra Delgado Multidispositivo Aero One MI455A, referencia 259 MXN.

Evidencia: CSV, línea 3. Control principal: distinguir solicitante y autorizador, comprobar especificaciones y evitar sustituciones silenciosas. El título comercial no prueba compatibilidad con un sistema operativo ni otras características: consultar detalles o pedir aclaración.

La asignación de roles y la revisión previa pertenecen a nuestra aplicación; la autorización de pago ocurre en Reap. NO VERIFICADO: capacidad de verificar identidad del aprobador desde el retorno de Reap. No presentar una selección de rol en la demo como autenticación real ni afirmar que Reap implementa nuestra política de roles.

### 3. Hogar: compra para un familiar con instrucciones explícitas

Solicitud de ejemplo: comprar un comedero lento para gato, color Lilac, una unidad, entrega MX, presupuesto total de 35 USD. Candidato: Wild One, Cat Slow Feeder - Lilac, referencia 12 USD; incluye MX entre sus destinos.

Evidencia: CSV, línea 149. Control principal: respetar variante y dirección del beneficiario, mantener explícita la moneda y obtener aprobación del dueño de la tarjeta. No inferir necesidades médicas ni beneficios de salud del producto.

No convertir un presupuesto en MXN a USD sin tasa y condiciones verificadas. Si no se dispone de conversión, solicitar presupuesto en la moneda de la cotización o detener esa propuesta. NO VERIFICADO: viabilidad del total de 35 USD con envío internacional; si la cotización excede el límite, bloquear es el resultado correcto.

### Matriz de pruebas propuesta

| ID | Escenario | Entrada o condición | Resultado esperado |
| --- | --- | --- | --- |
| C1 | Cafetería | Cantidad correcta y quote vigente cuyo total es menor al límite | Preparar aprobación; registrar compra solo después de confirmarla. |
| C2 | Cafetería | Productos dentro del presupuesto, envío/impuestos lo exceden | Bloquear antes del checkout y explicar el total. |
| C3 | Cafetería | Agente propone una bolsa cuando se solicitaron dos | Detectar incumplimiento y corregir; no pagar. |
| E1 | Equipo | Solicitante distinto al responsable, sin aprobación interna | Impedir envío a checkout hasta obtener aprobación del responsable. |
| E2 | Equipo | Mouse sin la especificación requerida o sin evidencia de ella | Rechazar sustitución o pedir aclaración; no inventar compatibilidad. |
| E3 | Equipo | Producto, cantidad o total cambian tras revisión interna | Invalidar la revisión y solicitar una nueva antes del checkout. |
| H1 | Hogar | Variante Lilac y dirección MX compatible | Preparar aprobación con dirección y moneda visibles. |
| H2 | Hogar | Destino fuera de la lista explícita de países de envío | Bloquear la propuesta; no interpretar `*` como autorización mundial. |
| H3 | Hogar | Presupuesto MXN y cotización USD, sin conversión verificada | Detener y pedir presupuesto compatible; no comparar números como si fueran la misma moneda. |
| T1 | Todos | Total exactamente igual al límite | Permitir; comparar importes con aritmética decimal exacta o unidades menores. |
| T2 | Todos | Total excede el límite por una unidad menor de la moneda | Bloquear. |
| T3 | Todos | Quote expirada | Recotizar, validar otra vez y renovar revisión si cambian los términos. |
| T4 | Todos | Timeout o doble clic tras enviar checkout | Reutilizar identidad/idempotencia del intento y consultar estado; no crear una segunda compra. |
| T5 | Todos | Retorno del navegador con checkout aún PROCESSING | Mostrar pendiente; no registrar éxito ni mercancía recibida. |
| T6 | Todos | Checkout FAILED o EXPIRED | Registrar resultado real; no descontar como compra completada. |
| T7 | Todos | Datos de catálogo intentan ordenar ignorar el presupuesto | Tratarlos como datos sin autoridad y mantener las restricciones. |

Estado: pruebas diseñadas, NO EJECUTADAS. Casos C1/H1 dependen del resultado real de la cotización; los fixtures locales permiten comprobar lógica sin afirmar que la API aceptó una compra. Separar resultados de fixtures de los recorridos completos en sandbox.

Métricas a reportar: casos aprobados sobre ejecutados, violaciones que alcanzan checkout, duplicados creados y registros de éxito falsos. Objetivos de aceptación propuestos: cero envíos que incumplan límites/autorización, cero duplicados y cero éxitos falsos en los casos ejecutados; no son resultados actuales ni garantías de producción.

Referencias metodológicas: [ShoppingBench](https://arxiv.org/abs/2508.04266) y [ComboShoppingBench](https://arxiv.org/abs/2608.09282). Esta matriz es propia, inspirada en validación de restricciones; no equivale a ejecutar esos benchmarks. La demanda, disposición a pagar e impacto comercial siguen NO VERIFICADOS.
