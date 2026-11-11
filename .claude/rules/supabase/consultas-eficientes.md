---
paths:
  - "src/app/core/services/**"
  - "src/app/modules/**"
---
# Consultas eficientes

- **Sin N+1:** nada de llamadas a Supabase dentro de un `for`/`map` async; resolver con un `in(...)`, un join embebido o una RPC.
- `select` con **columnas explícitas**, no `select('*')`.
- Paginar en servidor con `.range(desde, hasta)`; **no** traer todo y filtrar en memoria.
- Índices para las columnas de filtro y de RLS (`empresa_id`, FKs).
- **Manejar siempre el `error`** de Supabase (`{ data, error }`): nunca tragarlo; un error de carga se pinta como error, no como «no hay registros» (ver `frontend/fechas-y-http.md`).

**Por qué:** cargar el detalle de cada registro en un bucle disparaba decenas de requests y colgaba la vista; una sola consulta con join lo resolvió.
