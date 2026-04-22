import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Empresa } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class EmpresasService {

    constructor(private sb: SupabaseClientService) { }

    async getEmpresas(): Promise<Empresa[]> {
        const { data, error } = await this.sb.client
            .from('empresas')
            .select('*')
            .order('nombre');
        if (error) throw error;
        return data || [];
    }

    async createEmpresa(empresa: Partial<Empresa>): Promise<Empresa> {
        const { data, error } = await this.sb.client
            .from('empresas')
            .insert(empresa)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateEmpresa(id: string, empresa: Partial<Empresa>): Promise<Empresa> {
        const { data, error } = await this.sb.client
            .from('empresas')
            .update({ ...empresa, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async canDeleteEmpresa(id: string): Promise<{ canDelete: boolean; reason?: string }> {
        const { count: sedesCount, error: sedesError } = await this.sb.client
            .from('sedes')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id);
        if (sedesError) throw sedesError;

        if (sedesCount && sedesCount > 0) {
            return {
                canDelete: false,
                reason: `No se puede eliminar: la empresa tiene ${sedesCount} sede(s) asociada(s). Elimine las sedes primero.`
            };
        }

        const { count: usuariosCount, error: usuariosError } = await this.sb.client
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', id);
        if (usuariosError) throw usuariosError;

        if (usuariosCount && usuariosCount > 0) {
            return {
                canDelete: false,
                reason: `No se puede eliminar: la empresa tiene ${usuariosCount} usuario(s) asociado(s). Reasigne o elimine los usuarios primero.`
            };
        }

        return { canDelete: true };
    }

    async deleteEmpresa(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('empresas')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}
