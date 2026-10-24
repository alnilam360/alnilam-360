// ============================================================================
// Modelo de Dominio: Matriz Legal (Identificación y Evaluación de Requisitos
// Legales y de Otra Índole) — SG-SST y Ambiental.
//
// Fuentes normativas: Decreto 1072/2015 Art. 2.2.4.6.2 (matriz legal
// actualizable), Resolución 0312/2019 (estándares mínimos). El indicador de
// cumplimiento = requisitos cumplidos / total aplicables.
//
// Los valores del archivo del cliente son solo un ejemplo: todas las cifras del
// tablero de evaluación se derivan de los requisitos reales registrados.
// ============================================================================

// ── Enums de dominio ─────────────────────────────────────────────────────────
export type Dominio = 'SG_SST' | 'AMBIENTAL';

export const DOMINIOS = ['SG_SST', 'AMBIENTAL'] as const;

export const DOMINIO_LABEL: Record<Dominio, string> = {
  SG_SST: 'Normatividad SG-SST',
  AMBIENTAL: 'Normatividad Ambiental',
};

/** Estados de cumplimiento. NO_APLICA se excluye del total evaluable. */
export type EstadoCumplimiento = 'CUMPLE' | 'EN_PROCESO' | 'NO_CUMPLE' | 'NO_APLICA';

export const ESTADOS_CUMPLIMIENTO = ['CUMPLE', 'EN_PROCESO', 'NO_CUMPLE', 'NO_APLICA'] as const;

export const ESTADO_LABEL: Record<EstadoCumplimiento, string> = {
  CUMPLE: 'Cumple',
  EN_PROCESO: 'En proceso',
  NO_CUMPLE: 'No cumple',
  NO_APLICA: 'No aplica',
};

