---
paths:
  - "database/migrations/**"
  - "database/seeds/**"
---
# Migraciones (MCP, sin CLI local)

- Las migraciones viven en `database/migrations/` con nombre `AAAA_MM_DD_NN_<slug>.sql` (NN = orden del día). Seeds en `database/seeds/`.
- **Idempotentes:** `IF NOT EXISTS`, `CREATE OR REPLACE`, seeds con `WHERE NOT EXISTS`.
- **Nunca editar una migración ya aplicada** — se crea otra nueva. Revisar el timestamp más alto antes de numerar (sesiones paralelas).
- Se aplican a la BD remota con el MCP de Supabase: `mcp__supabase__apply_migration` (DDL) / `mcp__supabase__execute_sql` (consultas/seeds). **No hay `supabase db reset` ni stack local.**
- Aplicar a prod es irreversible ⇒ mostrar el SQL y esperar **OK explícito** (ver `commit-al-terminar.md`).
- Si una migración cambia un índice/constraint/firma de función, planear el impacto en el cliente (modelos TS que la consumen).

**Por qué:** no existe entorno Supabase local; todo cambio va directo al proyecto remoto, así que la idempotencia y el OK previo son la única red de seguridad.
