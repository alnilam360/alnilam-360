import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard único que protege rutas privadas.
 * Espera a que AuthService termine su inicialización (INITIAL_SESSION)
 * y redirige a /auth si no hay sesión activa.
 */
@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(
        private readonly authService: AuthService,
        private readonly router: Router
    ) { }

    async canActivate(): Promise<boolean | UrlTree> {
        // Esperar a que auth se inicialice completamente
        await this.authService.waitForReady(8000);

        const state = this.authService.currentAuthState;

        if (state.session && state.user) {
            return true;
        }

        return this.router.createUrlTree(['/auth']);
    }
}
