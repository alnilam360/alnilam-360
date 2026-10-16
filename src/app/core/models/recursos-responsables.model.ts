// ============================================================================
// Alnilam 360 — Módulo Recursos y Responsables (SG-SST)
// Contratos de datos, Interfaces y DTOs de TypeScript
// ============================================================================

export type TipoRecursoSST = 'humano' | 'financiero' | 'tecnico_tecnologico' | 'fisico_locativo';
export type EstadoRecursoSST = 'activo' | 'ejecutado' | 'pendiente';

export interface SstRecurso {
  id: string;
  empresa_id: string;
  tipo_recurso: TipoRecursoSST;
  descripcion: string;
  responsable_gestion?: string | null; // trabajador_id FK
  monto_presupuestado?: number | null;
  monto_ejecutado?: number | null;
  periodo: string; // ej. '2026'
  estado: EstadoRecursoSST;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined fields desde Trabajadores
  responsable?: {
    id: string;
    nombre: string;
    cargo?: string | null;
    documento?: string | null;
    area_trabajo?: string | null;
  } | null;
}

export type TipoComiteSST = 'COPASST' | 'COMITE_CONVIVENCIA' | 'BRIGADA_EMERGENCIA' | 'OTRO';
export type EstadoComiteSST = 'vigente' | 'en_proceso_eleccion' | 'vencido';
export type PeriodicidadActasSST = 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export interface SstComite {
  id: string;
  empresa_id: string;
  tipo_comite: TipoComiteSST;
  nombre_personalizado?: string | null;
  fecha_conformacion: string; // YYYY-MM-DD
  fecha_vigencia_fin: string; // YYYY-MM-DD
  periodo_anios: number; // 1 o 2 años
  acto_administrativo?: string | null; // ej. 'Resolución No. 004 de 2026'
  estado: EstadoComiteSST;
  periodicidad_actas: PeriodicidadActasSST;
  observaciones?: string | null;
  grupo_objetivo_id?: string | null;
  created_at?: string;
  updated_at?: string;

  // Campos calculados en frontend / service
  dias_restantes?: number;
  por_vencer?: boolean; // <= 60 días
  miembros_count?: number;
  actas_count?: number;
  ultima_acta_fecha?: string | null;
  alerta_acta_pendiente?: boolean;
}

export type RolEnComite = 'presidente' | 'secretario' | 'miembro' | 'jefe_brigada' | 'brigadista' | 'coordinador' | 'otro';
export type TipoRepresentacion = 'empleador' | 'trabajadores' | 'no_aplica';
export type TipoMiembro = 'principal' | 'suplente' | 'primeros_auxilios' | 'evacuacion_rescate' | 'control_incendios' | 'comunicaciones' | 'general';

export interface SstComiteMiembro {
  id: string;
  comite_id: string;
  trabajador_id: string;
  rol_en_comite: RolEnComite;
  tipo_representacion: TipoRepresentacion;
  tipo_miembro: TipoMiembro;
  fecha_inicio_participacion: string;
  fecha_fin_participacion?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;

  // Joined fields desde Trabajadores (Cero duplicación de datos de cédula, cargo, etc.)
  trabajador?: {
    id: string;
    documento: string;
    nombre: string;
    cargo?: string | null;
    area_trabajo?: string | null;
    eps?: string | null;
    arl?: string | null;
    telefono?: string | null;
  } | null;
}

export type TipoReunionActa = 'ordinaria' | 'extraordinaria';

export interface SstComiteCompromiso {
  descripcion: string;
  responsable_id?: string | null;
  responsable_nombre?: string | null;
  fecha_limite?: string | null;
  estado: 'pendiente' | 'en_proceso' | 'cumplido';
}

export interface SstComiteActa {
  id: string;
  comite_id: string;
  numero_acta: string; // 'Acta No. 001-2026'
  fecha_reunion: string; // YYYY-MM-DD
  tipo_reunion: TipoReunionActa;
  temas_tratados: string;
  compromisos?: string | null;
  compromisos_detalle?: SstComiteCompromiso[];
  archivo_acta_url?: string | null;
  created_at?: string;
  updated_at?: string;

  // Asistentes vinculados
  asistentes?: SstComiteActaAsistente[];
}

export interface SstComiteActaAsistente {
  id: string;
  acta_id: string;
  trabajador_id: string;
  miembro_id?: string | null;
  asistio: boolean;
  observacion?: string | null;
  trabajador?: {
    id: string;
    nombre: string;
    documento: string;
    cargo?: string | null;
  } | null;
}

export type TipoResponsabilidadRACI = 'R' | 'A' | 'C' | 'I';

export interface MatrizResponsabilidadRACI {
  id: string;
  empresa_id: string;
  actividad_sst: string;
  fase_phva?: 'Planear' | 'Hacer' | 'Verificar' | 'Actuar' | null;
  rol_cargo: string;
  trabajador_especifico_id?: string | null;
  tipo_responsabilidad: TipoResponsabilidadRACI;
  descripcion_responsabilidad?: string | null;
  orden: number;
  created_at?: string;
  updated_at?: string;

  trabajador?: {
    id: string;
    nombre: string;
    cargo?: string | null;
  } | null;
}

export interface PresupuestoResumenRecursos {
  totalPresupuestado: number;
  totalEjecutado: number;
  saldoDisponible: number;
  porcentajeEjecucion: number;
  porTipo: {
    humano: { presupuestado: number; ejecutado: number; cantidad: number };
    financiero: { presupuestado: number; ejecutado: number; cantidad: number };
    tecnico_tecnologico: { presupuestado: number; ejecutado: number; cantidad: number };
    fisico_locativo: { presupuestado: number; ejecutado: number; cantidad: number };
  };
}
