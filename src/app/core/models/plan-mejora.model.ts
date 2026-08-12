import { Usuario } from './models';
import { EstandarCatalogo, SstEvaluacionDetalle } from './res0312.model';

// ============================================================================
// Control de Cambios (historial de modificaciones al plan de mejora)
// ============================================================================
// Requiere tabla en Supabase:
//   CREATE TABLE sst_plan_mejora_historial (
//     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//     empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
//     hallazgo_id UUID NOT NULL REFERENCES sst_plan_mejora(id) ON DELETE CASCADE,
//     descripcion TEXT NOT NULL,
//     usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
//     created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
//   );
//   CREATE INDEX ON sst_plan_mejora_historial(empresa_id);
//   CREATE INDEX ON sst_plan_mejora_historial(hallazgo_id);

export interface SstPlanMejoraHistorial {
    id?: string;
    empresa_id: string;
    hallazgo_id: string;
    descripcion: string;
    usuario_id?: string | null;
    created_at?: string;
    usuario?: Partial<Usuario> | null;
}

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
