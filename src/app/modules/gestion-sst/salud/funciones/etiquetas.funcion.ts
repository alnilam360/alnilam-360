import { SaludAptitud, SaludExamenTipo, SaludPendiente } from '../../../../core/models/salud.model';

export const TIPO_EXAMEN_LABEL: Record<SaludExamenTipo, string> = {
  pre_ingreso: 'Pre-ingreso',
  periodica_programada: 'Periódica programada',
  cambio_ocupacion: 'Cambio de ocupación',
  egreso: 'Egreso',
  post_incapacidad: 'Post-incapacidad',
  retorno: 'Retorno',
  seguimiento: 'Seguimiento',
};

export const APTITUD_LABEL: Record<SaludAptitud, string> = {
  apto: 'Apto',
  apto_con_restricciones: 'Apto con restricciones',
  aplazado: 'Aplazado',
  remitido: 'Remitido',
};

export const PENDIENTE_LABEL: Record<SaludPendiente, string> = {
  pre_ingreso: 'Pre-ingreso',
  periodica_programada: 'Periódica',
  egreso: 'Egreso',
};

export const TIPOS_EXAMEN = Object.keys(TIPO_EXAMEN_LABEL) as SaludExamenTipo[];
export const APTITUDES = Object.keys(APTITUD_LABEL) as SaludAptitud[];
