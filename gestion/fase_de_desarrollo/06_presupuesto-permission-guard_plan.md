# Plan 06 — Guard de permiso por ruta (presupuesto)

> Fecha: 2026-11-13 · Tracker: [gestion/tracker/06_presupuesto-permission-guard.md](../tracker/06_presupuesto-permission-guard.md)

## Objetivo
Cerrar el acceso por URL directa a módulos que el rol no tiene permitidos. Hoy el único guard es
`AuthGuard` (autenticación); el menú filtra por rol pero es solo UX: un usuario puede abrir
`/presupuesto/*` escribiendo la URL aunque su rol no lo vea. Se añade un `PermissionGuard` reusable,
cableado primero en Presupuesto (data financiera).

## Enfoque arquitectónico
- Guard **cliente** (no reemplaza a la RLS, la complementa): bloquea la navegación por URL. La RLS por
  empresa sigue siendo la seguridad real del dato. (multi-empresa, rls-y-seguridad)
- **Reutilizable**: lee `route.data.modulo` (el id del menú, que ya es el `modulo_id` de `roles_permisos`).
- **Mismo contrato que el sidebar** (coherencia, sin sorpresas): admin ve todo; sin `rol_id` o sin permisos
  cargados ⇒ fail-open (permite), igual que `sidebar.component.ts`. Solo bloquea el caso deliberado
  (rol con permisos cargados que NO incluye el módulo).
- Reparto: Opus diseña/revisa; **cliente-web (Sonnet)** implementa.

## Archivos a crear/modificar
- `src/app/core/guards/permission.guard.ts` (NUEVO) — `PermissionGuard implements CanActivate`.
- `src/app/app-routing.module.ts` — en la ruta `presupuesto`: `canActivate: [PermissionGuard]`, `data: { modulo: 'presupuesto' }`.

## Cambios de BD / SQL / RLS
Ninguno.

## Reglas de negocio (contrato del guard)
`canActivate(route)`:
1. `perfil = await authService.waitForProfile(5000)`. Si no hay perfil ⇒ `UrlTree('/auth')`.
2. Admin (rol nombre en {ADMINISTRADOR, ADMIN, SUPERADMIN, SUPER ADMIN}, de `perfil.rol`) ⇒ `true`.
3. `modulo = route.data['modulo']`. Si no hay `modulo` ⇒ `true`.
4. `rolId = perfil.rol_id`. Si no hay `rolId` ⇒ `true` (fail-open, igual que sidebar).
5. `permitidos = await rolesService.getModulosPermitidos(rolId)`. Si `permitidos.length === 0` ⇒ `true` (fail-open).
6. `permitidos.includes(modulo)` ⇒ `true`; si no ⇒ `UrlTree('/dashboard')`.
   - Cualquier error al cargar permisos ⇒ `true` (no bloquear por fallo técnico; log con console.error).

## Casos de prueba
- Admin (rol 'ADMINISTRADOR') a /presupuesto ⇒ pasa.
- Rol con permisos {trabajadores, evaluaciones} (sin 'presupuesto') a /presupuesto ⇒ redirect /dashboard.
- Rol con 'presupuesto' entre sus permisos ⇒ pasa.
- Rol sin rol_id / sin permisos cargados ⇒ pasa (fail-open, como el menú).
- Sin perfil ⇒ redirect /auth.
