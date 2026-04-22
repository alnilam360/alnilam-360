import { Usuario } from './models';
import { EstandarCatalogo, SstEvaluacionDetalle } from './res0312.model';

// ============================================================================
// Modelos: Plan de Mejora (SGSST - Res. 0312)
// ============================================================================

export type EstadoPlanMejora = 'Pendiente' | 'En Proceso' | 'Cerrado';

/** Registro de hallazgo / acción correctiva */
export interface SstPlanMejora {
    id?: string;
    empresa_id: string;
    evaluacion_detalle_id?: string | null;
    estandar_descripcion?: string | null;
    estandar_item?: string | null;
    accion_mejora?: string | null;
    responsable_id?: string | null;
    fecha_cierre_proyectada?: string | null;  // ISO date
    estado: EstadoPlanMejora;
    presupuesto?: number | null;
    evidencia_cierre_url?: string | null;
    notas_cierre?: string | null;
    created_at?: string;
    updated_at?: string;

    /** Joins opcionales */
    responsable?: Partial<Usuario> | null;
    evaluacion_detalle?: Partial<SstEvaluacionDetalle> | null;
    estandar?: Partial<EstandarCatalogo> | null;
}
