---
paths:
  - "database/**"
  - "src/app/core/**"
  - "src/app/modules/**"
---
# Multi-empresa (tenant por `empresa_id`)

- Toda tabla de negocio lleva `empresa_id` y su **policy RLS filtra por la empresa efectiva** del usuario. **Fail-closed:** ante ambigüedad ⇒ **cero filas**, jamás «sin filtro = todo».
- Consultas por id no devuelven filas de otra empresa: resultado **vacío/404**, no un `403` revelador.
- El **super admin no es una empresa**; su alcance ampliado se decide en el servidor, no abriendo RLS.
- La **empresa activa se resuelve en UN solo lugar**: `src/app/core/services/tenant.service.ts` (+ claim del JWT / función SQL), nunca recalculada en cada componente.
- Cliente Supabase único: `SupabaseClientService`. No crear clientes nuevos por módulo.

**Por qué:** una policy con `using (true)` “temporal” expuso filas de otra empresa; desde entonces el filtro de tenant es obligatorio y fail-closed.
