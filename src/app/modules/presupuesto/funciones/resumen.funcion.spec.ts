import { formatearCOP, formatearMeta, porcentajeAvance } from './resumen.funcion';
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
  it('repartoPresupuestadoSocio redondea', () => expect(repartoPresupuestadoSocio(1001, 0.5)).toBe(501));
  it('sumaPorcentajes solo activos', () => {
    const socios = [
      { porcentaje: 0.6, activo: true }, { porcentaje: 0.4, activo: true }, { porcentaje: 0.5, activo: false },
    ];
    expect(sumaPorcentajes(socios)).toBeCloseTo(1, 10);
  });
});
