import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Rol, RolPermiso } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class RolesService {

    constructor(private sb: SupabaseClientService) { }

    // ==================== ROLES ====================

    async getRoles(): Promise<Rol[]> {
        const { data, error } = await this.sb.client
            .from('roles')
            .select('*')
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async getRolById(id: string): Promise<Rol | null> {
        const { data, error } = await this.sb.client
            .from('roles')
            .select('*, permisos:roles_permisos(*)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    async createRol(rol: Partial<Rol>): Promise<Rol> {
        const { data, error } = await this.sb.client
            .from('roles')
            .insert({
                empresa_id: rol.empresa_id,
                nombre: rol.nombre,
                descripcion: rol.descripcion || null
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateRol(id: string, rol: Partial<Rol>): Promise<Rol> {
        const { data, error } = await this.sb.client
            .from('roles')
            .update({
                nombre: rol.nombre,
                descripcion: rol.descripcion,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteRol(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('roles')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    // ==================== PERMISOS ====================

    async getPermisosByRol(rolId: string): Promise<RolPermiso[]> {
        const { data, error } = await this.sb.client
            .from('roles_permisos')
            .select('*')
            .eq('rol_id', rolId)
            .order('modulo_id');
        if (error) throw error;
        return data || [];
    }

    /**
     * Guarda los permisos de un rol.
     * Elimina todos los permisos existentes y los reinserta con soporte granular CRUD.
     */
    async savePermisos(rolId: string, permisos: {
        modulo_id: string;
        puede_ver: boolean;
        puede_crear?: boolean;
        puede_editar?: boolean;
        puede_eliminar?: boolean;
    }[]): Promise<void> {
        // Eliminar permisos existentes
        const { error: deleteError } = await this.sb.client
            .from('roles_permisos')
            .delete()
            .eq('rol_id', rolId);
        if (deleteError) throw deleteError;

        // Insertar los que tienen al menos un permiso activo
        const permisosActivos = permisos
            .filter(p => p.puede_ver || p.puede_crear || p.puede_editar || p.puede_eliminar)
            .map(p => ({
                rol_id: rolId,
                modulo_id: p.modulo_id,
                puede_ver: !!p.puede_ver,
                puede_crear: !!p.puede_crear,
                puede_editar: !!p.puede_editar,
                puede_eliminar: !!p.puede_eliminar,
                updated_at: new Date().toISOString()
            }));

        if (permisosActivos.length > 0) {
            const { error: insertError } = await this.sb.client
                .from('roles_permisos')
                .insert(permisosActivos);
            if (insertError) throw insertError;
        }
    }

    /**
     * Obtiene los módulos permitidos (con acceso de lectura) para el rol del usuario actual.
     */
    async getModulosPermitidos(rolId: string): Promise<string[]> {
        const { data, error } = await this.sb.client
            .from('roles_permisos')
            .select('modulo_id')
            .eq('rol_id', rolId)
            .eq('puede_ver', true);
        if (error) throw error;
        return (data || []).map(p => p.modulo_id);
    }

    /**
     * Retorna un mapa indexado por modulo_id con las facultades CRUD asignadas.
     */
    async getPermisosMap(rolId: string): Promise<Record<string, { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }>> {
        const permisos = await this.getPermisosByRol(rolId);
        const map: Record<string, { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }> = {};
        for (const p of permisos) {
            map[p.modulo_id] = {
                ver: p.puede_ver,
                crear: !!p.puede_crear,
                editar: !!p.puede_editar,
                eliminar: !!p.puede_eliminar
            };
        }
        return map;
    }
}
