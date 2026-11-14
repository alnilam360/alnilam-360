import { ProgramaVerificacionRow } from '../../../core/models/verificacion.model';

export type EstadoPrograma = 'ejecutada' | 'vencida' | 'pendiente' | 'cancelada';

export interface ResumenPrograma {
  total: number;
  ejecutadas: number;
  vencidas: number;
  pendientes: number;
  hallazgosVencidos: number;
}

/** `hoy` en formato YYYY-MM-DD; la comparación de strings ISO es cronológica. */
export function estadoPrograma(fila: ProgramaVerificacionRow, hoy: string): EstadoPrograma {
  if (fila.estado === 'cancelada') return 'cancelada';
  if (fila.estado === 'cerrada') return 'ejecutada';
  const fecha = fila.fecha_programada?.slice(0, 10);
  return fecha && fecha < hoy ? 'vencida' : 'pendiente';
}

export function resumenPrograma(filas: ProgramaVerificacionRow[], hoy: string): ResumenPrograma {
  const r: ResumenPrograma = { total: 0, ejecutadas: 0, vencidas: 0, pendientes: 0, hallazgosVencidos: 0 };
  for (const f of filas) {
    r.total++;
    r.hallazgosVencidos += f.hallazgos_vencidos ?? 0;
    const e = estadoPrograma(f, hoy);
    if (e === 'ejecutada') r.ejecutadas++;
    else if (e === 'vencida') r.vencidas++;
    else if (e === 'pendiente') r.pendientes++;
  }
  return r;
}
