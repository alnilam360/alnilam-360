// ============================================================================
// Matriz e Indicadores AT (Accidentalidad) — modelos de dominio
// Fuentes normativas: Res. 0312/2019 Art. 30, Res. 1401/2007, Res. 156/2005,
// NTC/GTC 3701 (índices GTC y tabla de días cargados Anexo A).
// ============================================================================

// ── Enums de dominio ────────────────────────────────────────────────────────
export type TipoEvento = 'accidente_trabajo' | 'incidente_casi_accidente';
export type Gravedad = 'leve' | 'grave' | 'mortal';
export type EstadoCaso = 'reportado' | 'en_investigacion' | 'cerrado';
export type Metodologia = 'arbol_causas' | 'cinco_porques' | 'espina_pescado';
export type Vinculacion = 'directo' | 'temporal' | 'contratista' | 'aprendiz' | 'otro';
export type TipoAccidente = 'violencia' | 'transito' | 'deportivo' | 'recreativo_cultural' | 'propios_trabajo';
export type LugarOcurrencia = 'dentro' | 'fuera' | 'trabajo_casa';
export type EstadoAccion = 'pendiente' | 'en_progreso' | 'cerrada';
/** 'vencida' se deriva en la app (no se persiste). */
export type EstadoAccionCalc = EstadoAccion | 'vencida';

export const MESES_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** Días cargados por muerte / incapacidad permanente total (NTC 3701 Anexo A). */
export const DIAS_CARGADOS_MUERTE = 6000;

/** Constante K estándar GTC 3701 (Norma OSHA). Configurable por empresa. */
export const K_GTC_3701 = 200_000;

// ── Filas de base de datos ──────────────────────────────────────────────────
export interface MatrizAtCaso {
  id?: string;
  empresa_id: string;
  sede_id: string | null;
  tipo_evento: TipoEvento;
  fecha_hora_evento: string;              // ISO 8601
  fecha_reporte?: string;
  trabajador_nombre: string;
  trabajador_documento: string | null;
  trabajador_cargo: string | null;
  trabajador_vinculacion: Vinculacion | null;
  area_proceso: string | null;
  actividad_al_momento: string | null;
  clasificacion_gravedad: Gravedad | null;
  tipo_accidente: TipoAccidente | null;
  causo_muerte: boolean;
  lugar_ocurrencia: LugarOcurrencia | null;
  peligro_id: string | null;
  agente_id: string | null;
  mecanismo_id: string | null;
  parte_cuerpo_id: string | null;
  tipo_lesion_id: string | null;
  sitio_ocurrencia_id: string | null;
  descripcion_evento: string | null;
  dias_incapacidad: number | null;
  dias_cargados: number | null;
  dias_cargados_id: string | null;
  reportado_arl: boolean;
  fecha_reporte_arl: string | null;
  furat_radicado: string | null;
  foto_sitio_url: string | null;
  estado_caso: EstadoCaso;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  // Relaciones embebidas (join opcional)
  tipo_lesion?: { nombre: string; codigo: string | null } | null;
  investigacion?: MatrizAtInvestigacion | null;
  acciones?: MatrizAtAccion[];
}

export interface MatrizAtInvestigacion {
  id?: string;
  caso_id: string;
  metodologia: Metodologia | null;
  causas_inmediatas: { actos_inseguros: string[]; condiciones_inseguras: string[] };
  causas_basicas: { factores_personales: string[]; factores_trabajo: string[] };
  responsable_id: string | null;
  responsable_texto: string | null;
  fecha_investigacion: string | null;
  fuera_de_plazo: boolean;
  conclusiones: string | null;
}

export interface MatrizAtAccion {
  id?: string;
  caso_id: string;
  descripcion_accion: string;
  responsable_id: string | null;
  responsable_rol_id: string | null;
  responsable_texto: string | null;
  fecha_compromiso: string | null;
  fecha_cierre: string | null;
  estado: EstadoAccion;
  evidencia_url: string | null;
  /** Derivado en la app: 'vencida' si fecha_compromiso < hoy y no está cerrada. */
  estadoCalculado?: EstadoAccionCalc;
}

export interface ParametrosMensuales {
  id?: string;
  empresa_id: string;
  anio: number;
  mes: number;
  numero_trabajadores: number;
  horas_hombre: number | null;
  meta_if: number | null;
  meta_is: number | null;
  meta_severidad: number | null;          // meta severidad Res. 0312
  meta_tasa_accidentalidad: number | null;
}

/** Item de catálogo genérico (FURAT, peligros, responsables). */
export interface CatalogoItemAt {
  id: string;
  nombre: string;
  codigo?: string | null;
}
export interface SedeLite {
  id: string;
  nombre: string;
  municipio: string | null;
}

