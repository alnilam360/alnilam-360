---
paths:
  - "database/**"
---
# RLS y seguridad

- RLS **habilitado en TODA tabla** de `public`. Policies explícitas por operación (`select`/`insert`/`update`/`delete`) y por rol. **Sin `using (true)`.**
- Filtro por `empresa_id` fail-closed (ver `transversal/multi-empresa-alcance.md`).
- Funciones `SECURITY DEFINER` con `search_path` fijo (`set search_path = public, pg_temp`) y validación de pertenencia **dentro** de la función.
- `service_role` solo en servidor; **jamás** en el bundle del cliente. El cliente usa la anon/publishable key.
- Buckets de Storage con policies por empresa.
- Revisar con `mcp__supabase__get_advisors` (categoría `security`) tras cambios de esquema/policies; resolver lo que marque.

**Por qué:** una policy `using (true)` “temporal” filtró datos entre empresas; el advisor de seguridad ahora es parte del checklist de toda migración.
