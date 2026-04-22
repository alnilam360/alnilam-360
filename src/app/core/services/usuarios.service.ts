import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Usuario } from '../models/models';

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
     */
    async createUsuario(usuario: Partial<Usuario>): Promise<Usuario> {
        const email = usuario.email?.trim();
        if (!email) {
            throw new Error('El correo electrónico es requerido.');
        }

        const { data: sessionData } = await this.sb.client.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        const { data, error } = await this.sb.client.functions.invoke('invite-user', {
            body: {
                email,
                nombre: usuario.nombre,
                rol_id: usuario.rol_id || null,
                empresa_id: usuario.empresa_id,
                telefono: usuario.telefono || null,
                cargo: usuario.cargo || null,
                estado: usuario.estado ?? true
            },
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
        });

        if (error) {
            throw new Error(error.message || 'Error al crear usuario.');
        }

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
