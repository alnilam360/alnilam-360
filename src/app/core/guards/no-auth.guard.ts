import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege la ruta de login.
 * Redirige a /dashboard si el usuario YA está autenticado.
 * Espera a que AuthService termine de inicializar antes de decidir.
 */
@Injectable({
    providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

    constructor(
        private readonly authService: AuthService,
        private readonly router: Router
    ) { }

    async canActivate(): Promise<boolean | UrlTree> {
        // Esperar a que la sesión se haya restaurado (max 5 segundos)
        await this.authService.waitForReady(5000);

        // Verificar el estado de autenticación
        const state = this.authService.currentAuthState;

        if (state.user || state.session) {
            // Ya está autenticado → redirigir al dashboard
            return this.router.createUrlTree(['/dashboard']);
        }

        // No hay sesión → permitir acceder al login
        return true;
    }
}
