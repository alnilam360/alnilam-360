import { AlertaVencimientoService } from './alerta-vencimiento.service';

/** Fecha local YYYY-MM-DD a N días de hoy (evita flakiness por literales fijos). */
function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

describe('AlertaVencimientoService', () => {
  const service = new AlertaVencimientoService();

  describe('sin fecha', () => {
    [null, undefined, ''].forEach(v => {
      it(`devuelve sin_fecha para ${JSON.stringify(v)}`, () => {
        const r = service.calcularAlerta(v);
        expect(r.estado).toBe('sin_fecha');
        expect(r.icono).toBe('pi-question-circle');
        expect(r.diasRestantes).toBeNull();
      });
    });

    it('devuelve sin_fecha con icono de error para string inválido', () => {
      const r = service.calcularAlerta('no-es-fecha');
      expect(r.estado).toBe('sin_fecha');
      expect(r.icono).toBe('pi-exclamation-circle');
      expect(r.diasRestantes).toBeNull();
      expect(r.label).toBe('Fecha no válida');
    });
  });

  describe('vencido', () => {
    it('usa singular cuando venció ayer', () => {
      const r = service.calcularAlerta(enDias(-1));
      expect(r.estado).toBe('vencido');
      expect(r.icono).toBe('pi-exclamation-circle');
      expect(r.diasRestantes).toBe(-1);
      expect(r.label).toBe('Vencido hace 1 día');
    });

    it('usa plural cuando venció hace varios días', () => {
      const r = service.calcularAlerta(enDias(-5));
      expect(r.estado).toBe('vencido');
      expect(r.diasRestantes).toBe(-5);
      expect(r.label).toBe('Vencido hace 5 días');
    });
  });

  describe('por vencer', () => {
    it('vence hoy', () => {
      const r = service.calcularAlerta(enDias(0));
      expect(r.estado).toBe('por_vencer');
      expect(r.icono).toBe('pi-clock');
      expect(r.diasRestantes).toBe(0);
      expect(r.label).toBe('Vence hoy');
    });

    it('vence mañana', () => {
      const r = service.calcularAlerta(enDias(1));
      expect(r.estado).toBe('por_vencer');
      expect(r.diasRestantes).toBe(1);
      expect(r.label).toBe('Vence mañana');
    });

    it('vence en N días dentro del umbral por defecto (frontera 30)', () => {
      const r = service.calcularAlerta(enDias(30));
      expect(r.estado).toBe('por_vencer');
      expect(r.icono).toBe('pi-clock');
      expect(r.diasRestantes).toBe(30);
      expect(r.label).toBe('Por vencer en 30 días');
    });

    it('vence en 2 días usa plural', () => {
      expect(service.calcularAlerta(enDias(2)).label).toBe('Por vencer en 2 días');
    });
  });

  describe('vigente', () => {
    it('más allá del umbral por defecto (31 días)', () => {
      const r = service.calcularAlerta(enDias(31));
      expect(r.estado).toBe('vigente');
      expect(r.icono).toBe('pi-check-circle');
      expect(r.diasRestantes).toBe(31);
      expect(r.label).toBe('Vigente (31 días restantes)');
    });
  });

  describe('umbral personalizado', () => {
    it('diff == umbral es por_vencer', () => {
      expect(service.calcularAlerta(enDias(7), 7).estado).toBe('por_vencer');
    });

    it('diff == umbral + 1 es vigente', () => {
      expect(service.calcularAlerta(enDias(8), 7).estado).toBe('vigente');
    });
  });

  describe('entrada como Date', () => {
    it('acepta objeto Date (mañana a mediodía)', () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      const r = service.calcularAlerta(d);
      expect(r.estado).toBe('por_vencer');
      expect(r.diasRestantes).toBe(1);
    });

    it('acepta Date vencido (hace 3 días)', () => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      d.setHours(12, 0, 0, 0);
      const r = service.calcularAlerta(d);
      expect(r.estado).toBe('vencido');
      expect(r.diasRestantes).toBe(-3);
    });

    it('Date inválido devuelve sin_fecha', () => {
      expect(service.calcularAlerta(new Date('x')).estado).toBe('sin_fecha');
    });
  });
});
