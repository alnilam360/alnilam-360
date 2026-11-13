import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolesService } from '../services/roles.service';

const ROLES_ADMIN = ['ADMINISTRADOR', 'ADMIN', 'SUPERADMIN', 'SUPER ADMIN'];

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private rolesService: RolesService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const perfil = await this.authService.waitForProfile(5000);
    if (!perfil) return this.router.createUrlTree(['/auth']);

    const rolNombre = (perfil.rol ?? '').toString().trim().toUpperCase();
    if (ROLES_ADMIN.includes(rolNombre)) return true;

    const modulo = route.data?.['modulo'] as string | undefined;
    // Fail-open (sin modulo, sin rol_id, lista vacia o error): coherente con el filtrado del sidebar; la RLS protege los datos.
    if (!modulo || !perfil.rol_id) return true;

    try {
      const permitidos = await this.rolesService.getModulosPermitidos(perfil.rol_id);
      if (permitidos.length === 0 || permitidos.includes(modulo)) return true;
      return this.router.createUrlTree(['/dashboard']);
    } catch (e) {
      console.error('[PermissionGuard] error cargando permisos:', e);
      return true;
    }
  }
}
