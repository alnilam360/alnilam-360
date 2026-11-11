# Commit al terminar

- Tarea terminada y **verificada** (build + lint + tests en verde para lo tocado) ⇒ **commit local sin preguntar**, solo con lo de esa tarea y su tracker (último ítem «Commit» marcado `[x]` con fecha).
- Si algo no pasa, **no se commitea**: se reporta con la salida real del comando.
- `git add <rutas explícitas>` siempre; nunca `git add -A`/`.`.
- Mensaje en español, imperativo, con prefijo (`feat:`/`fix:`/`chore:`…). **Sin `Co-Authored-By`.**
- **Siguen pidiendo OK explícito:** `push`, abrir PR, merge a la rama de producción, deploy, y toda mutación en prod vía MCP (`apply_migration`/`execute_sql`), cambios de RLS o borrados, y reescribir historia.

**Por qué:** "verde para lo tocado" ≠ repo en verde: el lint arrastra 106 errores pre-existentes y un test base roto (ver `ops/testing-suite-verde.md`); bloquear por deuda ajena paraliza el trabajo.
