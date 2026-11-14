# Plan 09 — Red de seguridad de pruebas (Front)

> Fecha: 2026-11-14 · Tracker: [gestion/tracker/09_09-red-seguridad-pruebas-front.md](../tracker/09_09-red-seguridad-pruebas-front.md)

## Objetivo
Red de seguridad del front: (A) golden vectors sobre los cálculos SST de mayor riesgo, (B) Playwright
instalado + e2e de flujos críticos, (C) cálculos de indicadores que hoy viven en componentes, testeables.
Opus define/verifica los vectores (correctitud de fórmulas no se delega); Sonnet transcribe.

## Enfoque
- Los `calcular*` de `matriz-at-indicadores.service.ts` ya son **públicos y puros** (no leen signals/sb).
  Se testean instanciando el service con stub → **cero refactor**. Vectores hechos a mano (0312 / GTC 3701, K=200000).
- Cálculos con `new Date()` (días sin AT, cumplimiento de acciones) ⇒ `jasmine.clock().mockDate` con ISO UTC.
- Playwright = infra nueva (OK del usuario). e2e credential-free primero (boot, login, redirect de guard);
  flujos autenticados detrás de env vars (`E2E_EMAIL`/`E2E_PASSWORD`), skip si faltan. Nunca credenciales en el repo.
- Serializar agentes: comparten `ng test`/`ng build` (runner/puerto) ⇒ un agente a la vez.

## Fases
### A. Golden vectors accidentalidad — `src/app/core/services/matriz-at-indicadores.service.spec.ts` (NUEVO)
Instanciar `new MatrizAtIndicadoresService(stub)` (o TestBed con provider stub de SupabaseClientService).
Vectores EXACTOS (ver abajo). Cubre calcularIndicadoresMes (con/sin parámetros), calcularPeriodo,
calcularTriangulo, calcularDiasSinAccidentes, calcularCumplimiento.

### B. Playwright — flujos críticos
`@playwright/test` (devDep), `playwright.config.ts` (baseURL localhost:4200, `webServer` = `npm start`,
reuseExistingServer), script `"e2e": "playwright test"`. `e2e/` con:
- `smoke.spec`: app carga; `/auth` (login) renderiza sus campos.
- `guard.spec`: ruta protegida sin sesión ⇒ redirige a `/auth`.
- `autenticado.spec`: login con `E2E_EMAIL/E2E_PASSWORD`; si no hay env ⇒ `test.skip`. Valida dashboard carga + navegación a Presupuesto.
Añadir `e2e/` y artefactos de Playwright a `.gitignore` (no versionar `test-results/`, `playwright-report/`).

### C. Indicadores en componentes → funciones puras + spec
`ausentismo`, `enfermedad-laboral` (prevalencia/incidencia): extraer la aritmética del getter a
`src/app/modules/indicadores/funciones/indicadores.funcion.ts` (+ spec), el componente llama a la función.
**Refactor sin cambio de comportamiento** (misma fórmula/redondeo). Vectores definidos tras leer cada getter.
Extender `res-evaluaciones.service.spec.ts` con golden vectors de `calcularPuntajeTotal` (excluye No Aplica).

## Vectores dorados — Fase A (valores verificados a mano)
Helpers: `round2(x)=Math.round(x*100)/100`. `ValorIndicador = {valor,estado,meta,cumpleMeta}`.

**V1 calcularIndicadoresMes CON parámetros** — casos: AT mortal (dias_incapacidad 5), AT leve (3), 1 incidente;
param `{numero_trabajadores:50, horas_hombre:9600, metas:null}`; k=200000, anio 2026, mes 1 ⇒
`numAt 2, numAtMortales 1, numIncidentes 1, diasIncapacidad 8, diasCargados 0, numTrabajadores 50, horasHombre 9600, label 'Ene'`;
`frecuencia/tasa.valor 4`, `severidad.valor 16`, `indiceFrecuencia.valor 41.67`, `indiceSeveridad.valor 166.67`,
`indiceLesionIncapacitante.valor 6.94` (todos estado 'ok', meta null, cumpleMeta null).

**V2 calcularIndicadoresMes SIN parámetros** (param=null): 1 AT leve (dias 2) ⇒ los 6 indicadores
`{valor:null, estado:'pendiente_parametros', meta:null, cumpleMeta:null}`; `numTrabajadores null, horasHombre null`.

**V3 calcularPeriodo** base=[V1, mes2]; mes2 = calcularIndicadoresMes(1 AT leve dias 4, mismo param, mes 2).
`calcularPeriodo(base,'Q1 2026',[1,2,3],200000)` ⇒ `numAt 3, numAtMortales 1, diasIncapacidad 12, trabajadoresProm 50, horasHombreTotal 19200`;
`frecuencia/tasa 6`, `severidad 24`, `indiceFrecuencia 31.25`, `indiceSeveridad 125`, `indiceLesionIncapacitante 3.91`,
`proporcionMortalidad.valor 33.33`.

**V4 calcularTriangulo** — 1 mortal, 2 grave, 3 leve AT + 4 incidentes ⇒ `{mortal 1, grave 2, leve 3, casiAccidente 4, ratio '1 : 2 : 3 : 4'}`.
Sin mortal (1 grave, 1 leve, 1 incidente) ⇒ `ratio '0 : 1 : 1 : 1'`.

**V5 calcularDiasSinAccidentes** (mockDate '2026-04-01T00:00:00Z') fechas `['2026-01-10','2026-03-01']` ⇒
`{dias 31, fechaUltimoAt '2026-03-01', record 50}`. Vacío `[]` ⇒ `{dias:null, fechaUltimoAt:null, record:null}`.

**V6 calcularCumplimiento** (mockDate '2026-06-01T00:00:00Z') acciones:
cerrada(comp '2026-05-01', cierre '2026-04-20'); cerrada(comp '2026-04-01', cierre '2026-05-10');
pendiente(comp '2026-05-01'); en_progreso(comp '2026-12-01'); pendiente(comp null) ⇒
`{total 5, cerradasATiempo 1, cerradasTarde 1, vencidas 1, enProgreso 1, pendientes 1, pctCerradasATiempo 50}`.

## Validación
- `npm run build -- --configuration=development` compila (solo warning exceljs).
- `ng test --watch=false --browsers=ChromeHeadlessNoSandbox` verde; único rojo = base `AppComponent`.
- `npx playwright install chromium` + `npm run e2e` (smoke/guard en verde; autenticado skip sin env). Si el serve/navegador
  no levanta en el entorno del agente, reportar y dejar los specs (siguen siendo red de seguridad ejecutable por el usuario).
- ≤200 líneas/archivo; funciones ≤30; sin `any` injustificado.
