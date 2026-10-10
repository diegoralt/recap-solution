# Verificación del ajuste de latencia (Claude)

- Fecha: 2026-10-09.
- Rol: revisor/verificador (roles invertidos por Diego en AGENTS.md). Solo lectura salvo este archivo.
- Modelo y esfuerzo: `claude-opus-5-5` · high. Fuente: el coordinador (pantalla de terminal: "Opus 5.5 with high effort"). El esfuerzo no lo puede comprobar el propio revisor.
- Alcance: delta entre `entrada-correcciones-final.json` y `entrada-latencia.json`, regresiones que bloqueen y coherencia de la evidencia. No es una relectura completa ni abre un intent nuevo.
- Sin red ni API reales, sin `.env.local`/`data`/`.local`, sin datos de tarjeta, sin commits.

## Veredicto

**APTO para el ajuste técnico de latencia.** Sin P0/P1 nuevos. Tres P2 opcionales.

Este veredicto no sustituye: la decisión de Diego sobre P1-1 (garantía de contenido, `ajuste-contrato-reap.md`), la tarjeta ACTIVE ni una prueba de checkout sandbox completa.

## Hashes

- `entrada-latencia.json` SHA256 `4afc5da587be6e39bd713133e7aba1f32de838b77edf18eaa376c9e5aafb1ae7`: coincide.
- Los 29 archivos listados coinciden con su SHA256 en disco.
- Cambiaron respecto a `entrada-correcciones-final.json`: `src/providers/reap.mjs`, `test/provider-contract.test.mjs`, `docs/resultados.md`, `docs/demo.md`. `plan.md` es nuevo en la lista (SHA256 `12fa9b74…d561` coincide). El resto es idéntico.
- `plan_hash` `c49a1b94370f5e6fc11384f546b43189a8b88558` = `git hash-object plan-candidato.md`, que es la versión aprobada citada en `plan.md:6`. No es el hash de `plan.md` (`git hash-object` = `674113aabdc73188386673fb440e4934bba9acaf`). Es coherente con las entradas previas; no hay discrepancia.

## Delta revisado

1. `src/providers/reap.mjs:41-43`: la factory `timeoutSignal` tiene `ms => AbortSignal.timeout(ms)` por defecto. Producción (`src/server.mjs:29`) y preflight (`scripts/preflight.mjs:8`) no la pasan, así que usan el valor por defecto. Las pruebas son las únicas que la inyectan.
2. `src/providers/reap.mjs:45,50`: `call()` lleva `timeoutMs = 15_000` por defecto y lo aplica en cada fetch.
3. `src/providers/reap.mjs:64`: solo `quote()` (POST `/agentic/quotes`) pasa `timeoutMs: 45_000`. `readQuote`, `checkout`, `readCheckout`, `readEnrollment` y `createEnrollment` (`:66-71`) usan los 15 s por defecto. Esto coincide con lo declarado.
4. `test/provider-contract.test.mjs:105-111`: confirma que los plazos son `[45000, 15000]` para quote y checkout.

## Regresiones consideradas (no bloquean)

- **El plazo del servidor HTTP es menor que 45 s.** `src/server.mjs:106` fija `requestTimeout = 30_000`, y la cotización se espera dentro del propio request (`src/agent.mjs:87`). Lo probé localmente en Node v24.19.0 con una escala reducida (`requestTimeout` 1000 ms y respuesta a los 2500 ms después de recibir el cuerpo): devolvió `200 ok:{} 2516 ms`. `requestTimeout` solo limita la recepción del request, no la respuesta. No corta el quote de 45 s. Solo probé `http`; para `https` (`config.secure`) queda NO VERIFICADO, aunque usa la misma lógica de `http.Server`.
- **Carrera durante los 45 s.** `quote()` guarda `r` después del `await` (`src/agent.mjs:94`). `store.save` usa revisión optimista (`src/store.mjs:40-41`), así que si alguien edita en paralelo el resultado es `STALE` 409, no una sobrescritura. La ventana más larga no abre una carrera nueva.
- **Timeout del quote.** Produce `ProviderError('NETWORK_UNKNOWN')` (`src/providers/reap.mjs:51`). La solicitud queda `BLOCKED` (`src/agent.mjs:90-92`) sin reintento automático. Una quote huérfana en Reap no compromete fondos, y la recuperación idempotente de checkout no cambia.
- **UI.** El botón queda deshabilitado mientras espera (`public/app.js:18`) y el cliente no tiene timeout propio (`public/app.js:11`). No se envía dos veces.

## Verificación

`npm run verify`, después del último código (el script no carga env-file; `scripts/verify.mjs:1-11`): `node --check` sobre src/scripts/public/test, y luego `tests 41 · pass 41 · fail 0`, exit 0. Incluye `✔ Incidente sandbox: quote de más de 15 s tiene margen de 45 s; checkout mantiene 15 s`.

## Coherencia de la evidencia

- `plan.md:72` conserva "Timeout por request 15 segundos" del cuerpo aprobado. La excepción para el quote queda como nota fechada en `plan.md:119`. Es coherente con conservar el texto aprobado más la nota de ajuste.
- `docs/resultados.md:67` y `docs/demo.md:69` dicen QUOTED 303.77 USD, sin checkout, quote con 45 s y el resto con 15 s. Coinciden con el código. `resultados.md:67` declara que la verificación independiente estaba pendiente; este archivo la cubre solo para el ajuste de latencia.
- `docs/resultados.md:67` mantiene `request-only` y P1-1 pendiente (`plan.md:119`). No se presenta como éxito de compra.

## P0/P1

Ninguno.

## P2 (opcionales)

- **P2-L1 · cifra ambigua.** `docs/resultados.md:67` y `plan.md:119` dicen "18.934 ms". Con convención es-MX se lee como 18,9 s, que es lo que justifica el cambio. Leído en inglés serían ~19 ms y contradice el motivo. Sugerencia: "18 934 ms (≈18,9 s)".
- **P2-L2 · cobertura parcial de plazos.** La prueba (`test/provider-contract.test.mjs:110`) solo comprueba quote y checkout. `readQuote`, `readCheckout` y los dos de enrollment están a 15 s solo por lectura de código. Si se añaden al arreglo `deadlines`, un futuro cambio que los afecte se detectaría.
- **P2-L3 · espera sin aviso.** Hasta 45 s con solo el botón deshabilitado (`public/app.js:18`). Un texto como "Cotizando con Reap…" evitaría que la demo parezca colgada.

## NO VERIFICADO

- La latencia de 18.934 ms y la quote de 303.77 USD en sandbox. No se reprodujeron (sin red, por instrucción); la fuente son los documentos de Codex.
- Que 45 s alcance con la latencia real de Reap. Solo hay una observación y no existe una distribución ni un p95.
- El corte real de `AbortSignal.timeout(45_000)` sobre fetch. La prueba inyecta un `AbortController` que nunca aborta.
- La semántica de `requestTimeout` con HTTPS (solo se probó `http`).
- Checkout sandbox, tarjeta ACTIVE, retorno del enrollment en navegador y la decisión de Diego sobre P1-1. Siguen fuera del alcance de esta revisión.
