---
paths:
  - "src/app/core/models/**"
  - "database/**"
---
# Tipos y contratos

- **Hoy los tipos son modelos TS escritos a mano** en `src/app/core/models/*.model.ts` (no se usa `supabase gen types` en el flujo). Son el contrato entre BD y cliente.
- Cambiar una columna/firma en una migración ⇒ actualizar el modelo correspondiente **en el mismo plan** y revisar sus consumidores (services/components).
- Las interfaces del cliente derivan de esos modelos; no redefinir la misma entidad en dos sitios.
- Referencia opcional para contrastar: `mcp__supabase__generate_typescript_types` genera los tipos del esquema remoto; úsalo para **verificar** que el modelo a mano coincide, no como fuente que se commitea.

**Por qué:** editar una columna sin tocar su modelo dejó `undefined` silenciosos en runtime; el modelo y la migración cambian juntos.
