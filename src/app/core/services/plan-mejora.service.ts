import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';
import { SstPlanMejora, EstadoPlanMejora } from '../models/plan-mejora.model';
import { Empresa, Usuario } from '../models/models';

/**
 * Servicio CRUD para el módulo Plan de Mejora (SGSST - Res. 0312).
 * Gestiona hallazgos derivados de evaluaciones con calificación "No Cumple".
 */
@Injectable({ providedIn: 'root' })
export class PlanMejoraService {

    constructor(
        private sb: SupabaseClientService,
        private auth: AuthService
    ) { }

    // ========================================================================
    // Perfil / Empresa helpers (reutiliza patrón de ResEvaluacionesService)
    // ========================================================================

    private async getPerfilSeguro(): Promise<Usuario | null> {
        let perfil = this.auth.currentPerfil;
        if (perfil) return perfil;
        perfil = await this.auth.waitForProfile();
        return perfil ?? null;
    }

    async isAdministrador(): Promise<boolean> {
        const perfil = await this.getPerfilSeguro();
        if (!perfil) return false;
        const nombreRol = (
            (perfil as any).rol_data?.nombre ?? perfil.rol ?? ''
        ).toString().trim().toUpperCase();
        return nombreRol === 'ADMINISTRADOR' || nombreRol === 'ADMIN'
            || nombreRol === 'SUPER ADMIN' || nombreRol === 'SUPERADMIN';
    }

    async listarEmpresasDisponibles(): Promise<Empresa[]> {
        const esAdmin = await this.isAdministrador();
        if (esAdmin) {
            const { data, error } = await this.sb.client
                .from('empresas').select('*').order('nombre', { ascending: true });
            if (error) throw error;
            return (data as Empresa[]) ?? [];
        }
        const perfil = await this.getPerfilSeguro();
        if (!perfil?.empresa_id) return [];
        const { data, error } = await this.sb.client
            .from('empresas').select('*').eq('id', perfil.empresa_id).single();
        if (error) return [];
        return [data as Empresa];
    }

    async getEmpresaTenantId(): Promise<string | null> {
        const perfil = await this.getPerfilSeguro();
        return perfil?.empresa_id ?? null;
    }

    // ========================================================================
    // CRUD Plan de Mejora
    // ========================================================================

    /** Select con joins necesarios, filtro por empresa y opcionalmente por estado */
    private readonly SELECT_QUERY = `
        *,
        responsable:usuarios!sst_plan_mejora_responsable_id_fkey(id, nombre, email),
        evaluacion_detalle:sst_evaluaciones_detalle!sst_plan_mejora_evaluacion_detalle_id_fkey(
            id, calificacion,
            estandar:sst_estandares_catalogo(id, item, descripcion_estandar, ciclo_phva, peso)
        )
    `.trim();

    async listarPorEmpresa(
        empresaId: string,
        estado?: EstadoPlanMejora | null
    ): Promise<SstPlanMejora[]> {
        let query = this.sb.client
            .from('sst_plan_mejora')
            .select(this.SELECT_QUERY)
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false });

        if (estado) {
            query = query.eq('estado', estado);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data as unknown as SstPlanMejora[]) ?? [];
    }

    async obtenerPorId(id: string): Promise<SstPlanMejora | null> {
        const { data, error } = await this.sb.client
            .from('sst_plan_mejora')
            .select(this.SELECT_QUERY)
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return (data as unknown as SstPlanMejora) ?? null;
    }

    async actualizar(
        id: string,
        patch: Partial<Pick<SstPlanMejora,
            'accion_mejora' | 'responsable_id' | 'fecha_cierre_proyectada' |
            'estado' | 'presupuesto' | 'evidencia_cierre_url' | 'notas_cierre'>>
    ): Promise<SstPlanMejora> {
        const { data, error } = await this.sb.client
            .from('sst_plan_mejora')
            .update(patch)
            .eq('id', id)
            .select(this.SELECT_QUERY)
            .single();
        if (error) throw error;
        return data as unknown as SstPlanMejora;
    }

    async cerrarHallazgo(id: string, data: {
        notas_cierre: string;
        evidencia_cierre_url?: string;
    }): Promise<SstPlanMejora> {
        return this.actualizar(id, {
            estado: 'Cerrado',
            notas_cierre: data.notas_cierre,
            evidencia_cierre_url: data.evidencia_cierre_url ?? null
        });
    }

    async eliminar(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('sst_plan_mejora').delete().eq('id', id);
        if (error) throw error;
    }

    // ========================================================================
    // Estadísticas
    // ========================================================================

    async contarPorEstado(empresaId: string): Promise<Record<EstadoPlanMejora | 'total', number>> {
        const { data, error } = await this.sb.client
            .from('sst_plan_mejora')
            .select('estado')
            .eq('empresa_id', empresaId);
        if (error) throw error;

        const rows = data ?? [];
        return {
            Pendiente: rows.filter(r => r.estado === 'Pendiente').length,
            'En Proceso': rows.filter(r => r.estado === 'En Proceso').length,
            Cerrado: rows.filter(r => r.estado === 'Cerrado').length,
            total: rows.length
        };
    }

    // ========================================================================
    // Upload de evidencia
    // ========================================================================

    async subirEvidencia(file: File, empresaId: string): Promise<string> {
        const ext = file.name.split('.').pop() ?? 'pdf';
        const path = `plan-mejora/${empresaId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        const { error } = await this.sb.client.storage
            .from('sst-evidencias')
            .upload(path, file, { upsert: false });
        if (error) throw error;

        const { data: urlData } = this.sb.client.storage
            .from('sst-evidencias')
            .getPublicUrl(path);
        return urlData.publicUrl;
    }

    // ========================================================================
    // Usuarios de la empresa (para dropdown responsable)
    // ========================================================================

    async listarUsuariosEmpresa(empresaId: string): Promise<Partial<Usuario>[]> {
        const { data, error } = await this.sb.client
            .from('usuarios')
            .select('id, nombre, email, cargo')
            .eq('empresa_id', empresaId)
            .eq('estado', true)
            .order('nombre', { ascending: true });
        if (error) throw error;
        return data ?? [];
    }
}
