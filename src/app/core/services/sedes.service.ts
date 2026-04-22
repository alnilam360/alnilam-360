import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Sede } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class SedesService {

    constructor(private sb: SupabaseClientService) { }

    async getSedesByEmpresa(empresaId: string): Promise<Sede[]> {
        const { data, error } = await this.sb.client
            .from('sedes')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async createSede(sede: Partial<Sede>): Promise<Sede> {
        const { data, error } = await this.sb.client
            .from('sedes')
            .insert(sede)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateSede(id: string, sede: Partial<Sede>): Promise<Sede> {
        const { data, error } = await this.sb.client
            .from('sedes')
            .update({ ...sede, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async deleteSede(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('sedes')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
