import { esGrave, fusionarEquipo, puedeCerrar } from './investigacion.funcion';

describe('investigacion.funcion', () => {
  it('esGrave', () => {
    expect(esGrave('leve', false)).toBeFalse();
    expect(esGrave('grave', false)).toBeTrue();
    expect(esGrave('mortal', false)).toBeTrue();
    expect(esGrave(null, true)).toBeTrue();
  });

  it('puedeCerrar', () => {
    expect(puedeCerrar([])).toBeFalse();
    expect(puedeCerrar([{ responsable_texto: 'Ana', fecha_compromiso: '2026-12-01' }])).toBeTrue();
    expect(puedeCerrar([{ responsable_id: 'x', fecha_compromiso: '2026-12-01' }])).toBeTrue();
    expect(puedeCerrar([{ responsable_texto: 'Ana', fecha_compromiso: null }])).toBeFalse();
    expect(puedeCerrar([{ responsable_texto: '', fecha_compromiso: '2026-12-01' }])).toBeFalse();
  });

  it('fusionarEquipo no duplica ni muta', () => {
    const actual = [{ trabajador_id: 't1', nombre: 'Ana', rol: 'COPASST', fuente: 'copasst' as const }];
    const r = fusionarEquipo(actual, [
      { trabajador_id: 't1', nombre: 'Ana', rol: 'COPASST', fuente: 'copasst' },
      { trabajador_id: 't2', nombre: 'Luis', rol: 'SST', fuente: 'sst' },
      { trabajador_id: null, nombre: ' luis ', rol: 'sst', fuente: 'sst' },
      { trabajador_id: null, nombre: 'Pedro', rol: 'Jefe', fuente: 'sst' },
      { trabajador_id: null, nombre: 'pedro', rol: 'jefe', fuente: 'sst' },
    ]);
    // ' luis ' (sin id) duplica a Luis por nombre+rol ⇒ se descarta; 'pedro' duplica a Pedro.
    expect(r.map((m) => m.nombre)).toEqual(['Ana', 'Luis', 'Pedro']);
    expect(actual.length).toBe(1);
  });
});
