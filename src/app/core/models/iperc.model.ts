import { Usuario } from './models';

// ============================================================================
// Modelos: Matriz IPERC — GTC 45
// ============================================================================

// ---------------------------------------------------------------
// Historial / Control de Cambios
// ---------------------------------------------------------------
export interface IpercHistorial {
    id?: string;
    empresa_id: string;
    registro_id?: string | null;
    descripcion: string;
    usuario_id?: string | null;
    created_at?: string;
    usuario?: Partial<Usuario> | null;
}

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
// Registro de la Matriz IPERC — estructura 8 pasos GTC-45
// ---------------------------------------------------------------
export interface MatrizIperc {
    id?: string;
    empresa_id: string;
    // Paso 1: Contexto
    proceso: string;
    subproceso?: string | null;
    zona_lugar?: string | null;
    actividad: string;
    es_rutinaria: boolean;
    tareas?: string | null;
    cargo?: string | null;
    // Paso 2: Peligro
    peligro_id?: string | null;
    peligro_descripcion?: string | null;
    fuente_peligro?: string | null;
    efectos_posibles?: string | null;
    // Paso 3: Controles existentes
    control_fuente?: string | null;
    control_medio?: string | null;
    control_individuo?: string | null;
    // Paso 4: Evaluación del riesgo (inicial)
    nivel_deficiencia: NivelDeficiencia;
    nivel_exposicion: NivelExposicion;
    nivel_consecuencia: NivelConsecuencia;
    nivel_probabilidad?: number;  // GENERATED: nd × ne
    nivel_riesgo?: number;        // GENERATED: np × nc
    interpretacion_np?: string | null;
    nivel_intervencion?: NivelIntervencion | null;
    aceptabilidad?: Aceptabilidad | null;
    // Paso 5: Valoración de expuestos
    expuestos_directos?: number;
    expuestos_temporales?: number;
    expuestos_contratistas?: number;
    expuestos_visitantes?: number;
    horas_exposicion?: number | null;
    peor_consecuencia?: string | null;
    requisitos_legales?: boolean;
    // Paso 6: Criterios para establecer controles (jerarquía)
    eliminacion?: string | null;
    sustitucion?: string | null;
    controles_ingenieria?: string | null;
    controles_administrativos?: string | null;
    epp?: string | null;
    // Paso 7: Medidas de intervención (qué se hará concretamente)
    medidas_intervencion?: string | null;
    // Paso 8: Evaluación post-controles
    nd_post?: NivelDeficiencia | null;
    ne_post?: NivelExposicion | null;
    nc_post?: NivelConsecuencia | null;
    np_post?: number;  // GENERATED: nd_post × ne_post
    nr_post?: number;  // GENERATED: np_post × nc_post
    interpretacion_np_post?: string | null;
    nivel_intervencion_post?: NivelIntervencion | null;
    aceptabilidad_post?: Aceptabilidad | null;
    factor_reduccion?: number | null;
    // Actualización
    actualizacion_nota?: string | null;
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
