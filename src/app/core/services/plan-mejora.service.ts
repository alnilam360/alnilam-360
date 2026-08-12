import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import { SstPlanMejora, SstPlanMejoraHistorial, EstadoPlanMejora } from '../models/plan-mejora.model';
import { Empresa, Usuario } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PlanMejoraService {

    constructor(
        private sb: SupabaseClientService,
        private tenant: TenantService
    ) { }

    // ========================================================================
    // Tenant helpers (delegate)
    // ========================================================================

    isAdministrador(): Promise<boolean> { return this.tenant.isAdministrador(); }
    listarEmpresasDisponibles(): Promise<Empresa[]> { return this.tenant.listarEmpresasDisponibles(); }
    getEmpresaTenantId(): Promise<string | null> { return this.tenant.getEmpresaTenantId(); }
    getEmpresaPorId(id: string): Promise<Empresa> { return this.tenant.getEmpresaPorId(id); }

    // ========================================================================
    // CRUD Plan de Mejora
    // ========================================================================

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

    // ========================================================================
    // Historial / Control de Cambios
    // ========================================================================

    async registrarCambio(entry: {
        empresa_id: string;
        hallazgo_id: string;
        descripcion: string;
    }): Promise<void> {
        const perfil = await this.tenant.getPerfilSeguro();
        const { error } = await this.sb.client
            .from('sst_plan_mejora_historial')
            .insert({
                empresa_id: entry.empresa_id,
                hallazgo_id: entry.hallazgo_id,
                descripcion: entry.descripcion,
                usuario_id: perfil?.id ?? null
            });
        if (error) throw error;
    }

    async listarHistorial(empresaId: string): Promise<SstPlanMejoraHistorial[]> {
        const { data, error } = await this.sb.client
            .from('sst_plan_mejora_historial')
            .select('*, usuario:usuarios!sst_plan_mejora_historial_usuario_id_fkey(id, nombre, email)')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data as unknown as SstPlanMejoraHistorial[]) ?? [];
    }
}
