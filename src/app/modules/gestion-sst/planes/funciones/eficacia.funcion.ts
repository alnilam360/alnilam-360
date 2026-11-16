import { EficaciaSesion } from '../../../../core/models/capacitacion.model';

export type SemaforoEficacia = 'mejora' | 'empeora' | 'neutro' | 'sin_datos';

export interface ResumenEficacia {
  totalAntes: number;
  totalDespues: number;
  deltaTotal: number;
  mejoraPct: number | null;
  semaforo: SemaforoEficacia;
}

/** Agrega sobre totales crudos (no promedia mejora_pct por sesión). Positivo = mejora. */
export function resumirEficacia(sesiones: EficaciaSesion[]): ResumenEficacia {
  const totalAntes = sesiones.reduce((s, x) => s + x.antes, 0);
  const totalDespues = sesiones.reduce((s, x) => s + x.despues, 0);
  const deltaTotal = totalDespues - totalAntes;
  if (sesiones.length === 0 || totalAntes === 0) {
    return { totalAntes, totalDespues, deltaTotal, mejoraPct: null, semaforo: 'sin_datos' };
  }
  const mejoraPct = Math.round(((totalAntes - totalDespues) / totalAntes) * 1000) / 10;
  const semaforo: SemaforoEficacia = deltaTotal < 0 ? 'mejora' : deltaTotal > 0 ? 'empeora' : 'neutro';
  return { totalAntes, totalDespues, deltaTotal, mejoraPct, semaforo };
}
