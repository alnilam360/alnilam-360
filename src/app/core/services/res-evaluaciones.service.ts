import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';
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
 * Servicio que centraliza la lógica de la Resolución 0312 de 2019 (SGSST):
 * - Determina el tipo de evaluación (7, 21 o 60 estándares) según
 *   `numero_empleados` y `nivel_riesgo` del tenant actual.
 * - CRUD del catálogo paramétrico `sst_estandares_catalogo`.
 * - CRUD de evaluaciones y su detalle transaccional.
 */
@Injectable({ providedIn: 'root' })
export class ResEvaluacionesService {

    /** Orden canónico del ciclo PHVA para la UI. */
    static readonly ORDEN_PHVA: CicloPHVA[] = ['Planear', 'Hacer', 'Verificar', 'Actuar'];

    constructor(
        private sb: SupabaseClientService,
        private auth: AuthService
    ) { }

    /**
     * Obtiene el perfil de forma segura: primero intenta el caché del AuthService,
     * luego espera a que se cargue, y como último recurso re-consulta a Supabase.
     */
    private async getPerfilSeguro(): Promise<import('../models/models').Usuario | null> {
        let perfil = this.auth.currentPerfil;
        if (perfil) return perfil;
        perfil = await this.auth.waitForProfile();
        if (perfil) return perfil;
        // Último recurso: consulta directa
        return this.auth.getUsuarioPerfil();
    }

    // ========================================================================
    // 1) Lógica de negocio: determinación del tipo de evaluación
    // ========================================================================

    /**
     * Regla Resolución 0312 de 2019 (Colombia):
     *  - <= 10 empleados  y riesgo I, II, III   => 7 Estándares
     *  - 11 a 50 empleados y riesgo I, II, III  => 21 Estándares
     *  - > 50 empleados (cualquier riesgo)      => 60 Estándares
     *  - Riesgo IV o V (cualquier tamaño)       => 60 Estándares
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
            // n <= 10
            tipo = '7';
            motivo = `Hasta 10 trabajadores (${n}) con riesgo ${r || 'I/II/III'}: aplican 7 estándares.`;
        }

        return {
            tipo,
            motivo,
            numero_empleados: n,
            nivel_riesgo: r || null
        };
    }

    /**
     * Obtiene la empresa sobre la que se va a trabajar y calcula
     * automáticamente el tipo de evaluación aplicable.
     *
     * - Si se provee `empresaId` (uso administrador seleccionando empresa),
     *   se carga esa empresa específica.
     * - Si no se provee, se toma la empresa asociada al perfil autenticado
     *   (flujo multi-tenant para usuarios no administradores).
     */
    async getTipoEvaluacionTenant(empresaId?: string): Promise<{
        empresa: Empresa;
        resolucion: ResolucionTipoEvaluacion;
    }> {
        const empresa = empresaId
            ? await this.getEmpresaPorId(empresaId)
            : await this.getEmpresaTenant();
        const resolucion = this.determinarTipoEvaluacion(
            empresa.numero_empleados ?? 0,
            empresa.nivel_riesgo ?? null
        );
        return { empresa, resolucion };
    }

    /** Empresa asociada al perfil autenticado. */
    async getEmpresaTenant(): Promise<Empresa> {
        const perfil = await this.getPerfilSeguro();
        if (!perfil?.empresa_id) {
            throw new Error('No se pudo determinar la empresa del usuario autenticado.');
        }
        return this.getEmpresaPorId(perfil.empresa_id);
    }

    /** Carga una empresa puntual por id. */
    async getEmpresaPorId(empresaId: string): Promise<Empresa> {
        const { data, error } = await this.sb.client
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .single();
        if (error) throw error;
        return data as Empresa;
    }

