import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import { Cargo } from '../models/models';

const COLUMNAS = 'id, empresa_id, nombre, activo';
const MSG_DUPLICADO = 'Ya existe un cargo con ese nombre';

/** Catálogo de cargos por empresa. La seguridad la da RLS; nombre_norm lo genera la BD. */
@Injectable({ providedIn: 'root' })
export class CargosService {

    private sb = inject(SupabaseClientService);
    private tenant = inject(TenantService);

    async listar(incluirInactivos = true): Promise<Cargo[]> {
        let q = this.sb.client.from('cargos').select(COLUMNAS).order('nombre');
        if (!incluirInactivos) q = q.eq('activo', true);
        const { data, error } = await q;
        if (error) throw error;
        return (data as Cargo[]) ?? [];
    }

    async crear(nombre: string): Promise<Cargo> {
        const empresaId = await this.tenant.getEmpresaTenantId();
        if (!empresaId) throw new Error('No hay empresa activa');
        const { data, error } = await this.sb.client
            .from('cargos').insert({ empresa_id: empresaId, nombre: nombre.trim() })
            .select(COLUMNAS).single();
        if (error) throw this.traducir(error);
        return data as Cargo;
    }

    async renombrar(id: string, nombre: string): Promise<void> {
        const { error } = await this.sb.client
            .from('cargos').update({ nombre: nombre.trim() }).eq('id', id);
        if (error) throw this.traducir(error);
    }

    async setActivo(id: string, activo: boolean): Promise<void> {
        const { error } = await this.sb.client.from('cargos').update({ activo }).eq('id', id);
        if (error) throw error;
    }

    async eliminar(id: string): Promise<void> {
        const { error } = await this.sb.client.from('cargos').delete().eq('id', id);
        if (error) throw error;
    }

    private traducir(error: { code?: string; message: string }): Error {
        return new Error(error.code === '23505' ? MSG_DUPLICADO : error.message);
    }
}
