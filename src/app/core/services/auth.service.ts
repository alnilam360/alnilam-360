import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, ReplaySubject, first, timeout } from 'rxjs';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';
import { Usuario } from '../models/models';

export interface AuthState {
    user: User | null;
    session: Session | null;
    perfil: Usuario | null;
    isLoading: boolean;
    isReady: boolean;
}

const INITIAL_AUTH_STATE: AuthState = {
    user: null,
    session: null,
    perfil: null,
    isLoading: true,
    isReady: false
};

@Injectable({
    providedIn: 'root'
})
export class AuthService implements OnDestroy {

    private readonly _authState$ = new BehaviorSubject<AuthState>(INITIAL_AUTH_STATE);
    private authSubscription: { unsubscribe: () => void } | null = null;
    private _isReady$ = new ReplaySubject<boolean>(1);
    private _profileReady$ = new ReplaySubject<Usuario | null>(1);
    private readyEmitted = false;
    private profileEmitted = false;

    readonly authState$: Observable<AuthState> = this._authState$.asObservable();
    readonly isReady$: Observable<boolean> = this._isReady$.asObservable();
    readonly profileReady$: Observable<Usuario | null> = this._profileReady$.asObservable();

    constructor(
        private readonly sb: SupabaseClientService,
        private readonly router: Router
    ) {
        this.initAuthListener();
    }

    // ==================== PUBLIC API ====================

