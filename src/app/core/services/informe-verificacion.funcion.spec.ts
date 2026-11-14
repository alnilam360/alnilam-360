import { filaHallazgo, filaItem, nombreArchivoInforme, etiquetaResultado } from './informe-verificacion.funcion';
import { Hallazgo, InformeVerificacion, VerificacionRespuesta } from '../models/verificacion.model';

describe('informe-verificacion.funcion', () => {
  it('etiqueta resultados', () => {
    expect(etiquetaResultado('no_cumple')).toBe('No cumple');
    expect(etiquetaResultado(null)).toBe('Sin evaluar');
  });

  it('fila de ítem marca evidencia', () => {
    const r = { orden: 2, item_texto: 'X', resultado: 'cumple', observacion: null, evidencia_url: 'p' } as VerificacionRespuesta;
    expect(filaItem(r)).toEqual([2, 'X', 'Cumple', '', 'Sí']);
  });

  it('fila de hallazgo resuelve estándar y eficacia', () => {
    const h = {
      descripcion: 'D', clasificacion: null, severidad: 'alta', estandar_id: 'e1', responsable_texto: 'Ana',
      fecha_compromiso: '2026-01-05T12:00:00Z', jerarquia: 'fuente', estado: 'cerrado', fecha_cierre: null,
      eficacia_verificada: true, fecha_verificacion: '2026-02-01T12:00:00Z',
    } as Hallazgo;
    const f = filaHallazgo(h, { e1: '1.1.1' });
    expect(f[3]).toBe('1.1.1');
    expect(f[4]).toBe('Ana · 2026-01-05 · fuente');
    expect(f[7]).toBe('Sí (2026-02-01)');
  });

  it('nombre de archivo sanea el título', () => {
    const i = { verificacion: { titulo: ' Insp. / Bodega #1 ' } } as InformeVerificacion;
    expect(nombreArchivoInforme(i, '2026-11-14')).toBe('Informe_Insp_Bodega_1_2026-11-14.xlsx');
  });
});
