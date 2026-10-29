import {
  MatrizLegalComponente,
  ConteoComponente,
  construirResumenDominio,
  conteoVacio,
  totalComponente,
  porcentaje,
} from './matriz-legal.model';

// Dataset sintético (NO los valores del Excel del cliente).
function comp(id: string, dominio: 'SG_SST' | 'AMBIENTAL', nombre: string, orden = 0): MatrizLegalComponente {
  return { id, empresa_id: null, dominio, nombre, orden, activo: true };
}

function conteo(
  id: string, nombre: string, orden: number,
  cumple: number, enProceso: number, noCumple: number,
): ConteoComponente {
  return { componenteId: id, nombre, orden, cumple, enProceso, noCumple, total: 0 };
}

describe('matriz-legal.model — funciones puras', () => {
  it('totalComponente suma los tres estados', () => {
    expect(totalComponente({ cumple: 4, enProceso: 1, noCumple: 1 })).toBe(6);
  });

  it('porcentaje = valor / total', () => {
    expect(porcentaje(3, 4)).toBeCloseTo(0.75, 5);
  });

  it('porcentaje con total 0 devuelve 0 (guard división por cero, sin NaN/Infinity)', () => {
    const p = porcentaje(0, 0);
    expect(p).toBe(0);
    expect(Number.isNaN(p)).toBeFalse();
    expect(Number.isFinite(p)).toBeTrue();
  });

  it('construirResumenDominio calcula totales y % sobre el total del dominio', () => {
    const r = construirResumenDominio('SG_SST', [
      conteo('sg2', 'Emergencias', 20, 0, 0, 1),
      conteo('sg1', 'ATEL', 10, 2, 1, 0),
    ]);

    // Ordena por `orden` (ATEL antes que Emergencias).
    expect(r.componentes.map(c => c.nombre)).toEqual(['ATEL', 'Emergencias']);
    // Total por componente derivado.
    expect(r.componentes[0].total).toBe(3);
    expect(r.componentes[1].total).toBe(1);
    // Total del dominio = 4.
    expect(r.totalDominio).toBe(4);
    // % = estado / total dominio.
    expect(r.pctCumple).toBeCloseTo(2 / 4, 5);
    expect(r.pctEnProceso).toBeCloseTo(1 / 4, 5);
    expect(r.pctNoCumple).toBeCloseTo(1 / 4, 5);
    // Los tres % suman 1 cuando hay datos.
    expect(r.pctCumple + r.pctEnProceso + r.pctNoCumple).toBeCloseTo(1, 5);
  });

  it('dominio sin datos: total 0 y % en 0 (no NaN)', () => {
    const r = construirResumenDominio('AMBIENTAL', [conteo('am1', 'Agua', 10, 0, 0, 0)]);
    expect(r.totalDominio).toBe(0);
    expect(r.pctCumple).toBe(0);
    expect(r.pctEnProceso).toBe(0);
    expect(r.pctNoCumple).toBe(0);
  });

  it('conteoVacio crea un componente en cero a partir del catálogo', () => {
    const v = conteoVacio(comp('sg1', 'SG_SST', 'ATEL', 10));
    expect(v).toEqual({ componenteId: 'sg1', nombre: 'ATEL', orden: 10, cumple: 0, enProceso: 0, noCumple: 0, total: 0 });
  });
});
