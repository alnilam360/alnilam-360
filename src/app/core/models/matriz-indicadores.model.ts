// ============================================================================
// Modelo de Dominio: Matriz de Indicadores SG-SST (Res. 0312 / Dec. 1072 / GTC 3701)
// ============================================================================

export type TipoIndicadorMatriz =
  | 'Accidente de Trabajo (AT)'
  | 'Enfermedad Laboral (EL)'
  | 'Ausentismo'
  | 'Estructura - proceso - Resultado (E-P-R) del SG-SST';

export const TIPOS_INDICADOR_MATRIZ: TipoIndicadorMatriz[] = [
  'Accidente de Trabajo (AT)',
  'Enfermedad Laboral (EL)',
  'Ausentismo',
  'Estructura - proceso - Resultado (E-P-R) del SG-SST'
];

export type FrecuenciaMedicionMatriz = 'Mensual' | 'Anual';

export const FRECUENCIAS_MEDICION_MATRIZ: FrecuenciaMedicionMatriz[] = [
  'Mensual',
  'Anual'
];

/**
 * Catálogo dependiente de nombres por tipo de indicador
 */
export const INDICADORES_POR_TIPO: Record<TipoIndicadorMatriz, string[]> = {
  'Accidente de Trabajo (AT)': [
    'Severidad de Accidentalidad',
    'Frecuencia de Accidentalidad',
    'Proporción de Accidentes de trabajo mortales'
  ],
  'Enfermedad Laboral (EL)': [
    'Prevalencia de la enfermedad laboral',
    'Incidencia de la enfermedad laboral'
  ],
  'Ausentismo': [
    'Indicadores de Ausentismo por Incapacidades'
  ],
  'Estructura - proceso - Resultado (E-P-R) del SG-SST': [
    'Indicadores de Estructura',
    'Indicadores de Proceso',
    'Indicadores de Resultado'
  ]
};

export interface IndicadorDefinicion {
  id: string;
  tipo: TipoIndicadorMatriz;
  tipoCorto: string;
  nombre: string;
  formula: string;
  metaDefault: number;
  responsableDefault: string;
  frecuencia: FrecuenciaMedicionMatriz;
  personalConocimiento: string;
  moduloRuta?: string;
}

