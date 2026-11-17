// Contrato BD <-> cliente del modulo seguimiento de examenes (plan 16). Espejo de 2026_11_17_01_seguimiento_examenes.sql.

export type SaludExamenTipo =
  | 'pre_ingreso'
  | 'periodica_programada'
  | 'cambio_ocupacion'
  | 'egreso'
  | 'post_incapacidad'
  | 'retorno'
  | 'seguimiento';

export type SaludAptitud = 'apto' | 'apto_con_restricciones' | 'aplazado' | 'remitido';
export type SaludRestriccionClase = 'restriccion' | 'recomendacion';
export type SaludTemporalidad = 'temporal' | 'permanente';
export type SaludRestriccionEstado = 'abierta' | 'en_gestion' | 'cerrada';
export type SaludEstadoVigencia = 'vigente' | 'por_vencer' | 'vencido' | 'sin_examen';
export type SaludPendiente = 'pre_ingreso' | 'periodica_programada' | 'egreso';

export interface SaludExamen {
  id: string;
  empresa_id: string;
  trabajador_id: string;
  tipo: SaludExamenTipo;
  fecha: string;
  fecha_proximo: string | null;
  aptitud: SaludAptitud | null;
  requiere_seguimiento: boolean;
  ips_nombre: string | null;
  medico_licencia: string | null;
  concepto_path: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaludRestriccion {
  id: string;
  empresa_id: string;
  examen_id: string;
  clase: SaludRestriccionClase;
  descripcion: string;
  temporalidad: SaludTemporalidad | null;
  fecha_fin: string | null;
  estado: SaludRestriccionEstado;
  responsable: string | null;
  fecha_limite_accion: string | null;
  created_at: string;
  updated_at: string;
}

/** Fila de rpc salud_cobertura(p_anio). */
export interface SaludCoberturaRow {
  trabajador_id: string;
  nombre: string;
  cargo: string | null;
  sede_id: string;
  ultimo_examen: string | null;
  tipo_ultimo: SaludExamenTipo | null;
  aptitud: SaludAptitud | null;
  proximo: string | null;
  estado_vigencia: SaludEstadoVigencia;
  pendientes: SaludPendiente[];
}

/** Fila de rpc salud_diagnostico_general(p_anio): conteo agregado anonimizado (Art. 20 Res. 1843/2025). */
export interface SaludDiagnosticoRow {
  categoria: string;
  subcategoria: string;
  n: number;
}

/** Fila de rpc salud_perfil_cargo(p_cargo). */
export interface SaludPerfilCargoRow {
  peligro_id: string | null;
  peligro_descripcion: string;
  examenes_sugeridos: string[];
}
