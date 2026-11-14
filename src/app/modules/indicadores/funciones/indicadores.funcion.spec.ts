import { tasaAusentismo, tasaIncidencia, tasaPrevalencia } from './indicadores.funcion';

describe('indicadores.funcion', () => {
  describe('tasaAusentismo', () => {
    it('caso normal: 30 / 240 * 100 = 12.5', () => expect(tasaAusentismo(30, 240)).toBe(12.5));
    it('denominador 0 => 0', () => expect(tasaAusentismo(10, 0)).toBe(0));
    it('redondea a 2 decimales: 1/3*100 = 33.33', () => expect(tasaAusentismo(1, 3)).toBe(33.33));
    it('0 días => 0', () => expect(tasaAusentismo(0, 240)).toBe(0));
  });

  describe('tasaPrevalencia', () => {
    it('caso normal: 5 / 100 * 100000 = 5000', () => expect(tasaPrevalencia(5, 100)).toBe(5000));
    it('denominador 0 => 0', () => expect(tasaPrevalencia(5, 0)).toBe(0));
    it('redondea a 1 decimal: 1/3*100000 = 33333.3', () => expect(tasaPrevalencia(1, 3)).toBe(33333.3));
  });

  describe('tasaIncidencia', () => {
    it('caso normal: 2 / 80 * 100000 = 2500', () => expect(tasaIncidencia(2, 80)).toBe(2500));
    it('denominador 0 => 0', () => expect(tasaIncidencia(2, 0)).toBe(0));
    it('redondea a 1 decimal: 2/3*100000 = 66666.7', () => expect(tasaIncidencia(2, 3)).toBe(66666.7));
  });
});
