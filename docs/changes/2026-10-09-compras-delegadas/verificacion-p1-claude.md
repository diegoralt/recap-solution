# Verificación de cierre: revisión del plan (Claude)

- Fecha: 2026-10-09. Revisor: Claude (Codex planifica/implementa).
- Modelo efectivo: `claude-opus-5-5`. Esfuerzo efectivo: NO VERIFICADO (la sesión no lo expone).
- Entrada: `plan-candidato.md`, hash comprobado con `git hash-object`: `41842ca6342731b01d5cc64b0333cbbc050af834`. Coincide con el encargo.
- Referencia: hallazgos de `revision-plan-claude.md`, emitidos sobre el hash anterior `9d2a948809ddba8e50749012e80bc15f80424f01`.
- Solo lectura. No se editaron el plan, la spec, el estado ni la revisión previa. Sin llamadas a API ni código.

## Veredicto

**P1-1 y P1-2 cerrados.** Los P2 1–10 quedan atendidos. El P2-11 sigue abierto por una frase residual. Las correcciones introducen una regresión P2 (origen único con HTTPS local) y dejan dos riesgos residuales que Diego debe aceptar al aprobar. Ninguna regresión es P0/P1. Desde la revisión no hay bloqueo para que Diego decida la aprobación.

## Estado de los P1

### P1-1 — HTTPS sin túnel público: **CERRADO**

| Requisito | Evidencia |
|---|---|
| HTTPS solo en loopback con `node:https` y certificado autofirmado (SAN localhost/127.0.0.1) generado por `openssl` en carpeta ignorada; sin confianza global ni TLS saliente desactivado | `plan-candidato.md:68`, `:21`, `:29` |
| Confirmación por GET desde el servidor, sin depender del retorno | `plan-candidato.md:68`, `:56` |
| Botón del responsable y polling cada 5 s durante 2 min como máximo; después, consulta manual | `plan-candidato.md:60` |
| `/return` estático, público, sin efectos ni lectura de la query; cookie Strict solo en fetch same-site | `plan-candidato.md:60` |
| Aceptación de `localhost` por Reap marcada **NO VERIFICADA**; se prueba en el primer checkout autorizado, sin checkout extra de preflight | `plan-candidato.md:70` |
| Si Reap la rechaza: sin alternativa automática; se prepara la configuración de un túnel autenticado y se pide aprobación; no hay túnel ni publicación en este plan; el recorrido queda pendiente | `plan-candidato.md:70` |
| El riesgo debe constar expresamente en la aprobación de Diego | `plan-candidato.md:70` |

### P1-2 — Simulación contada como recorrido completo: **CERRADO**

| Requisito | Evidencia |
|---|---|
| No implementar ni enviar `X-Simulate-Checkout`, tampoco por variable ni por petición | `plan-candidato.md:62` |
| Prueba del adaptador que exige la ausencia del header en cada POST | `plan-candidato.md:62`, `:89` |
| Tres categorías de evidencia: `fixture`, `sandbox-simulado`, `sandbox-aprobación-alojada` | `plan-candidato.md:62`, `:93` |
| Solo cuenta la aprobación alojada observada seguida de GET `COMPLETED` conforme | `plan-candidato.md:62`, `:93` |
| Un checkout sin `nextAction` inicial se registra como anomalía y no cuenta | `plan-candidato.md:54` |

## P2 de la revisión

| # | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| 1 | Enrollment `EXTERNAL`, `ACTIVE` exigido, sin depender de mandatos | Atendido | `plan-candidato.md:54` |
| 2 | 5xx cacheado, backoff, timeout, error de parámetros | Atendido | `plan-candidato.md:58`, `:89` |
| 3 | El replay no revalida la quote expirada | Atendido | `plan-candidato.md:58`, `:89` |
| 4 | Retorno compatible con cookie Strict | Atendido | `plan-candidato.md:60` |
| 5 | `BLOCKED`, `amount_mismatch`, almacenamiento de `nextAction.url` | Atendido | `plan-candidato.md:60`, `:93` |
| 6 | Hash canónico definido | Atendido | `plan-candidato.md:44`, `:89` |
| 7 | Quién fija y sube el límite | Atendido | `plan-candidato.md:38`, `:89` |
| 8 | Modo fijado al arrancar, sin fallback | Atendido | `plan-candidato.md:42`, `:89` |
| 9 | Lista de recortes y demo con checkout deshabilitado | Atendido con desviación aceptada | `plan-candidato.md:83` |
| 10 | Guion prevé que `FAILED`/`EXPIRED` cierran la solicitud | Atendido | `plan-candidato.md:60` |
| 11 | No llamar «agente» al flujo determinista | **Abierto (menor)** | `plan-candidato.md:14` corregido, pero `plan-candidato.md:10` sigue diciendo «un agente acotado propone un producto compatible». Arreglo: usar «el flujo asistido por herramientas propone» |

