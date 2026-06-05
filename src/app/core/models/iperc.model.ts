// ============================================================================
// Modelos: Matriz IPERC — GTC 45
// ============================================================================

/** Valores permitidos GTC 45 */
export type NivelDeficiencia = 0 | 2 | 6 | 10;
export type NivelExposicion = 1 | 2 | 3 | 4;
export type NivelConsecuencia = 10 | 25 | 60 | 100;
export type NivelIntervencion = 'I' | 'II' | 'III' | 'IV';
export type Aceptabilidad =
    | 'No Aceptable'
    | 'Aceptable con control específico'
    | 'Mejorable'
    | 'Aceptable';

// ---------------------------------------------------------------
// Catálogo de peligros
// ---------------------------------------------------------------
export interface PeligroCatalogo {
    id: string;
    clasificacion: string;
    descripcion: string;
    efectos_posibles?: string | null;
    activo: boolean;
    created_at?: string;
    updated_at?: string;
}

// ---------------------------------------------------------------
// Registro de la Matriz IPERC
// ---------------------------------------------------------------
export interface MatrizIperc {
    id?: string;
    empresa_id: string;
    // Contexto
    proceso: string;
    zona_lugar?: string | null;
    actividad: string;
    es_rutinaria: boolean;
    tareas?: string | null;
    cargo?: string | null;
    // Peligro
    peligro_id?: string | null;
    peligro_descripcion?: string | null;
    efectos_posibles?: string | null;
    // Controles existentes
    control_fuente?: string | null;
    control_medio?: string | null;
    control_individuo?: string | null;
    // Criterios para establecer controles
    expuestos_directos?: number;
    contratistas?: number;
    requisitos_legales?: boolean;
    // Evaluación
    nivel_deficiencia: NivelDeficiencia;
    nivel_exposicion: NivelExposicion;
    nivel_consecuencia: NivelConsecuencia;
    // Cálculos (generados por DB, readonly en frontend)
    nivel_probabilidad?: number;
    nivel_riesgo?: number;
    // Interpretaciones
    interpretacion_np?: string | null;
    nivel_intervencion?: NivelIntervencion | null;
    aceptabilidad?: Aceptabilidad | null;
    // Medidas de intervención (jerarquía de controles)
    medidas_intervencion?: string | null;
    eliminacion?: string | null;
    sustitucion?: string | null;
    controles_ingenieria?: string | null;
    controles_administrativos?: string | null;
    epp?: string | null;
    // Metadata
    creado_por?: string | null;
    created_at?: string;
    updated_at?: string;
    // Joins opcionales
    peligro?: Partial<PeligroCatalogo> | null;
}

// ---------------------------------------------------------------
// Opciones descriptivas para los selectores (GTC 45)
// ---------------------------------------------------------------
export interface OpcionGtc45<T> {
    valor: T;
    etiqueta: string;
    descripcion: string;
}

export const OPCIONES_ND: OpcionGtc45<NivelDeficiencia>[] = [
    { valor: 10, etiqueta: 'Muy Alto (10)', descripcion: 'Se han detectado peligros que determinan como muy posible la generación de incidentes, o la eficacia del conjunto de medidas preventivas existentes respecto al riesgo es nula o no existe, o ambos.' },
    { valor: 6, etiqueta: 'Alto (6)', descripcion: 'Se han detectado algunos peligros que pueden dar lugar a incidentes significativos, o la eficacia del conjunto de medidas preventivas existentes es baja, o ambos.' },
    { valor: 2, etiqueta: 'Medio (2)', descripcion: 'Se han detectado peligros que pueden dar lugar a incidentes poco significativos o de menor importancia, o la eficacia del conjunto de medidas preventivas existentes es moderada, o ambos.' },
    { valor: 0, etiqueta: 'Bajo (0)', descripcion: 'No se ha detectado peligro o la eficacia del conjunto de medidas preventivas existentes es alta. El riesgo está controlado.' },
];

export const OPCIONES_NE: OpcionGtc45<NivelExposicion>[] = [
    { valor: 4, etiqueta: 'Continua (4)', descripcion: 'La situación de exposición se presenta sin interrupción o varias veces con tiempo prolongado durante la jornada laboral.' },
    { valor: 3, etiqueta: 'Frecuente (3)', descripcion: 'La situación de exposición se presenta varias veces durante la jornada laboral por tiempos cortos.' },
    { valor: 2, etiqueta: 'Ocasional (2)', descripcion: 'La situación de exposición se presenta alguna vez durante la jornada laboral y por un período de tiempo corto.' },
    { valor: 1, etiqueta: 'Esporádica (1)', descripcion: 'La situación de exposición se presenta de manera eventual.' },
];

export const OPCIONES_NC: OpcionGtc45<NivelConsecuencia>[] = [
    { valor: 100, etiqueta: 'Mortal o catastrófico (100)', descripcion: 'Muerte o lesiones irreversibles muy graves (invalidez total).' },
    { valor: 60, etiqueta: 'Muy grave (60)', descripcion: 'Lesiones o enfermedades graves irreversibles (incapacidad permanente parcial).' },
    { valor: 25, etiqueta: 'Grave (25)', descripcion: 'Lesiones o enfermedades con incapacidad laboral temporal (ILT).' },
    { valor: 10, etiqueta: 'Leve (10)', descripcion: 'Lesiones o enfermedades que no requieren incapacidad.' },
];
