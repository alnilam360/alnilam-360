import { Periodicidad } from '../../../core/models/matriz-legal.model';
import { etiquetaCorte, maxNumero, numeroValido, opcionesNumero } from './periodicidad.funcion';

describe('periodicidad.funcion', () => {
  const validos: [Periodicidad, number, boolean][] = [
    ['ANUAL', 1, true], ['ANUAL', 2, false],
    ['SEMESTRAL', 2, true], ['SEMESTRAL', 3, false],
    ['TRIMESTRAL', 4, true], ['TRIMESTRAL', 5, false],
    ['MENSUAL', 12, true], ['MENSUAL', 0, false], ['MENSUAL', 13, false],
  ];
  validos.forEach(([p, n, esperado]) =>
    it(`numeroValido(${p}, ${n}) = ${esperado}`, () => expect(numeroValido(p, n)).toBe(esperado)));

  it('numeroValido rechaza no enteros', () => expect(numeroValido('MENSUAL', 1.5)).toBeFalse());

  const etiquetas: [number, Periodicidad, number, string][] = [
    [2026, 'ANUAL', 1, '2026'],
    [2026, 'SEMESTRAL', 2, '2.º semestre 2026'],
    [2026, 'TRIMESTRAL', 2, 'Q2 2026'],
    [2026, 'MENSUAL', 6, 'Jun 2026'],
  ];
  etiquetas.forEach(([a, p, n, esperado]) =>
    it(`etiquetaCorte(${a}, ${p}, ${n}) = ${esperado}`, () => expect(etiquetaCorte(a, p, n)).toBe(esperado)));

  it('maxNumero por periodicidad', () => {
    expect(maxNumero('ANUAL')).toBe(1);
    expect(maxNumero('MENSUAL')).toBe(12);
  });

  it('opcionesNumero trimestral = Q1..Q4', () => {
    expect(opcionesNumero('TRIMESTRAL').map(o => o.etiqueta)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });
});
