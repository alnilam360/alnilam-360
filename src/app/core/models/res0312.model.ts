import { Usuario } from './models';

// ============================================================================
// Modelos relacionados a la Resolución 0312 de 2019 (SGSST)
// ============================================================================

export type CicloPHVA = 'Planear' | 'Hacer' | 'Verificar' | 'Actuar';

export type TipoEvaluacion = '7' | '21' | '60';

export type EstadoEvaluacion = 'Borrador' | 'Finalizado';

export type CalificacionEvaluacion = 'Cumple Totalmente' | 'No Cumple' | 'No Aplica';

/** Catálogo paramétrico global (60 estándares) */
export interface EstandarCatalogo {
    id: string;
    ciclo_phva: CicloPHVA;
    item: string;
    descripcion_estandar: string;
    marco_legal?: string | null;
    modo_verificacion?: string | null;
    /** Universos a los que pertenece: {'7'}, {'21'}, {'60'} o combinaciones */
    aplica_para: TipoEvaluacion[];
    peso: number;
    orden: number;
    activo: boolean;
    created_at?: string;
    updated_at?: string;
}

/** Cabecera de evaluación */
export interface SstEvaluacion {
    id?: string;
    empresa_id: string;
    fecha_evaluacion: string; // ISO date (YYYY-MM-DD)
    tipo_evaluacion: TipoEvaluacion;
    puntaje_total: number;
    estado: EstadoEvaluacion;
    observaciones?: string | null;
    creado_por?: string | null;
    created_at?: string;
    updated_at?: string;
    /** Relación: responsable (join) */
    creador?: Partial<Usuario>;
    /** Relación: detalle (join opcional) */
    detalle?: SstEvaluacionDetalle[];
}

/** Detalle transaccional (una fila por estándar evaluado) */
export interface SstEvaluacionDetalle {
    id?: string;
    evaluacion_id: string;
    estandar_id: string;
    calificacion: CalificacionEvaluacion | null;
    justificacion_no_aplica?: string | null;
    evidencia_url?: string | null;
    observaciones?: string | null;
    created_at?: string;
    updated_at?: string;
    /** Join al catálogo */
    estandar?: EstandarCatalogo;
}

/**
 * Resultado de la determinación automática del universo aplicable
 * según número de empleados y nivel de riesgo (Res. 0312/2019).
 */
export interface ResolucionTipoEvaluacion {
    tipo: TipoEvaluacion;
    motivo: string;
    numero_empleados: number;
    nivel_riesgo: string | null;
}
