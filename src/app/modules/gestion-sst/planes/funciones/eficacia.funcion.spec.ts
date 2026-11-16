import { EficaciaSesion } from '../../../../core/models/capacitacion.model';
import { resumirEficacia } from './eficacia.funcion';

const ses = (antes: number, despues: number, i = 1): EficaciaSesion => ({
  sesion_id: 's' + i, fecha: '2026-01-01', antes, despues, delta: despues - antes, mejora_pct: null,
});

describe('resumirEficacia', () => {
  it('lista vacía: sin_datos, mejoraPct null', () => {
    expect(resumirEficacia([])).toEqual({ totalAntes: 0, totalDespues: 0, deltaTotal: 0, mejoraPct: null, semaforo: 'sin_datos' });
  });

  it('mejora: agrega totales crudos (10+5 vs 4+1)', () => {
    const r = resumirEficacia([ses(10, 4, 1), ses(5, 1, 2)]);
    expect(r.deltaTotal).toBe(-10);
    expect(r.mejoraPct).toBe(66.7);
    expect(r.semaforo).toBe('mejora');
  });

  it('empeora: antes 2 despues 5', () => {
    const r = resumirEficacia([ses(2, 5)]);
    expect(r.semaforo).toBe('empeora');
    expect(r.mejoraPct).toBe(-150);
  });

  it('neutro: 4 vs 4', () => {
    const r = resumirEficacia([ses(4, 4)]);
    expect(r.semaforo).toBe('neutro');
    expect(r.mejoraPct).toBe(0);
  });

  it('todas antes=0: sin_datos sin dividir por cero', () => {
    const r = resumirEficacia([ses(0, 3, 1), ses(0, 0, 2)]);
    expect(r.semaforo).toBe('sin_datos');
    expect(r.mejoraPct).toBeNull();
  });

  it('redondeo a 1 decimal en .5 (1 de 8 = 12.5)', () => {
    expect(resumirEficacia([ses(8, 7)]).mejoraPct).toBe(12.5);
  });
});
