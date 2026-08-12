import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import { Empresa, NivelRiesgo } from '../models/models';
import {
    CicloPHVA,
    EstandarCatalogo,
    ResolucionTipoEvaluacion,
    SstEvaluacion,
    SstEvaluacionDetalle,
    TipoEvaluacion
} from '../models/res0312.model';

/**
 * Lógica de la Resolución 0312 de 2019 (SGSST):
 * - Determina el tipo de evaluación (7, 21 o 60 estándares).
 * - CRUD del catálogo paramétrico sst_estandares_catalogo.
 * - CRUD de evaluaciones y su detalle transaccional.
 */
@Injectable({ providedIn: 'root' })
export class ResEvaluacionesService {

    static readonly ORDEN_PHVA: CicloPHVA[] = ['Planear', 'Hacer', 'Verificar', 'Actuar'];

    constructor(
        private sb: SupabaseClientService,
        private tenant: TenantService
    ) { }

    // ========================================================================
    // 1) Lógica de negocio: determinación del tipo de evaluación
    // ========================================================================

    /**
     * Regla Resolución 0312 de 2019 (Colombia):
     *  - <= 10 empleados  y riesgo I, II, III   => 7 Estándares
     *  - 11 a 50 empleados y riesgo I, II, III  => 21 Estándares
     *  - > 50 empleados (cualquier riesgo)       => 60 Estándares
     *  - Riesgo IV o V (cualquier tamaño)        => 60 Estándares
     */
    determinarTipoEvaluacion(
        numeroEmpleados: number,
        nivelRiesgo: NivelRiesgo | string | null | undefined
    ): ResolucionTipoEvaluacion {
        const n = Math.max(0, Math.floor(numeroEmpleados || 0));
        const r = (nivelRiesgo || '').toString().trim().toUpperCase();
        const riesgoAlto = r === 'IV' || r === 'V';

        let tipo: TipoEvaluacion;
        let motivo: string;

        if (riesgoAlto) {
            tipo = '60';
            motivo = `Nivel de riesgo ${r}: aplica evaluación completa (60 estándares), sin importar el tamaño.`;
        } else if (n > 50) {
            tipo = '60';
            motivo = `Más de 50 trabajadores (${n}): aplica evaluación completa (60 estándares).`;
        } else if (n >= 11 && n <= 50) {
            tipo = '21';
            motivo = `Entre 11 y 50 trabajadores (${n}) con riesgo ${r || 'I/II/III'}: aplican 21 estándares.`;
        } else {
            tipo = '7';
            motivo = `Hasta 10 trabajadores (${n}) con riesgo ${r || 'I/II/III'}: aplican 7 estándares.`;
        }

        return { tipo, motivo, numero_empleados: n, nivel_riesgo: r || null };
    }

    async getTipoEvaluacionTenant(empresaId?: string): Promise<{
        empresa: Empresa;
        resolucion: ResolucionTipoEvaluacion;
    }> {
        const empresa = empresaId
            ? await this.tenant.getEmpresaPorId(empresaId)
            : await this.getEmpresaTenant();
        const resolucion = this.determinarTipoEvaluacion(
            empresa.numero_empleados ?? 0,
            empresa.nivel_riesgo ?? null
        );
        return { empresa, resolucion };
    }

    async getEmpresaTenant(): Promise<Empresa> {
        const id = await this.tenant.getEmpresaTenantId();
        if (!id) throw new Error('No se pudo determinar la empresa del usuario autenticado.');
        return this.tenant.getEmpresaPorId(id);
    }

    async isAdministrador(): Promise<boolean> { return this.tenant.isAdministrador(); }

    async listarEmpresasDisponibles(): Promise<Empresa[]> { return this.tenant.listarEmpresasDisponibles(); }

    // ========================================================================
    // 2) Catálogo de estándares
    // ========================================================================

    async getEstandaresPorTipo(tipo: TipoEvaluacion): Promise<EstandarCatalogo[]> {
        const { data, error } = await this.sb.client
            .from('sst_estandares_catalogo')
            .select('*')
            .eq('activo', true)
            .contains('aplica_para', [tipo])
            .order('orden', { ascending: true });

        if (error) throw error;

        const ordenPhva = new Map(ResEvaluacionesService.ORDEN_PHVA.map((c, i) => [c, i]));
        return (data as EstandarCatalogo[]).sort((a, b) => {
            const da = ordenPhva.get(a.ciclo_phva) ?? 99;
            const db = ordenPhva.get(b.ciclo_phva) ?? 99;
            if (da !== db) return da - db;
            return (a.orden ?? 0) - (b.orden ?? 0);
        });
    }

