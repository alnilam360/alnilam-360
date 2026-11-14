// ============================================================================
// Auditorías e Inspecciones (verificación SG-SST) — modelos de dominio
// Tablas: sst_verificacion, sst_verificacion_plantilla(_item), sst_verificacion_respuesta, sst_hallazgo
// ============================================================================

export type TipoVerificacion = 'inspeccion' | 'auditoria_interna';
export type EstadoVerificacion = 'programada' | 'en_curso' | 'cerrada' | 'cancelada';
export type ResultadoItem = 'cumple' | 'no_cumple' | 'no_aplica';
export type ClasificacionHallazgo = 'tecnico' | 'documental' | 'operativo' | 'administrativo';
export type SeveridadHallazgo = 'baja' | 'media' | 'alta' | 'critica';
export type EstadoHallazgo = 'abierto' | 'en_progreso' | 'cerrado';
export type JerarquiaControl = 'fuente' | 'medio' | 'individuo';

export interface Verificacion {
  id?: string;
  empresa_id: string;
  tipo: TipoVerificacion;
  subtipo: string | null;
  titulo: string;
  plantilla_id: string | null;
  sede_id: string | null;
  responsable_id: string | null;
  responsable_texto: string | null;
  fecha_programada: string | null;        // YYYY-MM-DD
  fecha_ejecucion: string | null;
  estado: EstadoVerificacion;
  alcance: string | null;
  criterios: string | null;
  puntaje: number | null;                 // % cumplimiento, persistido al cerrar
  observaciones: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VerificacionPlantilla {
  id?: string;
  empresa_id: string | null;              // null = plantilla global
  tipo: TipoVerificacion;
  subtipo: string | null;
  nombre: string;
  activo: boolean;
  created_at?: string;
}

export interface VerificacionPlantillaItem {
  id?: string;
  plantilla_id: string;
  orden: number;
  texto: string;
  categoria: string | null;
  estandar_id: string | null;
  activo: boolean;
  created_at?: string;
}

export interface VerificacionRespuesta {
  id?: string;
  verificacion_id: string;
  orden: number;
  item_texto: string;
  plantilla_item_id: string | null;
  resultado: ResultadoItem | null;
  observacion: string | null;
  evidencia_url: string | null;
  created_at?: string;
}

export interface Hallazgo {
  id?: string;
  empresa_id: string;
  verificacion_id: string;
  respuesta_id: string | null;
  descripcion: string;
  clasificacion: ClasificacionHallazgo | null;
  severidad: SeveridadHallazgo | null;
  estandar_id: string | null;
  responsable_id: string | null;
  responsable_texto: string | null;
  fecha_compromiso: string | null;
  jerarquia: JerarquiaControl | null;
  estado: EstadoHallazgo;
  fecha_cierre: string | null;
  eficacia_verificada: boolean;
  fecha_verificacion: string | null;
  evidencia_cierre_url: string | null;
  created_at?: string;
}

/** Datos para exportar el informe de una verificación a Excel. */
export interface InformeVerificacion {
  empresaNombre: string;
  verificacion: Verificacion;
  respuestas: VerificacionRespuesta[];
  hallazgos: Hallazgo[];
  estandaresPorId?: Record<string, string>;
}

export interface EstandarLite {
  id: string;
  item: string;
  descripcion_estandar: string;
}

/** Fila del RPC get_programa_verificaciones(p_empresa_id, p_anio). */
export interface ProgramaVerificacionRow {
  verificacion_id: string;
  tipo: TipoVerificacion;
  subtipo: string | null;
  titulo: string;
  estado: EstadoVerificacion;
  fecha_programada: string | null;
  fecha_ejecucion: string | null;
  puntaje: number | null;
  hallazgos_abiertos: number;
  hallazgos_vencidos: number;
}