    waitForReady(timeoutMs = 8000): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.isReady$.pipe(first(), timeout(timeoutMs)).subscribe({
                next: () => resolve(true),
                error: () => {
                    console.warn('[AuthService] waitForReady timeout');
                    this.markReady();
                    resolve(false);
                }
            });
        });
    }

    async signIn(email: string, password: string): Promise<User> {
        const { data, error } = await this.sb.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw this.mapAuthError(error);
        }

        // Emitir estado autenticado INMEDIATAMENTE (sin esperar perfil)
        this._authState$.next({
            user: data.user,
            session: data.session,
            perfil: null,
            isLoading: false,
            isReady: true
        });
        this.markReady();

        // Cargar perfil en background
        this.loadProfileInBackground(data.user.id, data.session);

        return data.user;
    }

    async signUp(email: string, password: string): Promise<User | null> {
        const { data, error } = await this.sb.client.auth.signUp({ email, password });
        if (error) throw this.mapAuthError(error);
        return data.user;
    }

    async signOut(): Promise<void> {
        const { error } = await this.sb.client.auth.signOut();
        if (error) console.error('Error al cerrar sesión:', error.message);

        this._authState$.next({ ...INITIAL_AUTH_STATE, isLoading: false, isReady: true });
        this.router.navigate(['/auth']);
    }

    async getSession(): Promise<Session | null> {
        const { data, error } = await this.sb.client.auth.getSession();
        if (error) { console.error('Error sesión:', error.message); return null; }
        return data.session;
    }

    async getCurrentUser(): Promise<User | null> {
        const { data, error } = await this.sb.client.auth.getUser();
        if (error) return null;
        return data.user;
    }

    async getUsuarioPerfil(): Promise<Usuario | null> {
        const user = await this.getCurrentUser();
        if (!user) return null;

        const { data, error } = await this.sb.client
            .from('usuarios')
            .select('*, empresa:empresas(id, nombre)')
            .eq('auth_id', user.id)
            .maybeSingle();

        if (error) { console.error('Error perfil:', error.message); return null; }
        return data;
    }

    get currentAuthState(): AuthState { return this._authState$.value; }
    get isAuthenticated(): boolean { return this._authState$.value.user !== null; }
    get currentPerfil(): Usuario | null { return this._authState$.value.perfil; }

    /**
     * Espera a que el perfil del usuario esté disponible.
     * Devuelve el perfil cacheado si ya existe, o espera a que se cargue.
     */
    async waitForProfile(timeoutMs = 8000): Promise<Usuario | null> {
        const cached = this._authState$.value.perfil;
        if (cached) return cached;
        return new Promise<Usuario | null>((resolve) => {
            this.profileReady$.pipe(first(), timeout(timeoutMs)).subscribe({
                next: (p) => resolve(p),
                error: () => {
                    console.warn('[AuthService] waitForProfile timeout');
                    resolve(null);
                }
            });
        });
    }

    ngOnDestroy(): void { this.authSubscription?.unsubscribe(); }

    // ==================== PRIVATE ====================

    private markReady(): void {
        if (!this.readyEmitted) {
            this.readyEmitted = true;
            this._isReady$.next(true);
            console.log('[AuthService] ✅ isReady emitido');
        }
    }

    private initAuthListener(): void {
        const { data } = this.sb.client.auth.onAuthStateChange(
            (event: AuthChangeEvent, session: Session | null) => {
                console.log('[AuthService] onAuthStateChange:', event, !!session);
                this.handleAuthChange(event, session);
            }
        );
        this.authSubscription = data.subscription;

        // Safety timeout — garantiza que isReady$ siempre se emita
        setTimeout(() => {
            if (!this.readyEmitted) {
                console.warn('[AuthService] Safety timeout — forzando isReady');
                this._authState$.next({ ...INITIAL_AUTH_STATE, isLoading: false, isReady: true });
                this.markReady();
            }
        }, 4000);
    }

    /**
     * Maneja eventos de auth. CLAVE: emitir isReady$ ANTES de cargar perfil.
     * En Supabase v2.98.0, la restauración de sesión emite SIGNED_IN
     * (no INITIAL_SESSION).
     */
    private handleAuthChange(event: AuthChangeEvent, session: Session | null): void {
        switch (event) {
            case 'INITIAL_SESSION':
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED': {
                if (session?.user) {
                    // PASO 1: Emitir estado con sesión INMEDIATAMENTE
                    this._authState$.next({
                        user: session.user,
                        session,
                        perfil: this._authState$.value.perfil, // mantener perfil previo si existe
                        isLoading: false,
                        isReady: true
                    });
                    this.markReady();

                    // PASO 2: Cargar perfil en background (NO bloquea)
                    this.loadProfileInBackground(session.user.id, session);
                } else {
                    this._authState$.next({ ...INITIAL_AUTH_STATE, isLoading: false, isReady: true });
                    this.markReady();
                    this.emitProfile(null);
                }
                break;
            }
            case 'SIGNED_OUT': {
                this._authState$.next({ ...INITIAL_AUTH_STATE, isLoading: false, isReady: true });
                this.markReady();
                this.emitProfile(null);
                break;
            }
            default: {
                if (!this.readyEmitted) this.markReady();
                break;
            }
        }
    }

    /**
     * Carga perfil sin bloquear. Si falla, no rompe nada.
     */
    private loadProfileInBackground(authUserId: string, session: Session): void {
        this.loadUserProfile(authUserId, session.user.email ?? null).then(perfil => {
            if (perfil) {
                this._authState$.next({
                    user: session.user,
                    session,
                    perfil,
                    isLoading: false,
                    isReady: true
                });
            }
            this.emitProfile(perfil);
        }).catch(err => {
            console.warn('[AuthService] Error cargando perfil (no bloqueante):', err);
            this.emitProfile(null);
        });
    }

    private emitProfile(perfil: Usuario | null): void {
        this.profileEmitted = true;
        this._profileReady$.next(perfil);
        console.log('[AuthService]', perfil ? '✅ Perfil cargado' : '⚠️ Sin perfil', perfil?.nombre ?? '');
    }

    /**
     * Carga el perfil del usuario:
     *  1. Busca por `auth_id` (vínculo directo).
     *  2. Si no encuentra, busca por `email` (fallback para usuarios
     *     creados antes de la integración auth).
     *  3. Si encuentra por email, auto-vincula `auth_id` para que
     *     futuros logins funcionen directamente.
     */
    private async loadUserProfile(authUserId: string, email?: string | null): Promise<Usuario | null> {
        try {
            // 1) Búsqueda por auth_id
            const { data, error } = await this.sb.client
                .from('usuarios')
                .select('*, empresa:empresas(id, nombre)')
                .eq('auth_id', authUserId)
                .maybeSingle();

            if (error) {
                console.warn('[AuthService] Error buscando por auth_id:', error.message);
            }

            if (data) return data;

            // 2) Fallback: búsqueda por email
            if (email) {
                console.log('[AuthService] auth_id no encontrado, buscando por email:', email);
                const { data: byEmail, error: errEmail } = await this.sb.client
                    .from('usuarios')
                    .select('*, empresa:empresas(id, nombre)')
                    .eq('email', email)
                    .maybeSingle();

                if (errEmail) {
                    console.warn('[AuthService] Error buscando por email:', errEmail.message);
                    return null;
                }

                if (byEmail) {
                    // 3) Auto-vincular auth_id para futuros logins
                    console.log('[AuthService] Vinculando auth_id al usuario:', byEmail.nombre);
                    const { error: errUpdate } = await this.sb.client
                        .from('usuarios')
                        .update({ auth_id: authUserId })
                        .eq('id', byEmail.id);

                    if (errUpdate) {
                        console.warn('[AuthService] No se pudo vincular auth_id:', errUpdate.message);
                    } else {
                        byEmail.auth_id = authUserId;
                    }
                    return byEmail;
                }
            }

            console.warn('[AuthService] No se encontró perfil para auth_id ni email.');
            return null;
        } catch {
            return null;
        }
    }

    private mapAuthError(error: { message: string; status?: number }): Error {
        const errorMap: Record<string, string> = {
            'Invalid login credentials': 'Credenciales inválidas. Verifica tu correo y contraseña.',
            'Email not confirmed': 'Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.',
            'User already registered': 'Este correo ya está registrado.',
            'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
            'Email rate limit exceeded': 'Demasiados intentos. Intenta de nuevo en unos minutos.',
            'User not found': 'No se encontró un usuario con este correo.',
        };
        return new Error(errorMap[error.message] ?? `Error de autenticación: ${error.message}`);
    }
}
