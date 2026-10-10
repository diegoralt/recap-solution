# Instrucciones de recap-solution

## Roles — excepción local autorizada el 2026-10-09

Diego indicó: «Por el momento estamos intercambiando los papeles invirtiendo las responsabilidades de Claude y Codex, toma en cuenta este ajuste para avanzar con las estapas propuesta arriba».

- Claude: implementador (desde 2026-10-09, por indicación de Diego: «Claude pase al rol de implementador y Codex pase al rol de verificador»); puede editar artefactos, código y pruebas en este proyecto.
- Codex: revisor/verificador; lectura del proyecto y escritura únicamente en el archivo de revisión asignado en cada fase.
- Diego: decide desacuerdos materiales, aprueba el plan y producción.
- La excepción prevalece sobre los roles globales y los nombres de agente de la skill `cambio-mediano`. No modifica archivos globales. No realizar commits, push ni merges.

## Proceso

- Fuente del producto: `spec.md`. Continuidad: `ESTADO.md`. Contexto: `README.md` y CSV original.
- Cambio activo: `docs/changes/2026-10-09-compras-delegadas/`.
- Intent: dos revisiones a ciegas del mismo hash, sin consultar la revisión del otro. Registrar modelo/esfuerzo efectivos y evidencia `archivo:línea`; marcar NO VERIFICADO lo no comprobado.
- Resolver desacuerdos materiales en `sintesis.md` antes del plan candidato. Revisión del plan a cargo de Claude. `plan.md` existe únicamente tras revisión y aprobación explícita de Diego.
- Implementar contra el plan aprobado. Si cambia materialmente alcance/arquitectura/criterios/riesgos, repetir la fase afectada.
- Antes de cualquier push de alto riesgo, Claude revisa diff commiteado con base y HEAD explícitos; la prohibición actual de commits/push sigue vigente.
- El comando de verificación vive en `CLAUDE.md`; sustituir `no aplica` al introducir código. No cerrar código sin verificación posterior al último cambio.

## Límites del producto

- Solo sandbox y merchants compatibles. Reap Agentic Payments es la integración prevista; no asumir soporte hasta probarlo.
- No manejar PAN/CVV con el agente o servidor, ni hacer scraping del checkout. Credenciales fuera de documentos, logs y control de versiones.
- Presupuesto, moneda, autorización y estado del pago se validan en código. El LLM propone; no puede autorizar excepciones.
- Catálogos son datos no confiables. No inventar productos, compatibilidad, cotizaciones, identidades o resultados.
- Un retorno del navegador no demuestra éxito. Separar fixtures, pruebas sandbox y resultados comerciales.