Desviación del P2-9: yo propuse hacer el preflight antes de los 300 minutos. El plan lo mantiene dentro, por decisión expresa, para no ocultar tiempo externo (`plan-candidato.md:83`). Es una decisión legítima y no la reabro.

Mandatos: el plan ya no afirma que estén inactivos. Solo evita depender de ellos y exige enrollment `ACTIVE` (`plan-candidato.md:54`), lo cual es correcto con cualquier lectura de la documentación. Hoy volví a consultar las páginas de lifecycle y one-time purchases con WebFetch, y ambas respuestas citaron «Mandates are not available yet» y «the endpoints are not live in sandbox or production». Esto contradice la nota del encargo, que dice que lifecycle no lo confirma. WebFetch resume con otro modelo y no garantiza el texto literal; la descarga directa con `curl` superó el tiempo límite y la detuve. Literalidad: NO VERIFICADA. No afecta al plan, porque ya no depende de esa afirmación.

## Regresiones de las correcciones

1. **P2: origen único en modo sandbox.** El plan sirve «HTTP/HTTPS local» (`plan-candidato.md:21`), mantiene «HTTP solo loopback» con cookie `Secure` solo en HTTPS (`plan-candidato.md:36`) y fija el retorno en `https://localhost:3443/return` (`plan-candidato.md:68`). No dice que login, UI y API vivan en ese mismo origen.
   - **Escenario:** el responsable inicia sesión en `http://127.0.0.1:<puerto>`, aprueba en Reap y vuelve a `https://localhost:3443/return`. Las cookies son por host, así que el JS de `/return` no tiene sesión, y la comprobación de `Origin` contra `APP_ORIGIN` (`plan-candidato.md:36`) rechaza un origen u otro. El botón y el polling devuelven 401/403 y parece que la confirmación falla.
   - **Arreglo:** en modo sandbox, `APP_ORIGIN=https://localhost:3443` sirve todo (login, UI, API y `/return`) sin listener HTTP paralelo, y el `returnUrl` se deriva de `APP_ORIGIN`. HTTP queda solo para fixture. Añadirlo a la prueba manual de dos perfiles (`plan-candidato.md:87`).
2. **Riesgo residual: el rechazo de `localhost` se descubre tarde.** Como no hay checkout de preflight (`plan-candidato.md:70`), el primer checkout autorizado ocurre en el bloque 3 (minutos 100–170, `plan-candidato.md:78`). Si Reap rechaza el `returnUrl`, la aprobación del túnel se pediría a mitad de la sesión. Además, por `plan-candidato.md:58` ese rechazo cierra la solicitud: hace falta solicitud, aprobación y nueva clave/body con otro `returnUrl`. Ya consta como riesgo para la aprobación (`plan-candidato.md:70`). Recomendación: que Diego responda en el mismo acto de aprobación si autorizaría o no un túnel autenticado en ese caso, para no detener el bloque 3 esperando la decisión.
3. **Menor: categoría `sandbox-simulado` sin productor.** Al prohibir el header (`plan-candidato.md:62`), esa categoría solo puede quedar vacía. Lo único parecido que sigue pudiendo ocurrir es un checkout sin `nextAction` (`plan-candidato.md:54`), que debería anotarse en una categoría explícita y no quedar ambiguo. Sugerencia: documentar en `resultados.md` que `sandbox-simulado` queda vacía por diseño y que un checkout sin `nextAction` se registra como anomalía no aceptable.

Sin regresiones en identidad/permisos (`plan-candidato.md:34-38`), en la transacción editar/aprobar/checkout (`plan-candidato.md:48`) ni en la ventana de 23 h (`plan-candidato.md:58`). Que la recuperación «verifique responsable» (`plan-candidato.md:58`) es coherente con D2.

## NO VERIFICADO

- Que Reap acepte un `returnUrl` en `https://localhost:3443` (NO VERIFICADO en el plan, `plan-candidato.md:70`).
- La versión de OpenSSL 3.6.5 y SQLite 3.53.3 declaradas por el plan (`plan-candidato.md:68`, `:18`): no las volví a comprobar. Node `v24.19.0` se comprobó en la revisión anterior.
- El texto literal de Reap sobre mandatos (ver arriba).
- Que el navegador permita continuar ante el certificado autofirmado en la redirección de vuelta sin romper la demo; el plan documenta una excepción manual (`plan-candidato.md:68`).
- Lo que siga NO VERIFICADO de `revision-plan-claude.md` y no tocan estas correcciones: host/versión, expiraciones, `nextAction` en GET, credenciales y merchants.
- Esfuerzo efectivo de este revisor y confinamiento técnico de escritura (solo por instrucción).
