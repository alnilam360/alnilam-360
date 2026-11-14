import { Hallazgo, ResultadoItem, VerificacionRespuesta } from '../../../core/models/verificacion.model';
import { derivarHallazgos, porcentajeCumplimiento, puedeCerrar } from './ejecucion.funcion';

const rs = (...v: (ResultadoItem | null)[]) => v.map(resultado => ({ resultado }));
const resp = (id: string, resultado: ResultadoItem | null): VerificacionRespuesta => ({
  id, verificacion_id: 'v', orden: 1, item_texto: 'item ' + id, plantilla_item_id: null,
  resultado, observacion: null, evidencia_url: null,
});

describe('ejecucion.funcion', () => {
  it('todo no_aplica: % null y puede cerrar', () => {
    const r = rs('no_aplica', 'no_aplica');
    expect(porcentajeCumplimiento(r)).toBeNull();
    expect(puedeCerrar(r)).toBeTrue();
  });

  it('8 cumple, 2 no_cumple, 5 no_aplica = 80', () => {
    const r = rs(...Array(8).fill('cumple'), ...Array(2).fill('no_cumple'), ...Array(5).fill('no_aplica'));
    expect(porcentajeCumplimiento(r)).toBe(80);
  });

  it('redondea a 2 decimales', () => {
    expect(porcentajeCumplimiento(rs('cumple', 'cumple', 'no_cumple'))).toBe(66.67);
  });

  it('una respuesta null impide cerrar; vacío también', () => {
    expect(puedeCerrar(rs('cumple', null))).toBeFalse();
    expect(puedeCerrar([])).toBeFalse();
  });

  it('derivar no duplica hallazgos existentes', () => {
    const h = { respuesta_id: 'a' } as Hallazgo;
    const out = derivarHallazgos([resp('a', 'no_cumple'), resp('b', 'no_cumple'), resp('c', 'cumple')], [h]);
    expect(out).toEqual([{ respuesta_id: 'b', item_texto: 'item b' }]);
  });
});
