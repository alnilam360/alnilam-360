# CLAUDE.md — Alnilam 360

SG-SST (Colombia). **Ionic 8 + Angular 20 (NgModules) + Tailwind 3 + PrimeNG 19 + Capacitor 8** en cliente; **Supabase** (Postgres/Auth/RLS/RPC/Storage) como backend, operado por **MCP** (no hay CLI local). Dominio en español, técnico en inglés.

> Al editar reglas: **un archivo = un tema y < 40 líneas**. Cada edición de este archivo invalida la caché de prompt: tócalo poco.

## Reglas por carpeta (se cargan al tocar sus `paths`)

| Carpeta | Tema | Se carga al tocar |
| :-- | :-- | :-- |
| `transversal/` | reparto-modelos, codigo-limpio, commit-al-terminar, una-sesion-por-plan, sesion-hija-a-main, multi-empresa-alcance | siempre (salvo las que fijan `paths` de código) |
| `supabase/` | migraciones-flujo, rls-y-seguridad, rpc-y-calculos, tipos-y-contratos, consultas-eficientes | `database/**`, servicios que consultan Supabase |
| `frontend/` | arquitectura-modulo, change-detection, templates-y-estado, ionic-tailwind, capacitor-movil, fechas-y-http, formularios-sgsst | `src/app/**`, estilos |
| `ops/` | testing, testing-suite-verde, cicd-gates, entorno-local | `**/*.spec.ts`, `karma.conf.js`, CI |

Detalle en `.claude/rules/<carpeta>/<tema>.md`. Protocolo de orquestación: `.claude/skills/orquestar/SKILL.md`. Mapa del repo y comandos: `docs/mapa-repo.md`.

## Mentalidad senior

- **El código y las migraciones actuales son la fuente de verdad.** Mínima superficie de cambio; decide por trade-offs explícitos.
- Correctitud de datos, contratos e idempotencia. Migraciones idempotentes (`IF NOT EXISTS`, `CREATE OR REPLACE`); **nunca reescribas una migración ya aplicada**, crea otra.
- **Refactor ≠ cambio de comportamiento:** preserva UI, contratos, lógica y aritmética (redondeos e indicadores incluidos).
- **Valida lo que tocas** (build + lint + tests) y reporta fallos con su salida real, sin maquillar. **Mide, no supongas:** un bug se diagnostica con datos fechados (query, request real, log), no leyendo código.
- **Confirma antes de lo irreversible** (`apply_migration`/`execute_sql` que mutan prod, cambios de RLS, borrados, deploys): muestra el plan y espera OK explícito.
- **Reusa antes de crear:** busca el helper/servicio/función SQL que ya lo resuelve; duplicar una regla ya dio números distintos.
- **El cómputo pesado va a la base de datos** (funciones/vistas/RPC), no a bucles ni sumas en memoria del cliente.
- **Seguridad por RLS, no por UI:** `*ngIf`/`@if` es UX, no seguridad. La `service_role` key jamás llega al cliente.
- Credenciales solo desde `src/environments/*` o entorno; nunca hardcodeadas ni repetidas en el chat.

## Workflow obligatorio antes de escribir código funcional

0. **Releer el reparto de modelos** (`.claude/rules/transversal/reparto-modelos.md`).
1. **Plan:** `node tools/plan/nuevo-plan.mjs <slug> "<Título>"` → enfoque, archivos a crear/modificar, cambios de BD, reglas de negocio, casos de prueba.
2. **Tracker:** `gestion/tracker/NN_<slug>.md` con checklist granular `- [ ]` → `- [~]` → `- [x]`. Es la **única fuente de verdad** del estado; último ítem = «Commit».

## Sesiones en paralelo

- Nunca pisar el tracker/plan/migración de otra sesión.
- `git add <rutas explícitas> && git commit` en una sola operación. **Jamás** `git add -A`/`.`, **jamás** `--amend` ni reescribir commits ajenos.
- Para otra rama: **worktree** (ver `transversal/sesion-hija-a-main.md`).

## Git y atribución

- **Sin atribución de IA** en commits ni PRs (nada de `Co-Authored-By`). Respaldo en `.claude/settings.json`: `"includeCoAuthoredBy": false`.
- Commits en español, imperativo, con prefijo (`feat:`, `fix:`, `chore:`…). Push con la cuenta del proyecto; push/PR/merge requieren **OK explícito**.

## Deploy

- Deploy = Vercel sobre `www/` al integrar a `main` (no hay pipeline CI aún). Solo con **OK explícito** y verificación post-deploy (carga de la app, login, una consulta con RLS).
