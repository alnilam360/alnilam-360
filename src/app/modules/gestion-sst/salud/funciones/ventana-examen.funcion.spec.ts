import { diasHabilesDesde } from './ventana-examen.funcion';

describe('diasHabilesDesde', () => {
  it('+5 hábiles desde viernes 2026-11-13 => viernes 2026-11-20 (egreso)', () => {
    expect(diasHabilesDesde('2026-11-13', 5)).toBe('2026-11-20');
  });
  it('+20 hábiles desde 2026-11-13 => 2026-12-11', () => {
    expect(diasHabilesDesde('2026-11-13', 20)).toBe('2026-12-11');
  });
  it('viernes +1 salta el fin de semana', () => {
    expect(diasHabilesDesde('2026-11-13', 1)).toBe('2026-11-16');
  });
  it('sábado +1 => lunes', () => {
    expect(diasHabilesDesde('2026-11-14', 1)).toBe('2026-11-16');
  });
  it('fin de mes: viernes 27-nov +1 => lunes 30-nov; +2 => 1-dic', () => {
    expect(diasHabilesDesde('2026-11-27', 1)).toBe('2026-11-30');
    expect(diasHabilesDesde('2026-11-27', 2)).toBe('2026-12-01');
  });
  it('fin de año: 2026-12-31 +2 => 2027-01-04', () => {
    expect(diasHabilesDesde('2026-12-31', 2)).toBe('2027-01-04');
  });
  it('n=0 devuelve la misma fecha', () => {
    expect(diasHabilesDesde('2026-11-14', 0)).toBe('2026-11-14');
  });
});
