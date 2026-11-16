import { CapEstadoSesion, CapSesion } from '../../../../core/models/capacitacion.model';
import { calcularCumplimiento } from './cumplimiento.funcion';

const ses = (...estados: CapEstadoSesion[]): CapSesion[] =>
  estados.map((estado, i) => ({ id: `${i}`, empresa_id: 'e', tema_id: 't', fecha: '2026-01-01', estado }));

describe('calcularCumplimiento', () => {
  it('lista vacia: pct 0 sin dividir por cero', () => {
    expect(calcularCumplimiento([])).toEqual({ programadas: 0, dictadas: 0, canceladas: 0, pct: 0 });
  });

  it('todas dictadas: 100', () => {
    expect(calcularCumplimiento(ses('dictada', 'dictada')).pct).toBe(100);
  });

  it('mezcla: canceladas no cuentan como programadas', () => {
    const r = calcularCumplimiento(ses('dictada', 'programada', 'cancelada', 'programada'));
    expect(r).toEqual({ programadas: 3, dictadas: 1, canceladas: 1, pct: 33 });
  });

  it('todas canceladas: programadas 0, pct 0', () => {
    expect(calcularCumplimiento(ses('cancelada', 'cancelada'))).toEqual(
      { programadas: 0, dictadas: 0, canceladas: 2, pct: 0 });
  });

  it('redondeo .5 hacia arriba (1/8 = 12.5 -> 13)', () => {
    const r = calcularCumplimiento(ses('dictada', ...Array(7).fill('programada') as CapEstadoSesion[]));
    expect(r.pct).toBe(13);
  });
});
