# Mapa del repo — Alnilam 360

SG-SST (Colombia). Cliente **Ionic 8 + Angular 20 (NgModules) + Tailwind 3 + PrimeNG 19 + Capacitor 8**. Backend **Supabase** (Postgres/Auth/RLS/RPC/Storage) operado por **MCP** (no hay CLI local ni carpeta `supabase/`).

## Quién vive dónde

| Ruta | Qué es |
| :-- | :-- |
| `src/app/modules/<modulo>/` | Módulos de negocio (lazy NgModules): `auth`, `dashboard`, `personal`, `indicadores`, `matriz-legal`, `gestion-sst`, `documentos`, `formatos`, `auditorias`, `reportes`, `calendario`, `configuracion`, `usuarios` |
| `src/app/core/` | Singletons: `services/` (incl. `supabase-client.service.ts`, `tenant.service.ts`, `auth.service.ts`), `models/*.model.ts`, `guards/`, `config/` |
| `src/app/shared/` | Componentes/utilidades reutilizables |
| `src/app/layout/` | Layout (sidebar, shell) |
| `src/environments/` | `environment.ts` / `environment.prod.ts` (`supabaseUrl`, `supabaseKey`) |
| `src/theme/variables.scss` | Variables de tema Ionic (fuente de tokens de color) |
| `database/migrations/` | Migraciones SQL `AAAA_MM_DD_NN_<slug>.sql` (aplicadas por MCP) |
| `database/seeds/` | Seeds SQL idempotentes |
| `.claude/rules/` | Reglas por faceta (transversal/supabase/frontend/ops) |
| `.claude/agents/` | Subagentes N1/N2 (ver `.claude/skills/orquestar/SKILL.md`) |
| `gestion/` | `fase_de_desarrollo/` (planes), `tracker/` (estado), `tracker_historico/` |
| `tools/plan/` | `nuevo-plan.mjs` + tests |

## Comandos (verificados en esta máquina)

| Acción | Comando | Estado verificado |
| :-- | :-- | :-- |
| Servir | `npm start` (ng serve, :4200) | — |
| Build | `npm run build` (prod) · `npm run build -- --configuration=development` | ✅ build dev exit 0 |
| Lint | `npm run lint` | ⚠️ corre; **106 errores pre-existentes** (ver abajo) |
| Tests | `CHROME_BIN="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" npx ng test --watch=false --browsers=ChromeHeadlessNoSandbox` | ⚠️ corre headless; **1 fallo base** |
| Nuevo plan | `node tools/plan/nuevo-plan.mjs <slug> "<Título>"` | ✅ |
| Test del script | `node --test tools/plan/tests/nuevo-plan.test.mjs` | ✅ 7/7 |
| Sync nativo | `npx cap sync` | — |

## Backend por MCP (servidor `supabase`)
- Esquema/datos: `mcp__supabase__list_tables`, `list_migrations`, `execute_sql`, `apply_migration`.
- Seguridad/salud: `mcp__supabase__get_advisors`, `query_logs`.
- Tipos: modelos a mano en `core/models`; `generate_typescript_types` solo para contrastar.

## Estado conocido (deuda pre-existente, al 2026-11-11)
- **Tests:** falla `AppComponent should have urls` (`src/app/app.component.spec.ts`, starter de Ionic desactualizado). 50 pasan, 1 skip.
- **Lint:** 106 errores (mayoría `@angular-eslint/prefer-inject`; + parse error en `src/assets/email-templates/invite-user.html`).
- No hay CI (`.github/` ausente). Deploy = **Vercel** sobre `www/`.
- Regla operativa: mide tu **delta** (cero rojos/lint nuevos en lo que tocas), no el estado absoluto. Ver `.claude/rules/ops/testing-suite-verde.md`.