    agruparPorCicloPHVA(
        estandares: EstandarCatalogo[]
    ): { ciclo: CicloPHVA; items: EstandarCatalogo[] }[] {
        const mapa = new Map<CicloPHVA, EstandarCatalogo[]>();
        for (const c of ResEvaluacionesService.ORDEN_PHVA) mapa.set(c, []);
        for (const e of estandares) {
            const arr = mapa.get(e.ciclo_phva) ?? [];
            arr.push(e);
            mapa.set(e.ciclo_phva, arr);
        }
        return ResEvaluacionesService.ORDEN_PHVA
            .map(ciclo => ({ ciclo, items: mapa.get(ciclo) ?? [] }))
            .filter(g => g.items.length > 0);
    }

    // ========================================================================
    // 3) Evaluaciones (cabecera)
    // ========================================================================

    async listarEvaluaciones(empresaId: string): Promise<SstEvaluacion[]> {
        const { data, error } = await this.sb.client
            .from('sst_evaluaciones')
            .select('*, creador:usuarios!sst_evaluaciones_creado_por_fkey(id, nombre, email)')
            .eq('empresa_id', empresaId)
            .order('fecha_evaluacion', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data as SstEvaluacion[]) || [];
    }

    async obtenerEvaluacion(id: string): Promise<SstEvaluacion | null> {
        const { data, error } = await this.sb.client
            .from('sst_evaluaciones')
            .select('*, creador:usuarios!sst_evaluaciones_creado_por_fkey(id, nombre, email)')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return (data as SstEvaluacion) || null;
    }

    async obtenerEvaluacionConDetalle(
        id: string
    ): Promise<{ evaluacion: SstEvaluacion; detalle: SstEvaluacionDetalle[] }> {
        const [evaluacion, detalle] = await Promise.all([
            this.obtenerEvaluacion(id),
            this.listarDetalle(id)
        ]);
        if (!evaluacion) throw new Error('Evaluación no encontrada.');
        return { evaluacion, detalle };
    }

    async crearEvaluacion(input: {
        empresaId: string;
        tipo: TipoEvaluacion;
        fecha?: string;
        observaciones?: string;
    }): Promise<{ evaluacion: SstEvaluacion; detalle: SstEvaluacionDetalle[] }> {
        const perfil = await this.tenant.getPerfilSeguro();
        const estandares = await this.getEstandaresPorTipo(input.tipo);
        const fecha = input.fecha ?? new Date().toISOString().substring(0, 10);

        const { data: cab, error: errCab } = await this.sb.client
            .from('sst_evaluaciones')
            .insert({
                empresa_id: input.empresaId,
                tipo_evaluacion: input.tipo,
                fecha_evaluacion: fecha,
                estado: 'Borrador',
                puntaje_total: 0,
                observaciones: input.observaciones ?? null,
                creado_por: perfil?.id ?? null
            })
            .select('*')
            .single();
        if (errCab) throw errCab;

        const cabecera = cab as SstEvaluacion;

        if (estandares.length === 0) {
            return { evaluacion: cabecera, detalle: [] };
        }

        const filasDetalle = estandares.map(e => ({
            evaluacion_id: cabecera.id!,
            estandar_id: e.id,
            calificacion: null,
            justificacion_no_aplica: null,
            evidencia_url: null,
            observaciones: null
        }));

        const { data: detalleIns, error: errDet } = await this.sb.client
            .from('sst_evaluaciones_detalle')
            .insert(filasDetalle)
            .select('*, estandar:sst_estandares_catalogo(*)');
        if (errDet) throw errDet;

        return {
            evaluacion: cabecera,
            detalle: (detalleIns as SstEvaluacionDetalle[]) ?? []
        };
    }

    async actualizarEvaluacion(
        id: string,
        patch: Partial<Pick<SstEvaluacion, 'fecha_evaluacion' | 'observaciones' | 'estado' | 'puntaje_total'>>
    ): Promise<SstEvaluacion> {
        const { data, error } = await this.sb.client
            .from('sst_evaluaciones')
            .update(patch)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data as SstEvaluacion;
    }

    async eliminarEvaluacion(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('sst_evaluaciones')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }

