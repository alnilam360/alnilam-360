import { CapSesion } from '../../../../core/models/capacitacion.model';

export interface Cumplimiento {
  programadas: number;
  dictadas: number;
  canceladas: number;
  pct: number;
}

/**
 * programadas = sesiones con estado != 'cancelada' (total planeado vigente)
 * dictadas    = sesiones con estado 'dictada'
 * pct         = programadas > 0 ? round(dictadas / programadas * 100) : 0
 */
export function calcularCumplimiento(sesiones: CapSesion[]): Cumplimiento {
  const canceladas = sesiones.filter(s => s.estado === 'cancelada').length;
  const dictadas = sesiones.filter(s => s.estado === 'dictada').length;
  const programadas = sesiones.length - canceladas;
  const pct = programadas > 0 ? Math.round((dictadas / programadas) * 100) : 0;
  return { programadas, dictadas, canceladas, pct };
}
