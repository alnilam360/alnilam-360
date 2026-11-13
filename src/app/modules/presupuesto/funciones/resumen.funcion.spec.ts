import {
  claseVariacion, estadoAvance, formatearCOP, formatearMeta, formatearVariacionPct, porcentajeAvance, variacion, variacionPct,
} from './resumen.funcion';
import { repartoPresupuestadoSocio, sumaPorcentajes } from '../../../core/models/presupuesto.model';

describe('resumen.funcion', () => {
  it('porcentajeAvance normal', () => expect(porcentajeAvance(50, 200)).toBe(0.25));
  it('porcentajeAvance sin presupuesto => 0', () => expect(porcentajeAvance(50, 0)).toBe(0));
  it('formatearMeta null => guion', () => expect(formatearMeta(null)).toBe('—'));
  it('formatearMeta con 2 decimales', () => expect(formatearMeta(0.1234)).toBe('12.34%'));
  it('formatearCOP de 0 sin decimales', () => {
    const t = formatearCOP(0);
    expect(t).toContain('0');
    expect(t).not.toMatch(/[.,]\d{2}$/);
  });
  it('formatearCOP de millones agrupa miles', () => {
    expect(formatearCOP(1500000).replace(/\D/g, '')).toBe('1500000');
    expect(formatearCOP(1500000)).toMatch(/1\.500\.000/);
  });
  it('variacion', () => {
    expect(variacion(2900000, 6005000)).toBe(-3105000);
    expect(variacion(120, 100)).toBe(20);
    expect(variacion(0, 0)).toBe(0);
  });
  it('variacionPct', () => {
    expect(variacionPct(120, 100)).toBeCloseTo(0.2, 10);
    expect(variacionPct(80, 100)).toBeCloseTo(-0.2, 10);
    expect(variacionPct(50, 0)).toBeNull();
    expect(variacionPct(0, 0)).toBeNull();
  });
  it('estadoAvance', () => {
    expect(estadoAvance(120, 100)).toBe('sobre');
    expect(estadoAvance(95, 100)).toBe('cerca');
    expect(estadoAvance(90, 100)).toBe('cerca');
    expect(estadoAvance(50, 100)).toBe('bajo');
    expect(estadoAvance(0, 0)).toBe('bajo');
  });
  it('formatearVariacionPct y claseVariacion', () => {
    expect(formatearVariacionPct(null)).toBe('—');
    expect(formatearVariacionPct(0.2)).toBe('+20.0%');
    expect(formatearVariacionPct(-0.2)).toBe('-20.0%');
    expect(claseVariacion(0.1)).toBe('text-red-400');
    expect(claseVariacion(-0.1)).toBe('text-emerald-400');
    expect(claseVariacion(null)).toBe('text-dark-text');
  });
  it('repartoPresupuestadoSocio redondea', () => expect(repartoPresupuestadoSocio(1001, 0.5)).toBe(501));
  it('sumaPorcentajes solo activos', () => {
    const socios = [
      { porcentaje: 0.6, activo: true }, { porcentaje: 0.4, activo: true }, { porcentaje: 0.5, activo: false },
    ];
    expect(sumaPorcentajes(socios)).toBeCloseTo(1, 10);
  });
});
