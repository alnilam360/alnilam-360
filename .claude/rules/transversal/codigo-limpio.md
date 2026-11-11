---
paths:
  - "src/app/**"
  - "tools/**"
---
# Código limpio

- Máx. **200 líneas por archivo**; funciones ≤ ~30 líneas, una responsabilidad, ≤ 3 niveles de anidación, early return.
- Una carpeta por módulo (`src/app/modules/<modulo>/`). **Lógica pura separada de I/O:** cálculos en `funciones/*.funcion.ts` sin DI; el componente y el service son orquestadores delgados.
- **Reusar antes de crear:** busca el service/función/helper que ya lo resuelve (p. ej. `TenantService` para empresa activa, `SupabaseClientService` para el cliente).
- Dominio en español, técnico en inglés. Comentarios solo para el *por qué*.
- Sin código muerto, `console.log` ni `TODO` sin dueño.
- TypeScript `strict` (ya activo en `tsconfig.json`), sin `any` injustificado.
- Todo archivo con lógica partida lleva su `.spec.ts` al lado.

**Por qué:** componentes de miles de líneas con cálculo y I/O mezclados hacían imposible testear la aritmética de indicadores sin levantar Angular.
