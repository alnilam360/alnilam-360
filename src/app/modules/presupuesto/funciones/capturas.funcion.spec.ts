import {
  fechaAInput, fechaAISO, netoNomina, saldoPorPagar, sumar, totalDeducciones, totalDevengado,
} from './capturas.funcion';

const base = {
  dev_basico: 0, dev_auxilio_transporte: 0, dev_auxilio_comunicacion: 0, dev_rodamiento: 0, dev_bono_adicional: 0,
  ded_salud: 0, ded_pension: 0, ded_otras: 0,
};

describe('capturas.funcion', () => {
  it('neto normal sin deducciones', () => {
    const n = { ...base, dev_basico: 1000000, dev_auxilio_transporte: 200000, dev_bono_adicional: 50000 };
    expect(totalDevengado(n)).toBe(1250000);
    expect(netoNomina(n)).toBe(1250000);
  });

  it('neto con deducciones', () => {
    const n = { ...base, dev_basico: 1000000, ded_salud: 40000, ded_pension: 40000, ded_otras: 10000 };
    expect(totalDeducciones(n)).toBe(90000);
    expect(netoNomina(n)).toBe(910000);
  });

  it('neto en cero', () => {
    expect(netoNomina(base)).toBe(0);
  });

  it('saldoPorPagar = por_pagar - ejecutado', () => {
    expect(saldoPorPagar({ por_pagar: 500, ejecutado: 200 })).toBe(300);
  });

  it('fechas: mediodía UTC y vuelta a input', () => {
    expect(fechaAISO('2026-03-05')).toBe('2026-03-05T12:00:00Z');
    expect(fechaAISO('')).toBeNull();
    expect(fechaAInput('2026-03-05T12:00:00Z')).toBe('2026-03-05');
    expect(fechaAInput(null)).toBe('');
  });

  it('sumar', () => {
    expect(sumar([{ v: 1 }, { v: 2 }], i => i.v)).toBe(3);
  });
});
