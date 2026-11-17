import { CapSesion } from '../../../../core/models/capacitacion.model';
import { armarMesCalendario, DiaCalendario } from './calendario-mes.funcion';

const ses = (id: string, fecha: string): CapSesion =>
  ({ id, empresa_id: 'e', tema_id: 't', fecha, estado: 'programada' });

const plano = (m: DiaCalendario[][]): DiaCalendario[] => ([] as DiaCalendario[]).concat(...m);

describe('armarMesCalendario', () => {
  it('devuelve 6 semanas x 7 días', () => {
    const m = armarMesCalendario(2026, 10, [], '');
    expect(m.length).toBe(6);
    expect(m.every(s => s.length === 7)).toBeTrue();
  });

  it('el día 1 cae en la columna correcta (miércoles = 2)', () => {
    const m = armarMesCalendario(2026, 5, [], ''); // 1 jun 2026 = lunes
    expect(m[0][0].fecha).toBe('2026-06-01');
    const x = armarMesCalendario(2026, 9, [], ''); // 1 oct 2026 = jueves
    expect(x[0][3].fecha).toBe('2026-10-01');
    const w = armarMesCalendario(2025, 6, [], ''); // 1 jul 2025 = martes
    expect(w[0][1].fecha).toBe('2025-07-01');
    const mi = armarMesCalendario(2026, 0, [], ''); // 1 ene 2026 = jueves
    expect(mi[0][3].fecha).toBe('2026-01-01');
    const mier = armarMesCalendario(2025, 9, [], ''); // 1 oct 2025 = miércoles
    expect(mier[0][2].fecha).toBe('2025-10-01');
  });

  it('la sesión aparece solo en su celda y los demás días quedan vacíos', () => {
    const m = plano(armarMesCalendario(2026, 10, [ses('a', '2026-11-16')], ''));
    const con = m.filter(d => d.sesiones.length > 0);
    expect(con.length).toBe(1);
    expect(con[0].fecha).toBe('2026-11-16');
    expect(m.find(d => d.fecha === '2026-11-15')?.sesiones).toEqual([]);
  });

  it('marca delMes en arrastre y en el mes', () => {
    const m = plano(armarMesCalendario(2026, 10, [], '')); // nov 2026 empieza domingo
    expect(m[0].fecha).toBe('2026-10-26');
    expect(m[0].delMes).toBeFalse();
    expect(m.find(d => d.fecha === '2026-11-01')?.delMes).toBeTrue();
    expect(m[41].delMes).toBeFalse();
  });

  it('febrero 2026 (28 días) y mes que inicia domingo (offset 6)', () => {
    const feb = plano(armarMesCalendario(2026, 1, [], ''));
    expect(feb.filter(d => d.delMes).length).toBe(28);
    const nov = armarMesCalendario(2026, 10, [], '');
    expect(nov[0][6].fecha).toBe('2026-11-01');
  });

  it('varias sesiones el mismo día conservan el orden', () => {
    const m = plano(armarMesCalendario(2026, 10, [ses('a', '2026-11-05'), ses('b', '2026-11-05')], ''));
    expect(m.find(d => d.fecha === '2026-11-05')?.sesiones.map(s => s.id)).toEqual(['a', 'b']);
  });

  it('hoy solo en la fecha indicada; vacío ninguna', () => {
    const m = plano(armarMesCalendario(2026, 10, [], '2026-11-16'));
    expect(m.filter(d => d.hoy).map(d => d.fecha)).toEqual(['2026-11-16']);
    expect(plano(armarMesCalendario(2026, 10, [], '')).some(d => d.hoy)).toBeFalse();
  });
});
