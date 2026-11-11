---
paths:
  - "**/*.spec.ts"
  - "karma.conf.js"
---
# Testing

- Runner: Karma + Jasmine. Correr headless con:
  `CHROME_BIN="<ruta a chrome.exe>" npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox`
  (launcher `ChromeHeadlessNoSandbox` definido en `karma.conf.js`; en Windows la ruta típica es `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`).
- Cálculo puro ⇒ `.spec.ts` con casos borde: `0`, `null`, negativos, redondeo `.5`, fin de mes. Vive al lado de la `*.funcion.ts`.
- **Bug arreglado ⇒ test que lo reproduce** (falla antes, pasa después).
- Funciones SQL/RLS críticas: no hay pgTAP ni stack local; verificarlas con `mcp__supabase__execute_sql` (consulta que prueba el caso) y dejar el vector documentado en la migración.
- Un test ≤ 200 líneas.

**Por qué:** la aritmética de indicadores solo es testeable barata si vive en funciones puras con su `.spec`; sin eso cada cambio exigía levantar toda la app.
