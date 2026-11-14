import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { PresupuestoService } from '../../../../core/services/presupuesto.service';
import { Empresa } from '../../../../core/models/models';
import { PresupuestoCentroService } from '../../../../core/services/presupuesto-centro.service';
import { PresupuestoPeriodo, PresupuestoResumen, ResumenCentro, TendenciaMes } from '../../../../core/models/presupuesto.model';
import {
  claseVariacion, estadoAvance, formatearCOP, formatearMeta, formatearVariacionPct, porcentajeAvance, proyeccionSaldo, variacion, variacionPct,
} from '../../funciones/resumen.funcion';

@Component({
  selector: 'app-presupuesto-resumen',
  standalone: false,
  templateUrl: './resumen.component.html',
  styleUrls: ['./resumen.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ResumenComponent implements OnInit {
  private service = inject(PresupuestoService);
  private centroService = inject(PresupuestoCentroService);

  readonly cop = formatearCOP;
  readonly avance = porcentajeAvance;
  readonly meta = formatearMeta;
  readonly variacion = variacion;
  readonly variacionPct = variacionPct;
  readonly pct = formatearVariacionPct;
  readonly claseVar = claseVariacion;

  private static readonly COLOR_AVANCE = { bajo: 'bg-emerald-500', cerca: 'bg-amber-500', sobre: 'bg-red-500' };

  colorAvance(ejecutado: number, presupuestado: number): string {
    return ResumenComponent.COLOR_AVANCE[estadoAvance(ejecutado, presupuestado)];
  }

  sobregasto(ejecutado: number, presupuestado: number): boolean {
    return estadoAvance(ejecutado, presupuestado) === 'sobre';
  }

  cargando = signal(true);
  error = signal<string | null>(null);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  periodos = signal<PresupuestoPeriodo[]>([]);
  periodoId = signal('');
  resumen = signal<PresupuestoResumen | null>(null);
  centros = signal<ResumenCentro[]>([]);
  tendencia = signal<TendenciaMes[]>([]);
  proyeccion = computed(() => proyeccionSaldo(this.tendencia().map(t => t.saldo_final)));
  // Altura relativa al máximo (valor absoluto) de la serie, incluida la proyección.
  barras = computed(() => {
    const p = this.proyeccion();
    const max = Math.max(1, ...this.tendencia().map(t => Math.abs(t.saldo_final)), Math.abs(p ?? 0));
    const h = (v: number) => Math.max(2, (Math.abs(v) / max) * 100);
    return {
      meses: this.tendencia().map(t => ({ mes: t.mes, valor: t.saldo_final, alto: h(t.saldo_final) })),
      proy: p === null ? null : { valor: p, alto: h(p) },
    };
  });
  readonly trackCentro = (i: number, c: ResumenCentro) => c.centro_id ?? `sin-centro-${i}`;

  async ngOnInit(): Promise<void> {
    try {
      const ctx = await this.service.resolverContextoEmpresa();
      this.esAdmin.set(ctx.esAdmin);
      this.empresas.set(ctx.empresas);
      await this.cargarEmpresa(ctx.empresaId);
    } catch (e) {
      this.fallar(e);
    }
  }

  async cargarEmpresa(id: string): Promise<void> {
    this.empresaId.set(id);
    this.cargando.set(true);
    this.error.set(null);
    void this.cargarTendencia(id);
    try {
      const lista = id ? await this.service.listarPeriodos(id) : [];
      this.periodos.set(lista);
      await this.cargarPeriodo(lista[0]?.id ?? '');
    } catch (e) {
      this.fallar(e);
    }
  }

  async cargarPeriodo(id: string): Promise<void> {
    this.periodoId.set(id);
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.resumen.set(id ? await this.service.getResumen(id) : null);
      await this.cargarCentros(id);
      this.cargando.set(false);
    } catch (e) {
      this.fallar(e);
    }
  }

  // La sección por centro es secundaria: si falla queda vacía sin romper el resumen.
  private async cargarCentros(periodoId: string): Promise<void> {
    try {
      this.centros.set(periodoId ? await this.centroService.getResumenCentros(periodoId) : []);
    } catch {
      this.centros.set([]);
    }
  }

  // Secundaria: si falla queda vacía sin romper el resumen.
  private async cargarTendencia(empresaId: string): Promise<void> {
    try {
      this.tendencia.set(empresaId ? await this.service.getTendencia(empresaId, 6) : []);
    } catch {
      this.tendencia.set([]);
    }
  }

  private fallar(e: unknown): void {
    this.resumen.set(null);
    this.error.set((e as { message?: string })?.message ?? 'No se pudo cargar el resumen');
    this.cargando.set(false);
  }
}
