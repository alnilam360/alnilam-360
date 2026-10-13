/**
 * Alnilam 360 — Módulo Política, Objetivos y Metas SST
 * Modelos y DTOs de datos para documentos controlados y objetivos SMART
 */

export type PoliticaSstEstado = 'borrador' | 'en_revision' | 'aprobado' | 'publicado' | 'obsoleto';

export type ObjetivoSstEstado = 'vigente' | 'cumplido' | 'no_cumplido' | 'vencido';

export type CriterioCumplimiento = 'mayor_igual' | 'menor_igual';

export interface TrabajadorSimple {
  id: string;
  nombre: string;
  cargo: string;
  documento?: string;
}

export interface PoliticaSst {
  id: string;
  empresa_id: string;
  version: number;
  contenido: string;
  alcance: string;
  estado: PoliticaSstEstado;
  elaborado_por?: string | null;
  elaborado_por_trabajador?: TrabajadorSimple | null;
  revisado_por?: string | null;
  revisado_por_trabajador?: TrabajadorSimple | null;
  aprobado_por_nombre?: string | null;
  fecha_elaboracion: string;
  fecha_aprobacion?: string | null;
  fecha_publicacion?: string | null;
  fecha_proxima_revision?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogoResponsablePlanItem {
  id: string;
  nombre: string;
  orden?: number;
  activo?: boolean;
}

export interface IndicadorDisponible {
  id: string;
  nombre: string;
  tipo: string;
  formula?: string;
  frecuencia?: string;
  meta?: number;
  meta_texto?: string;
  ultimo_resultado?: number | null;
  ultimo_anio?: number;
  ultimo_mes?: number;
}

export interface ObjetivoSst {
  id: string;
  empresa_id: string;
  politica_sst_id: string;
  descripcion: string;
  meta_texto: string;
  meta_valor_numerico?: number | null;
  meta_unidad?: string | null;
  criterio_cumplimiento: CriterioCumplimiento;
  indicador_vinculado_id?: string | null;
  responsable_id?: string | null;
  responsable_item?: CatalogoResponsablePlanItem | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: ObjetivoSstEstado;
  orden: number;
  created_at: string;
  updated_at: string;

  // Campos calculados / de la vista v_objetivo_sst_avance
  indicador_nombre?: string | null;
  indicador_tipo?: string | null;
  indicador_ultimo_resultado?: number | null;
  indicador_ultimo_anio?: number | null;
  indicador_ultimo_mes?: number | null;
  porcentaje_avance?: number | null;
}

export interface EstadoVencimientoInfo {
  estado: 'vigente' | 'por_vencer' | 'vencido' | 'sin_fecha';
  diasRestantes: number | null;
  label: string;
  claseColor: string;
  icono: string;
}
