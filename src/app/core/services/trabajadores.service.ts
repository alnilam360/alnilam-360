import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Trabajador } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class TrabajadoresService {

    constructor(private sb: SupabaseClientService) { }

    /** Trabajadores de una sede específica. */
    async getBySede(sedeId: string): Promise<Trabajador[]> {
        const { data, error } = await this.sb.client
            .from('trabajadores')
            .select('*')
            .eq('sede_id', sedeId)
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    /** Trabajadores activos de una sede (para autocomplete AT). */
    async getActivosBySede(sedeId: string): Promise<Trabajador[]> {
        const { data, error } = await this.sb.client
            .from('trabajadores')
            .select('*')
            .eq('sede_id', sedeId)
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    /** Todos los trabajadores de una empresa. */
    async getByEmpresa(empresaId: string): Promise<Trabajador[]> {
        const { data, error } = await this.sb.client
            .from('trabajadores')
            .select('*, sede:sedes(id, nombre)')
            .eq('empresa_id', empresaId)
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    /** Búsqueda por nombre (para autocomplete). Case insensitive, partial match. */
    async searchByNombre(empresaId: string, query: string): Promise<Trabajador[]> {
        const { data, error } = await this.sb.client
            .from('trabajadores')
            .select('*, sede:sedes(id, nombre)')
            .eq('empresa_id', empresaId)
            .eq('activo', true)
            .ilike('nombre', `%${query}%`)
            .order('nombre')
            .limit(20);
        if (error) throw error;
        return data || [];
    }

    /** Conteo de trabajadores activos por sede. */
    async countActivosBySede(sedeId: string): Promise<number> {
        const { count, error } = await this.sb.client
            .from('trabajadores')
            .select('*', { count: 'exact', head: true })
            .eq('sede_id', sedeId)
            .eq('activo', true);
        if (error) throw error;
        return count ?? 0;
    }

    async create(trabajador: Partial<Trabajador>): Promise<Trabajador> {
        const { data, error } = await this.sb.client
            .from('trabajadores')
            .insert(trabajador)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async update(id: string, trabajador: Partial<Trabajador>): Promise<Trabajador> {
        const { data, error } = await this.sb.client
            .from('trabajadores')
            .update(trabajador)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('trabajadores')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