/** Color semántico (Ionic) por estado, reutilizable en chips/tablero. */
export const ESTADO_COLOR: Record<EstadoCumplimiento, 'success' | 'warning' | 'danger' | 'medium'> = {
  CUMPLE: 'success',
  EN_PROCESO: 'warning',
  NO_CUMPLE: 'danger',
  NO_APLICA: 'medium',
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

export interface TipoNorma {
  id: string;
  nombre: string;
  jerarquia: number;
  activo: boolean;
  created_at?: string;
}

export interface MatrizLegalConfig {
  id?: string;
  empresa_id: string;
  codigo_formato: string | null;
  version: string | null;
  fecha_actualizacion: string | null;         // ISO date
  responsable_actualizacion: string | null;
  fecha_verificacion: string | null;          // ISO date
  responsable_verificacion: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MatrizLegalRequisito {
  id?: string;
  empresa_id: string;
  componente_id: string;
  tipo_norma_id: string | null;
  numero: string | null;
  anio: number | null;
  fecha_expedicion: string | null;            // ISO date
  entidad_emisora: string | null;
  articulos_aplicables: string | null;
  descripcion_requisito: string;
  aplicacion_empresa: string | null;
  estado_cumplimiento: EstadoCumplimiento;
  evidencia_cumplimiento: string | null;
  responsable: string | null;
  fecha_verificacion: string | null;          // ISO date
  observaciones: string | null;
  es_otra_indole: boolean;
  vigente: boolean;
  norma_deroga: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Relaciones embebidas (join opcional)
  componente?: Pick<MatrizLegalComponente, 'id' | 'nombre' | 'dominio'> | null;
  tipo_norma?: Pick<TipoNorma, 'id' | 'nombre'> | null;
}

// ── Filtros de listado ────────────────────────────────────────────────────────
export interface FiltrosRequisito {
  dominio?: Dominio;
  componenteId?: string;
  tipoNormaId?: string;
  estado?: EstadoCumplimiento;
  vigente?: boolean;
  esOtraIndole?: boolean;
  texto?: string;
}

// ── Tipos derivados para el tablero (hoja EVALUACION CUMPLIMIENTO) ─────────────
/** Conteo por estado reutilizando las claves del enum (mapped type). */
export type ConteoEstados = Record<EstadoCumplimiento, number>;

export interface ConteoComponente {
  componenteId: string;
  nombre: string;
  dominio: Dominio;
  conteos: ConteoEstados;
  /** Total aplicable = todos los estados EXCEPTO NO_APLICA. */
  totalAplicable: number;
  /** CUMPLE / totalAplicable; null si no hay requisitos aplicables. */
  porcentajeCumplimiento: number | null;
}

export interface ResumenDominio {
  dominio: Dominio;
  componentes: ConteoComponente[];
  conteos: ConteoEstados;
  totalAplicable: number;
  porcentajeCumplimiento: number | null;
}

export interface EvaluacionCumplimiento {
  porDominio: ResumenDominio[];
  /** Totales globales (gran total de la hoja). */
  totalConteos: ConteoEstados;
  totalAplicable: number;
  porcentajeCumplimiento: number | null;
}

// ── Funciones puras (negocio, testeables) ──────────────────────────────────────

/** Crea un acumulador de conteos en cero. */
export function conteosVacios(): ConteoEstados {
  return { CUMPLE: 0, EN_PROCESO: 0, NO_CUMPLE: 0, NO_APLICA: 0 };
}

/** Suma b sobre a (muta a). */
function acumular(a: ConteoEstados, b: ConteoEstados): void {
  for (const e of ESTADOS_CUMPLIMIENTO) a[e] += b[e];
}

/** Total aplicable = todos los estados salvo NO_APLICA. */
export function totalAplicable(c: ConteoEstados): number {
  return c.CUMPLE + c.EN_PROCESO + c.NO_CUMPLE;
}

/**
 * % de cumplimiento = CUMPLE / total aplicable (Dec. 1072/2015).
 * Guard de división por cero: sin requisitos aplicables ⇒ null (no 0, para
 * distinguir "sin datos" de "0 % cumplido").
 */
export function porcentajeCumplimiento(c: ConteoEstados): number | null {
  const total = totalAplicable(c);
  if (total <= 0) return null;
  return c.CUMPLE / total;
}

/** Cuenta por estado una lista de requisitos. */
export function contarPorEstado(reqs: MatrizLegalRequisito[]): ConteoEstados {
  const acc = conteosVacios();
  for (const r of reqs) acc[r.estado_cumplimiento]++;
  return acc;
}

/**
 * Construye la estructura completa de la hoja EVALUACION CUMPLIMIENTO a partir
 * de los requisitos reales y el catálogo de componentes. Agrupa por dominio y
 * conserva el orden de los componentes. Componentes sin requisitos aparecen con
 * conteos en cero y % = null.
 */
export function construirEvaluacion(
  reqs: MatrizLegalRequisito[],
  componentes: MatrizLegalComponente[],
): EvaluacionCumplimiento {
  // Agrupar requisitos por componente_id.
  const porComponente = new Map<string, ConteoEstados>();
  for (const r of reqs) {
    let c = porComponente.get(r.componente_id);
    if (!c) { c = conteosVacios(); porComponente.set(r.componente_id, c); }
    c[r.estado_cumplimiento]++;
  }

  const porDominio: ResumenDominio[] = [];
  const totalConteos = conteosVacios();

  for (const dom of DOMINIOS) {
    const compsDom = componentes
      .filter(c => c.dominio === dom && c.activo)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

    const conteosDom = conteosVacios();
    const detalle: ConteoComponente[] = compsDom.map(comp => {
      const conteos = porComponente.get(comp.id) ?? conteosVacios();
      acumular(conteosDom, conteos);
      return {
        componenteId: comp.id,
        nombre: comp.nombre,
        dominio: comp.dominio,
        conteos,
        totalAplicable: totalAplicable(conteos),
        porcentajeCumplimiento: porcentajeCumplimiento(conteos),
      };
    });

    acumular(totalConteos, conteosDom);
    porDominio.push({
      dominio: dom,
      componentes: detalle,
      conteos: conteosDom,
      totalAplicable: totalAplicable(conteosDom),
      porcentajeCumplimiento: porcentajeCumplimiento(conteosDom),
    });
  }

  return {
    porDominio,
    totalConteos,
    totalAplicable: totalAplicable(totalConteos),
    porcentajeCumplimiento: porcentajeCumplimiento(totalConteos),
  };
}
