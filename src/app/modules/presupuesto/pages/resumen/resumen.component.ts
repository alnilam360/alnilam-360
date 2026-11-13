import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { PresupuestoService } from '../../../../core/services/presupuesto.service';
import { Empresa } from '../../../../core/models/models';
import { PresupuestoCentroService } from '../../../../core/services/presupuesto-centro.service';
import { PresupuestoPeriodo, PresupuestoResumen, ResumenCentro } from '../../../../core/models/presupuesto.model';
import {
  claseVariacion, estadoAvance, formatearCOP, formatearMeta, formatearVariacionPct, porcentajeAvance, variacion, variacionPct,
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

  private fallar(e: unknown): void {
    this.resumen.set(null);
    this.error.set((e as { message?: string })?.message ?? 'No se pudo cargar el resumen');
    this.cargando.set(false);
  }
}
