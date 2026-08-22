export interface CatalogItem {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface PlanTrabajoAnual {
  id?: string;
  empresa_id: string;
  anio: number;
  estado: 'Borrador' | 'Publicado';
  objetivo?: string;
  alcance?: string;
  recursos?: string;
  meta?: string;
  meta_porcentaje: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlanTrabajoActividad {
  id?: string;
  plan_id: string;
  fases: string[];
  programa_id?: string;
  actividad: string;
  ciudad?: string;
  grupo_objetivo_id?: string;
  grupo_objetivo_custom?: string;
  responsable_id?: string;
  evidencia?: string;
  created_at?: string;
  updated_at?: string;
  // joined
  programa?: CatalogItem;
  grupo_objetivo?: CatalogItem;
  responsable?: CatalogItem;
  meses?: PlanTrabajoActividadMes[];
}

export interface PlanTrabajoActividadMes {
  id?: string;
  actividad_id: string;
  mes: number;
  programado: boolean;
  ejecutado: boolean;
}

export interface PlanTrabajoAnalisisTrimestral {
  id?: string;
  plan_id: string;
  periodo: 1 | 2 | 3 | 4;
  analisis?: string;
  plan_accion?: string;
  fecha?: string;
  responsable_id?: string;
  created_at?: string;
  updated_at?: string;
  // joined
  responsable?: CatalogItem;
}

export interface KpiMes {
  mes: number;
  label: string;
  programadas: number;
  ejecutadas: number;
  porcentaje: number | null;
}

export interface KpiResumen {
  meses: KpiMes[];
  totalProgramadas: number;
  totalEjecutadas: number;
  cumplimientoAnual: number | null;
  metaPorcentaje: number;
}

export const MESES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export const TRIMESTRES = [
  { periodo: 1 as const, label: 'Q1 Ene–Mar', meses: [1,2,3] },
  { periodo: 2 as const, label: 'Q2 Abr–Jun', meses: [4,5,6] },
  { periodo: 3 as const, label: 'Q3 Jul–Sep', meses: [7,8,9] },
  { periodo: 4 as const, label: 'Q4 Oct–Dic', meses: [10,11,12] },
];
