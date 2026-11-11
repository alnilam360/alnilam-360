---
paths:
  - "angular.json"
  - "package.json"
  - "vercel.json"
---
# Gates y deploy

| Gate | Comando (verificado) | Qué custodia |
| :-- | :-- | :-- |
| Build | `npm run build` (prod) / `npm run build -- --configuration=development` | compila + tipos `strict`; prod aplica budgets (2mb warn / 5mb error) |
| Lint | `npm run lint` | estilo/errores Angular; gate = **sin errores nuevos** en lo tocado |
| Tests | `npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox` (con `CHROME_BIN`) | suite unitaria headless |
| RLS/seguridad | `mcp__supabase__get_advisors` (security) | tras cambios de esquema/policies |

- **No hay pipeline CI** (`.github/` ausente). El deploy es **Vercel** sobre `www/` al integrar a `main`. Un gate no se relaja para «sacar rápido».
- **Post-deploy (manual, obligatorio):** abrir la app, hacer login, correr una consulta que dependa de RLS y revisar logs (`mcp__supabase__query_logs`). Nada se da por desplegado sin verificar.

**Por qué:** sin CI que bloquee, el único gate es correr estos comandos a mano antes del merge; saltárselos ya metió una regresión a `main`.
