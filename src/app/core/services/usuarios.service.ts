import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Usuario } from '../models/models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UsuariosService {

    constructor(private sb: SupabaseClientService) { }

    async getUsuarios(): Promise<Usuario[]> {
        const { data, error } = await this.sb.client
            .from('usuarios')
            .select('*, empresa:empresas(id, nombre)')
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async getUsuariosByEmpresa(empresaId: string): Promise<Usuario[]> {
        const { data, error } = await this.sb.client
            .from('usuarios')
            .select('*, empresa:empresas(id, nombre)')
            .eq('empresa_id', empresaId)
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    /**
     * Crea un usuario invitándolo vía Supabase Auth.
     *
     * Flujo:
     * 1. Llama al Edge Function `invite-user` que usa `auth.admin.inviteUserByEmail()`.
     * 2. Supabase envía un email al usuario con un link para asignar su contraseña.
     * 3. El Edge Function también crea el perfil en la tabla `usuarios` con `auth_id`.
     *
     * El parámetro `redirectTo` dirige al usuario a la ruta `/auth/asignar-password`
     * donde podrá establecer su contraseña.
     */
    async createUsuario(usuario: Partial<Usuario>): Promise<Usuario> {
        const email = usuario.email?.trim();
        if (!email) {
            throw new Error('El correo electrónico es requerido.');
        }

        // Forzar refresh de sesión para garantizar token válido
        const { data: sessionData, error: sessionError } = await this.sb.client.auth.getSession();

        if (sessionError) {
            console.error('Error obteniendo sesión:', sessionError.message);
        }

        let accessToken = sessionData?.session?.access_token;

        // Si el token no existe, intentar refrescar
        if (!accessToken) {
            const { data: refreshData, error: refreshError } = await this.sb.client.auth.refreshSession();
            if (refreshError || !refreshData?.session) {
                throw new Error(
                    'No hay sesión activa. Por favor, inicie sesión nuevamente antes de crear usuarios.'
                );
            }
            accessToken = refreshData.session.access_token;
        }

        // Construir redirectTo dinámicamente según el entorno
        const baseUrl = environment.production
            ? (environment as any).siteUrl || window.location.origin
            : window.location.origin;
        const redirectTo = `${baseUrl}/auth/asignar-password`;

        const { data, error } = await this.sb.client.functions.invoke('invite-user', {
            body: {
                email,
                nombre: usuario.nombre,
                rol_id: usuario.rol_id || null,
                empresa_id: usuario.empresa_id,
                telefono: usuario.telefono || null,
                cargo: usuario.cargo || null,
                estado: usuario.estado ?? true,
                redirectTo
            },
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Manejar errores del SDK (transport, timeout, etc.)
        if (error) {
            const edgeMsg = typeof error === 'object' && error !== null && 'message' in error
                ? (error as { message: string }).message
                : String(error);
            throw new Error(`Error al invocar Edge Function: ${edgeMsg}`);
        }

        // Manejar errores lógicos retornados por la función
        if (data?.error) {
            throw new Error(data.error);
        }

        return data?.data;
    }

    async updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario> {
        const { empresa, ...updateData } = usuario as any;
        const { data, error } = await this.sb.client
            .from('usuarios')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*, empresa:empresas(id, nombre)')
            .single();
        if (error) throw error;
        return data;
    }

    async deleteUsuario(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('usuarios')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