export interface MatrizIndicadorRegistroDB {
  id?: string;
  empresa_id: string;
  sede_id?: string | null;
  anio: number;
  mes: number; // 0 = Consolidado Anual, 1..12 = Enero..Diciembre
  tipo: TipoIndicadorMatriz | string;
  codigo_indicador?: string | null;
  nombre: string;
  formula: string;
  meta: number;
  meta_texto?: string | null;
  responsable: string;
  frecuencia: FrecuenciaMedicionMatriz | string;
  numerador?: number | null;
  denominador?: number | null;
  resultado: number;
  resultado_texto?: string | null;
  cumplimiento: 'CUMPLE' | 'NO CUMPLE';
  personal_conocimiento: string;
  observaciones?: string | null;
  plan_accion?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FilaMatrizIndicador {
  id: string;
  empresaId: string;
  sedeId?: string | null;
  anio: number;
  mes: number;
  tipo: TipoIndicadorMatriz;
  tipoCorto: string;
  codigoIndicador?: string;
  nombre: string;
  formula: string;
  meta: number;
  responsable: string;
  frecuencia: FrecuenciaMedicionMatriz | string;
  resultado: number;
  cumplimiento: 'CUMPLE' | 'NO CUMPLE';
  personalConocimiento: string;
  moduloRuta?: string;
}

export interface ResumenCumplimientoMatriz {
  total: number;
  cumplen: number;
  noCumplen: number;
  porcentajeCumplimiento: number;
}

/**
 * Catálogo maestro oficial con las 9 fichas técnicas SG-SST estándar
 */
export const CATALOGO_MATRIZ_INDICADORES: IndicadorDefinicion[] = [
  // ── 1. Accidente de Trabajo (AT) ──────────────────────────────────────────
  {
    id: 'at_severidad',
    tipo: 'Accidente de Trabajo (AT)',
    tipoCorto: 'AT',
    nombre: 'Severidad de Accidentalidad',
    formula: 'Número de días Perdidos por AT en el mes + Número de días cargados en el mes / Numero de trabajadores en el mes *100',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Mensual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/accidentalidad'
  },
  {
    id: 'at_frecuencia',
    tipo: 'Accidente de Trabajo (AT)',
    tipoCorto: 'AT',
    nombre: 'Frecuencia de Accidentalidad',
    formula: 'Número de accidentes de trabajo en el periodo / Número de trabajadores en el Periodo * 100',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Mensual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/accidentalidad'
  },
  {
    id: 'at_mortalidad',
    tipo: 'Accidente de Trabajo (AT)',
    tipoCorto: 'AT',
    nombre: 'Proporción de Accidentes de trabajo mortales',
    formula: 'Número de accidentes de trabajo mortales que se presentaron en el periodo / Total de accidentes de trabajo que se presentaron en el periodo * 100',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Mensual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/accidentalidad'
  },

  // ── 2. Enfermedad Laboral (EL) ────────────────────────────────────────────
  {
    id: 'el_prevalencia',
    tipo: 'Enfermedad Laboral (EL)',
    tipoCorto: 'EL',
    nombre: 'Prevalencia de la enfermedad laboral',
    formula: 'Número de casos nuevos y antiguos de enfermedad laboral en el periodo / Promedio total de trabajadores en el periodo * 100.000',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Anual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/enfermedad-laboral'
  },
  {
    id: 'el_incidencia',
    tipo: 'Enfermedad Laboral (EL)',
    tipoCorto: 'EL',
    nombre: 'Incidencia de la enfermedad laboral',
    formula: 'Número de casos nuevos de enfermedad laboral en el periodo / Promedio Total de trabajadores en el periodo * 100.000',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Anual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/enfermedad-laboral'
  },

  // ── 3. Ausentismo ─────────────────────────────────────────────────────────
  {
    id: 'aus_incapacidades',
    tipo: 'Ausentismo',
    tipoCorto: 'Ausentismo',
    nombre: 'Indicadores de Ausentismo por Incapacidades',
    formula: 'Número de días de ausencia por incapacidad laboral y común / Numero de días de trabajo programados * 100',
    metaDefault: 0,
    responsableDefault: 'Talento Humano',
    frecuencia: 'Mensual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/ausentismo'
  },

  // ── 4. Estructura - proceso - Resultado (E-P-R) del SG-SST ────────────────
  {
    id: 'epr_estructura',
    tipo: 'Estructura - proceso - Resultado (E-P-R) del SG-SST',
    tipoCorto: 'E-P-R',
    nombre: 'Indicadores de Estructura',
    formula: 'Total de Items Cumplidos de los indicadores de estructura / Total de Items a evaluar de los indicadores de estructura * 100',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Anual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/sg-sst'
  },
  {
    id: 'epr_proceso',
    tipo: 'Estructura - proceso - Resultado (E-P-R) del SG-SST',
    tipoCorto: 'E-P-R',
    nombre: 'Indicadores de Proceso',
    formula: 'Total de Items Cumplidos de los indicadores de Proceso / Total de Items a evaluar de los indicadores de Proceso * 100',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Anual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/sg-sst'
  },
  {
    id: 'epr_resultado',
    tipo: 'Estructura - proceso - Resultado (E-P-R) del SG-SST',
    tipoCorto: 'E-P-R',
    nombre: 'Indicadores de Resultado',
    formula: 'Total de Items Cumplidos de los indicadores de Resultado / Total de Items a evaluar de los indicadores de Resultado * 100',
    metaDefault: 0,
    responsableDefault: 'Responsable SST',
    frecuencia: 'Anual',
    personalConocimiento: 'Gerencia y trabajadores',
    moduloRuta: '/indicadores/sg-sst'
  }
];

/**
 * Normaliza cualquier variante de tipo (antiguas erratas o espaciados) a TipoIndicadorMatriz canónico
 */
export function normalizarTipoIndicador(tipoRaw: string): TipoIndicadorMatriz {
  if (!tipoRaw) return 'Accidente de Trabajo (AT)';
  const t = tipoRaw.trim();
  if (t.includes('(AT)') || t.toLowerCase().includes('accidente')) return 'Accidente de Trabajo (AT)';
  if (t.includes('(EL)') || t.toLowerCase().includes('enfermedad') || t.toLowerCase().includes('enfermadad')) return 'Enfermedad Laboral (EL)';
  if (t.toLowerCase().includes('ausentismo')) return 'Ausentismo';
  if (t.includes('E-P-R') || t.toLowerCase().includes('estructura') || t.toLowerCase().includes('sg-sst')) return 'Estructura - proceso - Resultado (E-P-R) del SG-SST';
  return 'Accidente de Trabajo (AT)';
}

export function getTipoCorto(tipo: string): string {
  const norm = normalizarTipoIndicador(tipo);
  switch (norm) {
    case 'Accidente de Trabajo (AT)': return 'AT';
    case 'Enfermedad Laboral (EL)': return 'EL';
    case 'Ausentismo': return 'Ausentismo';
    case 'Estructura - proceso - Resultado (E-P-R) del SG-SST': return 'E-P-R';
    default: return 'SST';
  }
}

/**
 * Obtiene la lista de nombres dependientes para un tipo específico.
 */
export function getNombresPorTipo(tipo: TipoIndicadorMatriz | string): string[] {
  const norm = normalizarTipoIndicador(tipo);
  return INDICADORES_POR_TIPO[norm] || [];
}

/**
 * Obtiene la definición estándar del catálogo para un nombre dado
 */
export function getDefinicionPorNombre(nombre: string): IndicadorDefinicion | undefined {
  if (!nombre) return undefined;
  const n = nombre.trim().toLowerCase();
  return CATALOGO_MATRIZ_INDICADORES.find(i => i.nombre.trim().toLowerCase() === n);
}

/**
 * Regla de Negocio: Si resultado >= Meta entonces 'CUMPLE', si no 'NO CUMPLE'
 */
export function calcularCumplimientoMatriz(resultado: number, meta: number): 'CUMPLE' | 'NO CUMPLE' {
  const res = Number(resultado) || 0;
  const met = Number(meta) || 0;
  return res >= met ? 'CUMPLE' : 'NO CUMPLE';
}