    async finalizarEvaluacion(id: string): Promise<SstEvaluacion> {
        const detalle = await this.listarDetalle(id);
        const puntaje = this.calcularPuntajeTotal(detalle);
        return this.actualizarEvaluacion(id, {
            estado: 'Finalizado',
            puntaje_total: puntaje
        });
    }

    calcularPuntajeTotal(detalle: SstEvaluacionDetalle[]): number {
        if (!detalle?.length) return 0;

        let pesoTotal = 0;
        let pesoNoAplica = 0;
        let pesoCumple = 0;

        for (const d of detalle) {
            const peso = d.estandar?.peso ?? 0;
            pesoTotal += peso;
            if (d.calificacion === 'No Aplica') {
                pesoNoAplica += peso;
            } else if (d.calificacion === 'Cumple Totalmente') {
                pesoCumple += peso;
            }
        }

        const pesoAplicable = pesoTotal - pesoNoAplica;
        if (pesoAplicable <= 0) return 0;

        return Math.round((pesoCumple / pesoAplicable) * 10000) / 100;
    }

    // ========================================================================
    // 4) Detalle (transaccional)
    // ========================================================================

    async listarDetalle(evaluacionId: string): Promise<SstEvaluacionDetalle[]> {
        const { data, error } = await this.sb.client
            .from('sst_evaluaciones_detalle')
            .select('*, estandar:sst_estandares_catalogo(*)')
            .eq('evaluacion_id', evaluacionId);
        if (error) throw error;

        const rows = (data as SstEvaluacionDetalle[]) ?? [];
        const ordenPhva = new Map(ResEvaluacionesService.ORDEN_PHVA.map((c, i) => [c, i]));
        return rows.sort((a, b) => {
            const da = ordenPhva.get(a.estandar?.ciclo_phva as CicloPHVA) ?? 99;
            const db = ordenPhva.get(b.estandar?.ciclo_phva as CicloPHVA) ?? 99;
            if (da !== db) return da - db;
            return (a.estandar?.orden ?? 0) - (b.estandar?.orden ?? 0);
        });
    }

    async actualizarDetalle(
        id: string,
        patch: Partial<Pick<SstEvaluacionDetalle,
            'calificacion' | 'justificacion_no_aplica' | 'evidencia_url' | 'observaciones'>>
    ): Promise<SstEvaluacionDetalle> {
        const { data, error } = await this.sb.client
            .from('sst_evaluaciones_detalle')
            .update(patch)
            .eq('id', id)
            .select('*, estandar:sst_estandares_catalogo(*)')
            .single();
        if (error) throw error;
        return data as SstEvaluacionDetalle;
    }

    async guardarDetalleLote(
        filas: Array<Pick<SstEvaluacionDetalle, 'id' | 'calificacion' | 'justificacion_no_aplica' | 'evidencia_url' | 'observaciones'>>
    ): Promise<void> {
        if (!filas?.length) return;
        const ops = filas.map(f => this.actualizarDetalle(f.id!, {
            calificacion: f.calificacion ?? null,
            justificacion_no_aplica: f.justificacion_no_aplica ?? null,
            evidencia_url: f.evidencia_url ?? null,
            observaciones: f.observaciones ?? null
        }));
        await Promise.all(ops);
    }

    async corregirTipoEvaluacion(
        evaluacionId: string,
        nuevoTipo: TipoEvaluacion
    ): Promise<SstEvaluacionDetalle[]> {
        const { error: errDel } = await this.sb.client
            .from('sst_evaluaciones_detalle')
            .delete()
            .eq('evaluacion_id', evaluacionId);
        if (errDel) throw errDel;

        await this.actualizarEvaluacion(evaluacionId, { tipo_evaluacion: nuevoTipo } as any);

        const estandares = await this.getEstandaresPorTipo(nuevoTipo);
        if (!estandares.length) return [];

        const filas = estandares.map(e => ({
            evaluacion_id: evaluacionId,
            estandar_id: e.id,
            calificacion: null,
            justificacion_no_aplica: null,
            evidencia_url: null,
            observaciones: null
        }));

        const { data, error: errIns } = await this.sb.client
            .from('sst_evaluaciones_detalle')
            .insert(filas)
            .select('*, estandar:sst_estandares_catalogo(*)');
        if (errIns) throw errIns;

        return (data as SstEvaluacionDetalle[]) ?? [];
    }
}
