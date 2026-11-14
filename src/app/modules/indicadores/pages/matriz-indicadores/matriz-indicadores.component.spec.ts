import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatrizIndicadoresComponent } from './matriz-indicadores.component';
import { TenantService } from '../../../../core/services/tenant.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { MatrizIndicadoresService } from '../../../../core/services/matriz-indicadores.service';
import { FilaMatrizIndicador, TipoIndicadorMatriz } from '../../../../core/models/matriz-indicadores.model';

const fila = (resultado: number, meta: number) => ({ resultado, meta }) as FilaMatrizIndicador;

describe('MatrizIndicadoresComponent (métodos puros)', () => {
  let comp: MatrizIndicadoresComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MatrizIndicadoresComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: TenantService, useValue: {} as any },
        { provide: SedesService, useValue: {} as any },
        { provide: MatrizIndicadoresService, useValue: {} as any },
        { provide: Router, useValue: {} as any }
      ]
    });
    // Sin detectChanges: no corre ngOnInit ni el template.
    comp = TestBed.createComponent(MatrizIndicadoresComponent).componentInstance;
  });

  describe('getTipoBadgeConfig', () => {
    it('AT usa pi-bolt', () => {
      const c = comp.getTipoBadgeConfig('Accidente de Trabajo (AT)');
      expect(c.icon).toBe('pi-bolt');
      expect(c.label).toBe('Accidente de Trabajo (AT)');
    });
    it('EL usa pi-heart', () => {
      expect(comp.getTipoBadgeConfig('Enfermedad Laboral (EL)').icon).toBe('pi-heart');
    });
    it('Ausentismo usa pi-calendar', () => {
      expect(comp.getTipoBadgeConfig('Ausentismo').icon).toBe('pi-calendar');
    });
    it('E-P-R usa pi-verified', () => {
      const tipo: TipoIndicadorMatriz = 'Estructura - proceso - Resultado (E-P-R) del SG-SST';
      const c = comp.getTipoBadgeConfig(tipo);
      expect(c.icon).toBe('pi-verified');
      expect(c.label).toBe('E-P-R del SG-SST');
    });
    it('normaliza variantes de texto', () => {
      expect(comp.getTipoBadgeConfig('accidente').icon).toBe('pi-bolt');
      expect(comp.getTipoBadgeConfig('enfermadad laboral').icon).toBe('pi-heart');
      expect(comp.getTipoBadgeConfig('AUSENTISMO').icon).toBe('pi-calendar');
      expect(comp.getTipoBadgeConfig('estructura').icon).toBe('pi-verified');
    });
  });

  describe('getTipoColorClass', () => {
    it('mapea cada tipo', () => {
      expect(comp.getTipoColorClass('Accidente de Trabajo (AT)')).toBe('tipo-at');
      expect(comp.getTipoColorClass('Enfermedad Laboral (EL)')).toBe('tipo-el');
      expect(comp.getTipoColorClass('Ausentismo')).toBe('tipo-aus');
      expect(comp.getTipoColorClass('Estructura - proceso - Resultado (E-P-R) del SG-SST')).toBe('tipo-epr');
    });
    it('valor vacío o desconocido cae en AT (default de normalizarTipoIndicador)', () => {
      expect(comp.getTipoColorClass('')).toBe('tipo-at');
      expect(comp.getTipoColorClass('otro')).toBe('tipo-at');
    });
  });

  describe('getDeltaResultado', () => {
    it('favorable: redondea a 1 decimal con signo +', () => {
      const d = comp.getDeltaResultado(fila(95.2, 90));
      expect(d.diferencia).toBe(5.2);
      expect(d.texto).toBe('+5.2%');
      expect(d.esFavorable).toBeTrue();
      expect(d.icono).toBe('pi-arrow-up');
      expect(d.claseTexto).toBe('text-emerald-400');
    });
    it('desfavorable: texto negativo y flecha abajo', () => {
      const d = comp.getDeltaResultado(fila(80, 90));
      expect(d.diferencia).toBe(-10);
      expect(d.texto).toBe('-10%');
      expect(d.esFavorable).toBeFalse();
      expect(d.icono).toBe('pi-arrow-down');
      expect(d.claseTexto).toBe('text-rose-400');
    });
    it('exacto: diff 0, favorable, sin signo', () => {
      const d = comp.getDeltaResultado(fila(90, 90));
      expect(d.diferencia).toBe(0);
      expect(d.esFavorable).toBeTrue();
      expect(d.texto).toBe('0%');
      expect(d.icono).toBe('pi-arrow-up');
    });
    it('redondeo toFixed(1) de ruido flotante', () => {
      expect(comp.getDeltaResultado(fila(0.3, 0.1)).diferencia).toBe(0.2);
      expect(comp.getDeltaResultado(fila(90.04, 90)).texto).toBe('0%');
    });
  });

  describe('getBarraProgreso', () => {
    it('meta <= 0: clamp de resultado a [0,100]', () => {
      expect(comp.getBarraProgreso(fila(150, 0))).toBe(100);
      expect(comp.getBarraProgreso(fila(-10, 0))).toBe(0);
      expect(comp.getBarraProgreso(fila(42.5, -1))).toBe(42.5);
    });
    it('meta > 0: round(resultado/meta*100)', () => {
      expect(comp.getBarraProgreso(fila(50, 100))).toBe(50);
      expect(comp.getBarraProgreso(fila(1, 3))).toBe(33);
      expect(comp.getBarraProgreso(fila(2, 3))).toBe(67);
    });
    it('cap 100 y piso 0', () => {
      expect(comp.getBarraProgreso(fila(120, 100))).toBe(100);
      expect(comp.getBarraProgreso(fila(-5, 100))).toBe(0);
      expect(comp.getBarraProgreso(fila(0, 100))).toBe(0);
    });
  });

  describe('getInicialesResponsable', () => {
    it('vacío o espacios devuelve R', () => {
      expect(comp.getInicialesResponsable('')).toBe('R');
      expect(comp.getInicialesResponsable('   ')).toBe('R');
    });
    it('una palabra: 2 primeras letras en mayúscula', () => {
      expect(comp.getInicialesResponsable('ana')).toBe('AN');
      expect(comp.getInicialesResponsable('x')).toBe('X');
    });
    it('varias palabras: iniciales de las dos primeras', () => {
      expect(comp.getInicialesResponsable('juan perez')).toBe('JP');
      expect(comp.getInicialesResponsable('  juan   perez gomez ')).toBe('JP');
    });
  });

  describe('getFrecuenciaBadgeConfig', () => {
    it('Mensual usa clase sky y conserva etiqueta', () => {
      const c = comp.getFrecuenciaBadgeConfig('Mensual');
      expect(c.icono).toBe('pi-calendar');
      expect(c.clase).toContain('text-sky-400');
      expect(c.etiqueta).toBe('Mensual');
    });
    it('cualquier otra frecuencia usa clase indigo y conserva etiqueta', () => {
      ['Trimestral', 'Anual', 'Semestral', ''].forEach(f => {
        const c = comp.getFrecuenciaBadgeConfig(f);
        expect(c.icono).toBe('pi-calendar');
        expect(c.clase).toContain('text-indigo-400');
        expect(c.etiqueta).toBe(f);
      });
    });
  });
});
