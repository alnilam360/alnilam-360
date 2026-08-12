import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';
import { Empresa, Usuario } from '../models/models';

/**
 * Centraliza lógica multi-tenant (perfil, empresa, rol admin)
 * compartida por IpercService, PlanMejoraService y ResEvaluacionesService.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {

    constructor(
        private sb: SupabaseClientService,
        private auth: AuthService
    ) { }

    async getPerfilSeguro(): Promise<Usuario | null> {
        let perfil = this.auth.currentPerfil;
        if (perfil) return perfil;
        perfil = await this.auth.waitForProfile();
        if (perfil) return perfil;
        return this.auth.getUsuarioPerfil();
    }

    async isAdministrador(): Promise<boolean> {
        const perfil = await this.getPerfilSeguro();
        if (!perfil) return false;
        let nombreRol = ((perfil as any).rol_data?.nombre ?? perfil.rol ?? '')
            .toString().trim();
        if (!nombreRol && perfil.rol_id) {
            const { data } = await this.sb.client
                .from('roles').select('nombre').eq('id', perfil.rol_id).maybeSingle();
            nombreRol = (data?.nombre ?? '').toString().trim();
        }
        const clave = nombreRol.toUpperCase();
        return clave === 'ADMINISTRADOR' || clave === 'ADMIN'
            || clave === 'SUPER ADMIN' || clave === 'SUPERADMIN';
    }

    async getEmpresaTenantId(): Promise<string | null> {
        const perfil = await this.getPerfilSeguro();
        return perfil?.empresa_id ?? null;
    }

    async getEmpresaPorId(empresaId: string): Promise<Empresa> {
        const { data, error } = await this.sb.client
            .from('empresas').select('*').eq('id', empresaId).single();
        if (error) throw error;
        return data as Empresa;
    }

    async listarEmpresasDisponibles(): Promise<Empresa[]> {
        if (await this.isAdministrador()) {
            const { data, error } = await this.sb.client
                .from('empresas').select('*').order('nombre', { ascending: true });
            if (error) throw error;
            return (data as Empresa[]) ?? [];
        }
        const perfil = await this.getPerfilSeguro();
        if (!perfil?.empresa_id) return [];
        try {
            return [await this.getEmpresaPorId(perfil.empresa_id)];
        } catch {
            return [];
        }
    }
}
