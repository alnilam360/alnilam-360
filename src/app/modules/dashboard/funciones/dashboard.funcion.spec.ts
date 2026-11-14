import {
  arcosDonut,
  cumplimientoPorCiclo,
  estadoActividades,
  estadoCumplimiento0312,
  proximasDesdeActividades
} from './dashboard.funcion';

describe('dashboard.funcion', () => {
  it('estadoCumplimiento0312 respeta umbrales', () => {
    expect(estadoCumplimiento0312(90)).toEqual({ label: 'Aceptable', color: '#10b981' });
    expect(estadoCumplimiento0312(86).label).toBe('Aceptable');
    expect(estadoCumplimiento0312(70)).toEqual({ label: 'Moderadamente aceptable', color: '#f59e0b' });
    expect(estadoCumplimiento0312(60).label).toBe('Crítico');
    expect(estadoCumplimiento0312(36)).toEqual({ label: 'Crítico', color: '#ef4444' });
  });

  it('estadoActividades respeta umbrales', () => {
    expect(estadoActividades(85).label).toBe('Completadas');
    expect(estadoActividades(60).label).toBe('En avance');
    expect(estadoActividades(59).label).toBe('Bajo');
  });

  describe('proximasDesdeActividades', () => {
    const act = (actividad: string, ...meses: number[]) => ({
      actividad,
      meses: meses.map(mes => ({ mes, programado: true }))
    });

    it('vacío => vacío', () => {
      expect(proximasDesdeActividades([], 5, 3)).toEqual([]);
    });

    it('descarta meses pasados, ordena y respeta límite', () => {
      const r = proximasDesdeActividades([act('A', 2, 9), act('B', 6), act('C', 5, 7)], 5, 3);
      expect(r.map(x => x.title)).toEqual(['C', 'B', 'C']);
      expect(r.map(x => x.month)).toEqual(['MAY', 'JUN', 'JUL']);
    });

    it('ignora meses no programados', () => {
      const r = proximasDesdeActividades([{ actividad: 'X', meses: [{ mes: 8, programado: false }] }], 1, 3);
      expect(r).toEqual([]);
    });
  });

  it('cumplimientoPorCiclo agrupa y calcula %', () => {
    const d = (c: string, cal: string) => ({ calificacion: cal, estandar: { ciclo_phva: c } });
    const r = cumplimientoPorCiclo([d('Hacer', 'Cumple Totalmente'), d('Hacer', 'No Cumple'), d('Planear', 'Cumple Totalmente')]);
    expect(r.map(x => x.ciclo)).toEqual(['Planear', 'Hacer']);
    expect(r[1]).toEqual({ ciclo: 'Hacer', total: 2, cumplen: 1, porcentaje: 50 });
  });

  it('cumplimientoPorCiclo excluye No Aplica de la base', () => {
    const d = (c: string, cal: string) => ({ calificacion: cal, estandar: { ciclo_phva: c } });
    const r = cumplimientoPorCiclo([d('Planear', 'Cumple Totalmente'), d('Planear', 'No Aplica'), d('Planear', 'No Cumple')]);
    expect(r[0]).toEqual({ ciclo: 'Planear', total: 2, cumplen: 1, porcentaje: 50 });
  });

  describe('arcosDonut', () => {
    it('[] => []', () => expect(arcosDonut([], 100)).toEqual([]));
    it('1 peso ocupa todo', () => expect(arcosDonut([1], 100)).toEqual([{ dash: 100, offset: 0 }]));
    it('[1,1,2] reparte proporcional', () => {
      expect(arcosDonut([1, 1, 2], 100)).toEqual([
        { dash: 25, offset: 0 },
        { dash: 25, offset: 25 },
        { dash: 50, offset: 50 }
      ]);
    });
  });
});
