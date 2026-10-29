// ============================================================================
// Modelo de Dominio: Matriz Legal — Evaluación de Cumplimiento (rehecho).
//
// Fuente: MATRIZ LEGAL 2026.xlsx, pestaña "EVALUACIÓN CUMPLIMIENTO".
//
// El usuario captura DIRECTAMENTE el conteo por estado (CUMPLE / EN PROCESO /
// NO CUMPLE) de cada componente, por periodo (año). La app deriva totales y
// porcentajes. No se capturan requisitos individuales.
//
// Semántica de % (igual que el Excel): porcentaje de cada estado sobre el total
// del dominio. Los tres porcentajes de un dominio suman 1 (100%) cuando el
// total > 0. El "% cumplimiento" titular = pctCumple.
// ============================================================================

// ── Enums de dominio ─────────────────────────────────────────────────────────
export type Dominio = 'SG_SST' | 'AMBIENTAL';

export const DOMINIOS = ['SG_SST', 'AMBIENTAL'] as const;

export const DOMINIO_LABEL: Record<Dominio, string> = {
  SG_SST: 'Normatividad SG-SST / Laboral',
  AMBIENTAL: 'Normatividad Ambiental',
};

/** Estados de cumplimiento de la matriz (tres, como el Excel). */
export type EstadoCumplimiento = 'CUMPLE' | 'EN_PROCESO' | 'NO_CUMPLE';

export const ESTADOS_CUMPLIMIENTO = ['CUMPLE', 'EN_PROCESO', 'NO_CUMPLE'] as const;

export const ESTADO_LABEL: Record<EstadoCumplimiento, string> = {
  CUMPLE: 'Cumple',
  EN_PROCESO: 'En proceso',
  NO_CUMPLE: 'No cumple',
};

/** Color semántico (Ionic) por estado, reutilizable en chips/leyenda/gráfica. */
export const ESTADO_COLOR: Record<EstadoCumplimiento, 'success' | 'warning' | 'danger'> = {
  CUMPLE: 'success',
  EN_PROCESO: 'warning',
  NO_CUMPLE: 'danger',
};

// ── Filas de base de datos ────────────────────────────────────────────────────
export interface MatrizLegalComponente {
  id: string;
  empresa_id: string | null;   // null = componente global/semilla
  dominio: Dominio;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Fila de conteos: empresa × componente × periodo. */
export interface MatrizLegalEvaluacionRow {
  id?: string;
  empresa_id: string;
  componente_id: string;
  periodo: number;
  cumple: number;
  en_proceso: number;
  no_cumple: number;
  updated_at?: string;
  updated_by?: string | null;
}

/** Payload de upsert enviado al guardar (sin campos de auditoría). */
export interface ConteoUpsert {
  componente_id: string;
  periodo: number;
  cumple: number;
  en_proceso: number;
  no_cumple: number;
}

// ── Tipos derivados para tabla + gráfica ───────────────────────────────────────
/** Un componente con sus conteos y total derivado (camelCase, igual que el RPC). */
export interface ConteoComponente {
  componenteId: string;
  nombre: string;
  orden: number;
  cumple: number;
  enProceso: number;
  noCumple: number;
  total: number;          // derivado
}

export interface ResumenDominio {
  dominio: Dominio;
  componentes: ConteoComponente[];
  totalDominio: number;
  pctCumple: number;      // 0..1
  pctEnProceso: number;   // 0..1
  pctNoCumple: number;    // 0..1
}

/** Shape devuelto por el RPC get_matriz_legal_resumen. */
export interface MatrizLegalResumen {
  periodo: number;
  sgSst: ResumenDominio;
  ambiental: ResumenDominio;
}

// ── Funciones puras (negocio, testeables; replican el cálculo del RPC) ──────────

/** Total de un componente = suma de los tres estados. */
export function totalComponente(c: Pick<ConteoComponente, 'cumple' | 'enProceso' | 'noCumple'>): number {
  return c.cumple + c.enProceso + c.noCumple;
}

/**
 * % de un valor sobre el total del dominio. Guarda división por cero:
 * total <= 0 ⇒ 0 (sin NaN/Infinity).
 */
export function porcentaje(valor: number, total: number): number {
  if (total <= 0) return 0;
  return valor / total;
}

/**
 * Construye el resumen de un dominio a partir de sus componentes con conteos.
 * Ordena por `orden`. Usado por el frontend para recálculo en vivo mientras el
 * usuario edita (mismo resultado que el RPC del backend).
 */
export function construirResumenDominio(
  dominio: Dominio,
  componentes: ConteoComponente[],
): ResumenDominio {
  const ordenados = [...componentes].sort(
    (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
  );
  let sCumple = 0, sEnProceso = 0, sNoCumple = 0;
  for (const c of ordenados) {
    c.total = totalComponente(c);
    sCumple += c.cumple;
    sEnProceso += c.enProceso;
    sNoCumple += c.noCumple;
  }
  const totalDominio = sCumple + sEnProceso + sNoCumple;
  return {
    dominio,
    componentes: ordenados,
    totalDominio,
    pctCumple: porcentaje(sCumple, totalDominio),
    pctEnProceso: porcentaje(sEnProceso, totalDominio),
    pctNoCumple: porcentaje(sNoCumple, totalDominio),
  };
}

/** Crea un ConteoComponente en cero a partir de un componente del catálogo. */
export function conteoVacio(comp: MatrizLegalComponente): ConteoComponente {
  return {
    componenteId: comp.id,
    nombre: comp.nombre,
    orden: comp.orden,
    cumple: 0,
    enProceso: 0,
    noCumple: 0,
    total: 0,
  };
}

/** Año actual como periodo por defecto. */
export function periodoActual(): number {
  return new Date().getFullYear();
}
