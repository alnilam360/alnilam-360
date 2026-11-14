import { ProgramaVerificacionRow } from '../../../core/models/verificacion.model';
import { estadoPrograma, resumenPrograma } from './programa.funcion';

const fila = (p: Partial<ProgramaVerificacionRow>): ProgramaVerificacionRow => ({
  verificacion_id: 'x', tipo: 'inspeccion', subtipo: null, titulo: 't', estado: 'programada',
  fecha_programada: '2026-11-01', fecha_ejecucion: null, puntaje: null,
  hallazgos_abiertos: 0, hallazgos_vencidos: 0, ...p,
});
const HOY = '2026-11-14';

describe('programa.funcion', () => {
  it('fecha igual a hoy no es vencida', () => {
    expect(estadoPrograma(fila({ fecha_programada: HOY }), HOY)).toBe('pendiente');
  });
  it('programada con fecha pasada es vencida; en_curso también', () => {
    expect(estadoPrograma(fila({}), HOY)).toBe('vencida');
    expect(estadoPrograma(fila({ estado: 'en_curso' }), HOY)).toBe('vencida');
  });
  it('sin fecha_programada es pendiente', () => {
    expect(estadoPrograma(fila({ fecha_programada: null }), HOY)).toBe('pendiente');
  });
  it('cerrada con fecha pasada es ejecutada; cancelada es cancelada', () => {
    expect(estadoPrograma(fila({ estado: 'cerrada' }), HOY)).toBe('ejecutada');
    expect(estadoPrograma(fila({ estado: 'cancelada' }), HOY)).toBe('cancelada');
  });
  it('resumen cuenta y suma hallazgos vencidos', () => {
    const r = resumenPrograma([
      fila({ estado: 'cerrada', hallazgos_vencidos: 2 }),
      fila({}),
      fila({ fecha_programada: HOY, hallazgos_vencidos: 1 }),
      fila({ estado: 'cancelada' }),
    ], HOY);
    expect(r).toEqual({ total: 4, ejecutadas: 1, vencidas: 1, pendientes: 1, hallazgosVencidos: 3 });
  });
});
