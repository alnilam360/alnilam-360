# Tracker 09 — Red de seguridad de pruebas (Front)

> Plan: [gestion/fase_de_desarrollo/09_09-red-seguridad-pruebas-front_plan.md](../fase_de_desarrollo/09_09-red-seguridad-pruebas-front_plan.md) · Iniciado: 2026-11-14
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
### A. Golden vectors accidentalidad (cliente-web)
- [x] `matriz-at-indicadores.service.spec.ts`: V1–V6 en verde (instancia con stub, mockDate donde aplica)
- [x] Verificación Opus de los valores esperados (muestreo 2026-11-14: V1/V3/V4/V5/V6 calzan)
### B. Playwright (cliente-web)
- [x] `@playwright/test@^1.65.1` (--legacy-peer-deps, OK usuario) + `playwright.config.ts` + script `e2e` + `.gitignore` (2026-11-14)
- [x] `smoke.spec` (app carga, login renderiza)
- [x] `guard.spec` (ruta protegida sin sesión ⇒ /auth)
- [x] `autenticado.spec` (login por env vars; skip sin creds; dashboard + navegación)
- [x] Corrida: e2e 3 passed (smoke+guard); unit Karma intacto 107/1 base (2026-11-14)
### C. Indicadores en componentes → puras (cliente-web)
- [x] Extraer ausentismo / prevalencia / incidencia a `indicadores/funciones/indicadores.funcion.ts` (+ spec), sin cambiar comportamiento
- [x] Extender `res-evaluaciones.service.spec.ts` con golden vectors de `calcularPuntajeTotal` (excluye No Aplica)
### Cierre
- [x] Validación: build dev OK, specs headless 122/1 (único rojo = base AppComponent), e2e smoke/guard 3 passed (2026-11-14)
- [x] Commit (2026-11-14)
