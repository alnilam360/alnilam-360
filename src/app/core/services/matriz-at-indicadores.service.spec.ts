import {
  MatrizAtCaso,
  ParametrosMensuales,
  ValorIndicador,
} from '../models/matriz-at.model';
import { MatrizAtIndicadoresService } from './matriz-at-indicadores.service';

const K = 200000;

// Casos/parámetros mínimos: solo las propiedades que leen los métodos puros.
function caso(tipo: string, gravedad: string | null = null, dias = 0): MatrizAtCaso {
  return {
    tipo_evento: tipo, clasificacion_gravedad: gravedad,
    dias_incapacidad: dias, dias_cargados: 0,
  } as unknown as MatrizAtCaso;
}
const at = (g: string, dias = 0) => caso('accidente_trabajo', g, dias);
const incidente = () => caso('incidente_casi_accidente');

const param = {
  numero_trabajadores: 50, horas_hombre: 9600,
  meta_if: null, meta_is: null, meta_severidad: null, meta_tasa_accidentalidad: null,
} as unknown as ParametrosMensuales;

const ok = (valor: number): ValorIndicador => ({ valor, estado: 'ok', meta: null, cumpleMeta: null });
const pendiente: ValorIndicador = { valor: null, estado: 'pendiente_parametros', meta: null, cumpleMeta: null };

describe('MatrizAtIndicadoresService (cálculo puro)', () => {
  // El constructor solo guarda el cliente; los métodos puros no lo usan.
  const svc = new MatrizAtIndicadoresService({} as never);

  afterEach(() => jasmine.clock().uninstall());

  it('V1: indicadores del mes con parámetros', () => {
    const r = svc.calcularIndicadoresMes([at('mortal', 5), at('leve', 3), incidente()], param, K, 2026, 1);
    expect(r).toEqual(jasmine.objectContaining({
      numAt: 2, numAtMortales: 1, numIncidentes: 1, diasIncapacidad: 8, diasCargados: 0,
      numTrabajadores: 50, horasHombre: 9600, label: 'Ene',
    }));
    expect(r.frecuenciaAccidentalidad).toEqual(ok(4));
    expect(r.tasaAccidentalidad).toEqual(ok(4));
    expect(r.severidadAccidentalidad).toEqual(ok(16));
    expect(r.indiceFrecuencia).toEqual(ok(41.67));
    expect(r.indiceSeveridad).toEqual(ok(166.67));
    expect(r.indiceLesionIncapacitante).toEqual(ok(6.94));
  });

  it('V2: indicadores del mes sin parámetros quedan pendientes', () => {
    const r = svc.calcularIndicadoresMes([at('leve', 2)], null, K, 2026, 2);
    expect(r.numTrabajadores).toBeNull();
    expect(r.horasHombre).toBeNull();
    [r.frecuenciaAccidentalidad, r.severidadAccidentalidad, r.tasaAccidentalidad,
      r.indiceFrecuencia, r.indiceSeveridad, r.indiceLesionIncapacitante]
      .forEach((v) => expect(v).toEqual(pendiente));
  });

  it('V3: periodo recalcula desde conteos base', () => {
    const mes1 = svc.calcularIndicadoresMes([at('mortal', 5), at('leve', 3), incidente()], param, K, 2026, 1);
    const mes2 = svc.calcularIndicadoresMes([at('leve', 4)], param, K, 2026, 2);
    const r = svc.calcularPeriodo([mes1, mes2], 'Q1 2026', [1, 2, 3], K);
    expect(r).toEqual(jasmine.objectContaining({
      numAt: 3, numAtMortales: 1, numIncidentes: 1, diasIncapacidad: 12, diasCargados: 0,
      trabajadoresProm: 50, horasHombreTotal: 19200,
    }));
    expect(r.frecuenciaAccidentalidad.valor).toBe(6);
    expect(r.tasaAccidentalidad.valor).toBe(6);
    expect(r.severidadAccidentalidad.valor).toBe(24);
    expect(r.indiceFrecuencia.valor).toBe(31.25);
    expect(r.indiceSeveridad.valor).toBe(125);
    expect(r.indiceLesionIncapacitante.valor).toBe(3.91);
    expect(r.proporcionMortalidad.valor).toBe(33.33);
  });

  it('V4: triángulo de Bird y ratio', () => {
    const casos = [at('mortal'), at('grave'), at('grave'), at('leve'), at('leve'), at('leve'),
      incidente(), incidente(), incidente(), incidente()];
    expect(svc.calcularTriangulo(casos))
      .toEqual({ mortal: 1, grave: 2, leve: 3, casiAccidente: 4, ratio: '1 : 2 : 3 : 4' });
    expect(svc.calcularTriangulo([at('grave'), at('leve'), incidente()]))
      .toEqual({ mortal: 0, grave: 1, leve: 1, casiAccidente: 1, ratio: '0 : 1 : 1 : 1' });
  });

  it('V5: días sin accidentes y récord', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-04-01T00:00:00Z'));
    expect(svc.calcularDiasSinAccidentes(['2026-01-10', '2026-03-01']))
      .toEqual({ dias: 31, fechaUltimoAt: '2026-03-01', record: 50 });
  });

  it('V5: sin accidentes registrados devuelve nulos', () => {
    expect(svc.calcularDiasSinAccidentes([])).toEqual({ dias: null, fechaUltimoAt: null, record: null });
  });

  it('V6: cumplimiento de acciones', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-06-01T00:00:00Z'));
    const acciones = [
      { estado: 'cerrada', fecha_compromiso: '2026-05-01', fecha_cierre: '2026-04-20' },
      { estado: 'cerrada', fecha_compromiso: '2026-04-01', fecha_cierre: '2026-05-10' },
      { estado: 'pendiente', fecha_compromiso: '2026-05-01', fecha_cierre: null },
      { estado: 'en_progreso', fecha_compromiso: '2026-12-01', fecha_cierre: null },
      { estado: 'pendiente', fecha_compromiso: null, fecha_cierre: null },
    ];
    const r = svc.calcularCumplimiento([{ acciones } as unknown as MatrizAtCaso]);
    expect(r).toEqual({
      total: 5, cerradasATiempo: 1, cerradasTarde: 1, vencidas: 1, enProgreso: 1,
      pendientes: 1, pctCerradasATiempo: 50,
    });
  });
});