    /**
     * Indica si el usuario autenticado tiene rol "Administrador".
     * Estrategia (en orden):
     *   1. `perfil.rol_data.nombre` si el join estuviera disponible.
     *   2. `perfil.rol` (columna texto en `usuarios`).
     *   3. Consulta puntual a `roles.nombre` usando `perfil.rol_id`.
     * La comparación es case-insensitive y reconoce también 'ADMIN' y
     * 'SUPER ADMIN' / 'SUPERADMIN' como administradores globales.
     */
    async isAdministrador(): Promise<boolean> {
        const perfil = await this.getPerfilSeguro();
        if (!perfil) {
            console.warn('[ResEvaluaciones] isAdministrador: sin perfil autenticado.');
            return false;
        }

        let nombreRol = (
            (perfil as any).rol_data?.nombre ??
            perfil.rol ??
            ''
        ).toString().trim();

        // Si no tenemos nombre pero sí rol_id, resolvemos contra la tabla roles.
        if (!nombreRol && perfil.rol_id) {
            const { data, error } = await this.sb.client
                .from('roles')
                .select('nombre')
                .eq('id', perfil.rol_id)
                .maybeSingle();
            if (error) {
                console.warn('[ResEvaluaciones] No se pudo leer rol:', error.message);
            } else {
                nombreRol = (data?.nombre ?? '').toString().trim();
            }
        }

        const clave = nombreRol.toUpperCase();
        return clave === 'ADMINISTRADOR'
            || clave === 'ADMIN'
            || clave === 'SUPER ADMIN'
            || clave === 'SUPERADMIN';
    }

    /**
     * Lista las empresas visibles para el usuario actual:
     *  - Administrador: todas las empresas del sistema.
     *  - Usuario normal: sólo su propia empresa.
     */
    async listarEmpresasDisponibles(): Promise<Empresa[]> {
        const esAdmin = await this.isAdministrador();
        if (esAdmin) {
            const { data, error } = await this.sb.client
                .from('empresas')
                .select('*')
                .order('nombre', { ascending: true });
            if (error) throw error;
            return (data as Empresa[]) ?? [];
        }
        try {
            const propia = await this.getEmpresaTenant();
            return propia ? [propia] : [];
        } catch {
            return [];
        }
    }

    // ========================================================================
    // 2) Catálogo de estándares
    // ========================================================================

    /**
     * Devuelve los estándares del catálogo que aplican al `tipo` (7/21/60),
     * ordenados por ciclo PHVA y luego por `orden`.
     */
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

    /**
     * Agrupa un array de estándares por ciclo PHVA preservando el orden canónico.
     */
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

    /**
     * Crea una evaluación nueva (borrador) y pre-siembra filas de detalle
     * vacías con los estándares aplicables al `tipo`. Devuelve la cabecera
     * creada y el detalle inicial cargado.
     */
    async crearEvaluacion(input: {
        empresaId: string;
        tipo: TipoEvaluacion;
        fecha?: string;
        observaciones?: string;
    }): Promise<{ evaluacion: SstEvaluacion; detalle: SstEvaluacionDetalle[] }> {
        const perfil = await this.auth.getUsuarioPerfil();
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

    /**
     * Finaliza la evaluación: recalcula el puntaje total a partir del detalle
     * y marca la cabecera como 'Finalizado'.
     */
    async finalizarEvaluacion(id: string): Promise<SstEvaluacion> {
        const detalle = await this.listarDetalle(id);
        const puntaje = this.calcularPuntajeTotal(detalle);
        return this.actualizarEvaluacion(id, {
            estado: 'Finalizado',
            puntaje_total: puntaje
        });
    }

    /**
     * Puntaje total según Res. 0312 (suma de pesos de estándares "Cumple Totalmente"
     * más los "No Aplica" redistribuidos proporcionalmente).
     *
     * Para simplicidad y transparencia, aquí aplicamos:
     *   - Cumple Totalmente -> suma el peso del estándar
     *   - No Cumple         -> 0
     *   - No Aplica         -> el peso se redistribuye entre los aplicables
     */
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

        const puntaje = (pesoCumple / pesoAplicable) * 100;
        return Math.round(puntaje * 100) / 100;
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

    /**
     * Autoguardado parcial (ideal para guardar un ciclo PHVA de golpe).
     * Usa upsert por id para actualizar varias filas en paralelo.
     */
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
}
