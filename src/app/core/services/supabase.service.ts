import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface Empresa {
    id?: string;
    nit: string;
    nombre: string;
    departamento: string;
    municipio: string;
    actividad_economica: string;
    direccion: string;
    telefono: string;
    email: string;
    asegurado: boolean;
    representante_legal: {
        nombre: string;
        email: string;
        telefono: string;
    };
    encargado_sst: {
        nombre: string;
        email: string;
        telefono: string;
    };
    trabajadores: {
        directos: number;
        directos_hombres: number;
        directos_mujeres: number;
        aprendices: number;
        aprendices_hombres: number;
        aprendices_mujeres: number;
        contratistas: number;
        contratistas_hombres: number;
        contratistas_mujeres: number;
        brigadistas: number;
        brigadistas_hombres: number;
        brigadistas_mujeres: number;
    };
    descripcion: string;
    horarios: {
        manana: boolean;
        tarde: boolean;
        noche: boolean;
        continuo: boolean;
    };
    created_at?: string;
    updated_at?: string;
}

export interface Sede {
    id?: string;
    empresa_id: string;
    nombre: string;
    departamento: string;
    municipio: string;
    direccion: string;
    persona_encargada: string;
    correo: string;
    telefono: string;
    descripcion?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Usuario {
    id?: string;
    empresa_id: string;
    nombre: string;
    email: string;
    telefono?: string;
    rol: string;
    cargo?: string;
    estado: boolean;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
    // Joined field
    empresa?: Empresa;
}

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabaseUrl,
            environment.supabaseKey
        );
    }

    // ==================== EMPRESAS ====================

    async getEmpresas(): Promise<Empresa[]> {
        const { data, error } = await this.supabase
            .from('empresas')
            .select('*')
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async createEmpresa(empresa: Partial<Empresa>): Promise<Empresa> {
        const { data, error } = await this.supabase
            .from('empresas')
            .insert(empresa)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateEmpresa(id: string, empresa: Partial<Empresa>): Promise<Empresa> {
        const { data, error } = await this.supabase
            .from('empresas')
            .update({ ...empresa, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async canDeleteEmpresa(id: string): Promise<{ canDelete: boolean; reason?: string }> {
        const { count: sedesCount, error: sedesError } = await this.supabase
            .from('sedes')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id);
        if (sedesError) throw sedesError;

        if (sedesCount && sedesCount > 0) {
            return { canDelete: false, reason: `No se puede eliminar: la empresa tiene ${sedesCount} sede(s) asociada(s). Elimine las sedes primero.` };
        }

        const { count: usuariosCount, error: usuariosError } = await this.supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id);
        if (usuariosError) throw usuariosError;

        if (usuariosCount && usuariosCount > 0) {
            return { canDelete: false, reason: `No se puede eliminar: la empresa tiene ${usuariosCount} usuario(s) asociado(s). Reasigne o elimine los usuarios primero.` };
        }

        return { canDelete: true };
    }

    async deleteEmpresa(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('empresas')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    // ==================== SEDES ====================

    async getSedesByEmpresa(empresaId: string): Promise<Sede[]> {
        const { data, error } = await this.supabase
            .from('sedes')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async createSede(sede: Partial<Sede>): Promise<Sede> {
        const { data, error } = await this.supabase
            .from('sedes')
            .insert(sede)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateSede(id: string, sede: Partial<Sede>): Promise<Sede> {
        const { data, error } = await this.supabase
            .from('sedes')
            .update({ ...sede, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteSede(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('sedes')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    // ==================== USUARIOS ====================

    async getUsuarios(): Promise<Usuario[]> {
        const { data, error } = await this.supabase
            .from('usuarios')
            .select('*, empresa:empresas(id, nombre)')
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async getUsuariosByEmpresa(empresaId: string): Promise<Usuario[]> {
        const { data, error } = await this.supabase
            .from('usuarios')
            .select('*, empresa:empresas(id, nombre)')
            .eq('empresa_id', empresaId)
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async createUsuario(usuario: Partial<Usuario>): Promise<Usuario> {
        const { empresa, ...data } = usuario as any;
        const { data: result, error } = await this.supabase
            .from('usuarios')
            .insert(data)
            .select('*, empresa:empresas(id, nombre)')
            .single();
        if (error) throw error;
        return result;
    }

    async updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario> {
        const { empresa, ...updateData } = usuario as any;
        const { data, error } = await this.supabase
            .from('usuarios')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*, empresa:empresas(id, nombre)')
            .single();
        if (error) throw error;
        return data;
    }

    async deleteUsuario(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('usuarios')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
