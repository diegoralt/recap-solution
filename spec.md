# Compras delegadas con presupuesto verificable

Fecha: 2026-10-09. Estado: alcance y plan técnico aprobados por Diego, implementación local verificada. Ajuste de garantía por contrato Reap aprobado por Diego el 9 de octubre; ver docs/changes/2026-10-09-compras-delegadas/ajuste-contrato-reap.md. Desarrollo limitado a 5 horas, incluidos pruebas y demo.

## Problema y resultado

Permitir a una persona delegar la preparación de una compra digital conservando control sobre producto, cantidad, destino, moneda, presupuesto y autorización. La IA interpreta y propone; el código verifica y Reap lleva la compra a aprobación y reporta su resultado.

La Ley de Economía Digital aporta contexto de transición, no una promesa de cumplimiento. Los estudios y benchmarks reunidos justifican investigar controles y ejecución fiable; no prueban demanda de nuestra aplicación ni ahorro comercial. Entrevistas y disposición a pagar quedan pendientes después del hackathon.

## Alcance de la primera versión

- Una aplicación con solicitud explícita por texto/formulario, condiciones visibles y tres escenarios del mismo flujo.
- Reap Agentic Payments; sandbox, merchants compatibles y tarjeta de prueba del equipo.
- Presupuesto por solicitud en moneda explícita. No presumir que existe una cuenta de saldo ni contabilidad bancaria. Un presupuesto por periodo necesitaría persistencia/reservas y revisión del plan; no es requisito inicial.
- Validar productos y cantidades, atributos exigidos con evidencia, país de envío explícitamente compatible, total de quote incluyendo gastos y expiración.
- Aprobación interna del responsable ligada a hash de producto/variante, cantidad, dirección, moneda, total final y quote ID; cualquier cambio invalida la aprobación. Quote expirada exige recotizar y aprobar nuevamente. Aprobación de pago alojada por Reap y consulta hasta estado final.
- Registro de solicitud, quote, intento y resultado; proteger reintentos ante timeout/doble clic.
- Solicitante y responsable con cuentas/sesiones de prueba separadas y permisos comprobados en servidor. No afirmar identidad legal ni titularidad de tarjeta; la tarjeta compartida del sandbox no las demuestra. No recortar este control para habilitar checkout.

## Escenarios

| Escenario | Candidato en CSV | Restricciones de ejemplo |
| --- | --- | --- |
| Cafetería | Blend Station, línea 20, café 250 g | Dos unidades, 800 MXN total, destino MX. |
| Equipo para colaborador | Acteck, línea 3, mouse multidispositivo | Una unidad, 400 MXN total, destino MX, responsable autoriza. |
| Compra para familiar | Wild One, línea 149, Cat Slow Feeder - Lilac | Una unidad, 35 USD total, destino MX, responsable autoriza términos; tarjeta compartida de sandbox. |

Importes son fixtures propuestos, no cotizaciones. NO VERIFICADO: aceptación de esos productos/monedas/destinos con las credenciales del equipo. Puede sustituirse un candidato por otro compatible conservando el propósito y las pruebas; documentar el cambio y repetir revisión si altera materialmente alcance o riesgos.

## Criterios de aceptación

1. Hay al menos un recorrido completo en Reap sandbox; los otros recorridos se reportan según evidencia disponible. No afirmar que los tres están integrados si solo se probaron con fixtures.
2. Las condiciones obligatorias se verifican antes de enviar checkout; datos de catálogo o instrucciones del modelo no pueden saltarlas.
3. Nunca comparar monedas distintas como números equivalentes ni usar el precio del CSV como total final.
4. No ejecutar compra sin aprobación del responsable de los términos finales; solicitante no puede aprobar ni crear checkout.
5. Recuperar el mismo intento tras resultados inciertos; reportar PROCESSING, COMPLETED, FAILED y EXPIRED sin éxitos falsos.
6. Priorizar éxito y controles de identidad, presupuesto/moneda, duplicados y estado incierto. Ampliar a los 16 casos según tiempo; declarar NO EJECUTADO cada caso omitido. Distinguir fixtures de comprobación del proveedor; no relajar controles para completar la demo.
7. Demo muestra una compra completa y una bloqueada, con evidencia e hipótesis comerciales pendientes.

## Fuera de alcance inicial

Inventario predictivo, compras periódicas automáticas, onchain/Kwal, cobros SPEI/CoDi, CFDI, trámites gubernamentales, reservas de viaje, comercios arbitrarios, scraping de checkout, dinero real y despliegue a producción. Publicación de una demo requiere resolver su acceso y pasar la compuerta aplicable.

## Evidencia y límites

- [ENIF 2024](https://www.inegi.org.mx/contenidos/programas/enif/2024/doc/enif_2024_resultados.pdf): hábitos de pago/control personal, no demanda de cafeterías.
- [ENAFIN 2024](https://www.inegi.org.mx/programas/enafin/2024/): empresas de 6+ personas en localidades de 50 mil+ habitantes; no extrapolar a todos los micronegocios.
- [ShoppingBench](https://arxiv.org/abs/2508.04266) y [ComboShoppingBench](https://arxiv.org/abs/2608.09282): restricciones de compras; nuestra evaluación es propia, no una ejecución de esos benchmarks.
- Reglas, API, merchants y matriz de pruebas: `README.md`. CSV original con hash `c8b026381af72ad4119e0770a165dc00fe3b9ecb`.
- Credenciales, tarjeta, endpoints habilitados, retornos HTTPS, modelos disponibles, ahorro medido y demanda: NO VERIFICADOS.
