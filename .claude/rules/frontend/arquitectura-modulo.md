---
paths:
  - "src/app/**"
---
# Arquitectura de módulo

- Un módulo por carpeta en `src/app/modules/<modulo>/` con su `<modulo>.module.ts` (NgModule, lazy-loaded por ruta). Dentro: `pages/`, `components/`, `services/` (o core), `models/`, `funciones/`.
- `funciones/*.funcion.ts` **puras** (sin DI) con su `.spec.ts`; el componente y el service orquestan.
- Lo transversal vive en `src/app/core/` (servicios singleton, guards, models) y lo reutilizable en `src/app/shared/`. Un módulo **no importa** de la carpeta interna de otro módulo; lo compartido por 2+ módulos sube a `shared/` o `core/`.
- Sin ciclos entre módulos. El cliente Supabase se inyecta desde `SupabaseClientService` (core), nunca creado dentro de un módulo.
- NgModules, no standalone (el repo tiene `@angular-eslint/prefer-standalone: off`); sigue el patrón existente.

**Por qué:** importar directo el service interno de otro módulo creó un ciclo que rompía el lazy-loading; lo compartido debe pasar por `shared/`/`core/`.