// ── Filtros de listado ──────────────────────────────────────────────────────
export interface FiltrosCaso {
  sedeId?: string;
  tipoEvento?: TipoEvento;
  gravedad?: Gravedad;
  areaProceso?: string;
  estado?: EstadoCaso;
  desde?: string;    // ISO
  hasta?: string;    // ISO
  parteCuerpoIds?: string[];   // drill-down desde el mapa corporal
  parteCuerpoZona?: string;    // etiqueta de la zona (solo para UI)
}

// ── Reglas de negocio (estados calculados) ──────────────────────────────────
export interface EstadoReporteArl {
  modo: 'inmediato' | '2_dias';       // grave/mortal ⇒ inmediato (Res. 156/2005)
  limite: string | null;              // ISO date; null cuando modo = 'inmediato'
  vencido: boolean;                   // límite pasó sin reportar
}
export type EstadoInvestigacion =
  | 'no_aplica'          // incidente / casi-accidente
  | 'en_plazo'           // AT dentro de 15 días calendario, sin investigación aún
  | 'fuera_de_plazo'     // AT pasó 15 días sin investigación registrada
  | 'completa';          // investigación registrada

// ── Valores de indicador ────────────────────────────────────────────────────
export type IndicadorEstado = 'ok' | 'sin_datos' | 'pendiente_parametros';

export interface ValorIndicador {
  valor: number | null;
  estado: IndicadorEstado;
  meta: number | null;
  cumpleMeta: boolean | null;   // valor <= meta (menor es mejor)
}

export interface IndicadoresMes {
  anio: number;
  mes: number;
  label: string;
  // Conteos base (fuente para agregación correcta por periodo)
  numAt: number;
  numAtMortales: number;
  numIncidentes: number;
  diasIncapacidad: number;
  diasCargados: number;
  numTrabajadores: number | null;   // null ⇒ pendiente_parametros
  horasHombre: number | null;
  // Res. 0312/2019 Art. 30 (×100 sobre N.º trabajadores)
  frecuenciaAccidentalidad: ValorIndicador;
  severidadAccidentalidad: ValorIndicador;
  tasaAccidentalidad: ValorIndicador;
  // GTC 3701 (horas-hombre × K)
  indiceFrecuencia: ValorIndicador;
  indiceSeveridad: ValorIndicador;
  indiceLesionIncapacitante: ValorIndicador;   // IF × IS / 1000
}

export interface IndicadoresPeriodo {
  periodo: string;                  // 'Q1 2026' | '2026'
  meses: number[];
  numAt: number;
  numAtMortales: number;
  numIncidentes: number;
  diasIncapacidad: number;
  diasCargados: number;
  trabajadoresProm: number | null;  // promedio de meses con parámetros (no promedio de promedios)
  horasHombreTotal: number | null;
  frecuenciaAccidentalidad: ValorIndicador;
  severidadAccidentalidad: ValorIndicador;
  tasaAccidentalidad: ValorIndicador;
  indiceFrecuencia: ValorIndicador;
  indiceSeveridad: ValorIndicador;
  indiceLesionIncapacitante: ValorIndicador;
  proporcionMortalidad: ValorIndicador;   // anual: AT mortales / total AT × 100
}

// ── Leading / cultura de seguridad ───────────────────────────────────────────
export interface DiasSinAccidentes {
  dias: number | null;
  fechaUltimoAt: string | null;
  record: number | null;           // mayor racha histórica consecutiva (días)
}
export interface TrianguloBird {
  mortal: number;
  grave: number;
  leve: number;
  casiAccidente: number;
  ratio: string;                   // normalizado a mortal = 1 si mortal > 0
}
export interface CumplimientoAcciones {
  total: number;
  cerradasATiempo: number;
  cerradasTarde: number;
  vencidas: number;
  pendientes: number;
  enProgreso: number;
  pctCerradasATiempo: number | null;
}

export interface AccionVencida {
  casoId: string;
  descripcion: string;
  responsable: string;
  fechaCompromiso: string;
  diasVencido: number;
}

// ── Agrupaciones para gráficos ───────────────────────────────────────────────
export interface ConteoEtiqueta {
  id: string | null;
  label: string;
  count: number;
}
export interface SerieMensual {
  label: string;
  puntos: (number | null)[];       // 12 puntos
}
export interface AgrupacionesViz {
  porParteCuerpo: ConteoEtiqueta[];  // heatmap cuerpo
  porAgente: ConteoEtiqueta[];       // Pareto descendente
  porMecanismo: ConteoEtiqueta[];    // Pareto descendente
  porAreaProceso: ConteoEtiqueta[];  // drill-down por área
}
