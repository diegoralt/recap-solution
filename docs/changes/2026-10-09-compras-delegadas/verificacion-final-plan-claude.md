# Verificación final del plan (Claude)

- Fecha: 2026-10-09. Revisor: Claude (Codex planifica/implementa).
- Modelo efectivo: `claude-opus-5-5`. Esfuerzo efectivo: NO VERIFICADO (la sesión no lo expone).
- Entrada: `plan-candidato.md`, hash comprobado con `git hash-object`: `c49a1b94370f5e6fc11384f546b43189a8b88558`. Coincide con el encargo.
- Alcance acotado: cierre del P2-11, la regresión de origen único y si esos dos cambios reabren algún P1. Sin consultas web ni nueva investigación. Solo lectura, salvo este archivo.
- Límite: no hay commits, así que no pude hacer un diff contra `41842ca…`. Comparé las líneas 10 y 68 con el texto leído en la verificación anterior y las líneas relacionadas (21, 36, 52, 54, 62, 70, 89, 93) con su contenido previo. No encontré otros cambios en esas líneas. Que no haya cambios en el resto del archivo: NO VERIFICADO.

## Veredicto

**Cerrados el P2-11 y la regresión de origen único. Ningún P1 se reabre.** Desde la revisión no queda nada que bloquee la aprobación de Diego.

## P2-11 — Nombre del flujo: **CERRADO**

- `plan-candidato.md:10` dice ahora «el flujo asistido por herramientas propone un producto compatible». Es coherente con `plan-candidato.md:14`, que reserva «agente con LLM» para cuando exista.

## Regresión de origen único: **CERRADA**

- `plan-candidato.md:68`: «En sandbox, login, UI, API y retorno se sirven exclusivamente en el mismo origen `https://localhost:3443`; HTTP y 127.0.0.1 no son orígenes alternativos de sesión». El `returnUrl` es `https://localhost:3443/return`, en ese mismo origen.
- Es coherente con el resto del plan:
  - `plan-candidato.md:36`: Origin igual al origen configurado y rechazo de otros orígenes y hosts.
  - `plan-candidato.md:52`: `APP_ORIGIN` va en la configuración server-side.
  - `plan-candidato.md:60`: `/return` es estático y los fetch son same-site.
- `plan-candidato.md:21` («HTTP/HTTPS local») y `plan-candidato.md:36` («HTTP solo loopback») no contradicen el cambio: en sandbox, `:68` restringe el origen, y HTTP queda solo para el modo fixture.

## P1 no reabiertos

- **P1-1:** sigue cerrado.
  - HTTPS en loopback, confirmación por GET y botón/polling (`plan-candidato.md:68`, `:60`).
  - La aceptación de `localhost` sigue NO VERIFICADA, se comprueba en el primer checkout autorizado sin checkout extra, y un rechazo deja el recorrido pendiente sin publicar (`plan-candidato.md:70`).
  - El riesgo sigue expreso para la aprobación de Diego (`plan-candidato.md:70`).
  - El origen único lo refuerza: elimina el fallo de sesión al volver de Reap.
- **P1-2:** sigue cerrado.
  - Prohibición de `X-Simulate-Checkout` y prueba de que no se envía (`plan-candidato.md:62`, `:89`).
  - `sandbox-simulado` queda reservada sin productor y no satisface la aceptación (`plan-candidato.md:62`, `:93`).
  - Solo la aprobación alojada observada seguida de GET `COMPLETED` conforme cumple el criterio 1 (`plan-candidato.md:62`, `:93`).
  - Ninguno de los dos cambios toca estas líneas.

## Observación no bloqueante

Para la implementación: según el sistema, `localhost` puede resolver primero a `::1`. El servidor debe escuchar donde el navegador conecte (por ejemplo `localhost`, o `::1` y `127.0.0.1`), sin abrir interfaces externas. El SAN del certificado ya incluye `localhost` (`plan-candidato.md:68`). Conviene comprobarlo en la prueba manual de dos perfiles (`plan-candidato.md:87`).

## NO VERIFICADO

- Que Reap acepte `https://localhost:3443/return` (`plan-candidato.md:70`); riesgo aceptable solo con la aprobación expresa de Diego.
- Que no haya cambios fuera de las líneas comparadas (sin diff disponible).
- Esfuerzo efectivo de este revisor y confinamiento técnico de escritura (solo por instrucción).
