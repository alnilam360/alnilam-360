import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { Departamento, Municipio } from '../models/models';

@Injectable({
    providedIn: 'root'
})
export class UbicacionService {
    private departamentosCache: Departamento[] | null = null;
    private municipiosCache: Map<string, Municipio[]> = new Map();

    constructor(private sb: SupabaseClientService) { }

    async getDepartamentos(): Promise<Departamento[]> {
        if (this.departamentosCache) {
            return this.departamentosCache;
        }

        const { data, error } = await this.sb.client
            .from('departamentos')
            .select('*')
            .order('nombre');
        if (error) throw error;

        this.departamentosCache = data || [];
        return this.departamentosCache;
    }

    async getMunicipiosByDepartamento(departamentoId: string): Promise<Municipio[]> {
        if (this.municipiosCache.has(departamentoId)) {
            return this.municipiosCache.get(departamentoId)!;
        }

        const { data, error } = await this.sb.client
            .from('municipios')
            .select('*')
            .eq('departamento_id', departamentoId)
            .order('nombre');
        if (error) throw error;

        const municipios = data || [];
        this.municipiosCache.set(departamentoId, municipios);
        return municipios;
    }

    clearCache(): void {
        this.departamentosCache = null;
        this.municipiosCache.clear();
    }
}
