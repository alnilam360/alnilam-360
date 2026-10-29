import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { MatrizLegalService } from '../../../../core/services/matriz-legal.service';
import { Empresa } from '../../../../core/models/models';
import {
  ConteoComponente,
  ConteoUpsert,
  Dominio,
  DOMINIO_LABEL,
  MatrizLegalResumen,
  ResumenDominio,
  construirResumenDominio,
  conteoVacio,
  periodoActual,
} from '../../../../core/models/matriz-legal.model';

type CampoConteo = 'cumple' | 'enProceso' | 'noCumple';

/**
 * Matriz Legal — Evaluación de Cumplimiento.
 * Llenado ágil: el usuario captura los conteos por componente/estado; la tabla
 * y la gráfica (barras agrupadas, estilo del Excel) se recalculan en vivo.
 */
@Component({
  selector: 'app-matriz-legal',
  standalone: false,
  templateUrl: './matriz-legal.component.html',
  styleUrls: ['./matriz-legal.component.scss'],
})
export class MatrizLegalComponent implements OnInit {
  private tenant = inject(TenantService);
  private service = inject(MatrizLegalService);

  readonly DOMINIO_LABEL = DOMINIO_LABEL;

  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);
  error = signal<string | null>(null);
  esAdmin = signal<boolean>(false);

  empresas = signal<Empresa[]>([]);
  empresaId = signal<string>('');
  empresaNombre = signal<string>('');

  periodo = signal<number>(periodoActual());
  periodos = signal<number[]>([periodoActual()]);

  // Estado editable: conteos por dominio.
  filasSgSst = signal<ConteoComponente[]>([]);
  filasAmbiental = signal<ConteoComponente[]>([]);

  // Resúmenes derivados (totales + %), recalculados en vivo al editar.
  resumenSgSst = computed<ResumenDominio>(() =>
    construirResumenDominio('SG_SST', this.filasSgSst()));
  resumenAmbiental = computed<ResumenDominio>(() =>
    construirResumenDominio('AMBIENTAL', this.filasAmbiental()));

  // Bloques tipados para iterar en el template (evita inferencia `string`).
  bloques = computed<{ dom: Dominio; filas: ConteoComponente[]; resumen: ResumenDominio }[]>(() => [
    { dom: 'SG_SST', filas: this.filasSgSst(), resumen: this.resumenSgSst() },
    { dom: 'AMBIENTAL', filas: this.filasAmbiental(), resumen: this.resumenAmbiental() },
  ]);

  // Datos de la gráfica "NIVEL DE CUMPLIMIENTO LEGAL SST" (solo SG-SST, como el Excel).
  chartMax = computed<number>(() => {
    let max = 1;
    for (const c of this.resumenSgSst().componentes) {
      max = Math.max(max, c.cumple, c.enProceso, c.noCumple);
    }
    return max;
  });

  async ngOnInit(): Promise<void> {
    await this.inicializarTenant();
    await this.cargar();
  }

  async inicializarTenant(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    const lista = await this.tenant.listarEmpresasDisponibles();
    this.empresas.set(lista);
    let empId = (await this.tenant.getEmpresaTenantId()) || '';
    if (!empId && lista.length > 0) empId = lista[0].id || '';
    this.empresaId.set(empId);
    this.empresaNombre.set(lista.find(e => e.id === empId)?.nombre ?? '');
  }

  async onEmpresaChange(id: string): Promise<void> {
    this.empresaId.set(id);
    this.empresaNombre.set(this.empresas().find(e => e.id === id)?.nombre ?? '');
    await this.cargar();
  }

  async onPeriodoChange(anio: number): Promise<void> {
    this.periodo.set(Number(anio));
    await this.cargar();
  }

  async cargar(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) { this.cargando.set(false); return; }
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [componentes, conteos, periodos] = await Promise.all([
        this.service.getComponentes(empId),
        this.service.getConteos(empId, this.periodo()),
        this.service.getPeriodos(empId),
      ]);
      this.periodos.set(periodos);

      const porId = new Map(conteos.map(c => [c.componente_id, c]));
      const aFila = (comp: typeof componentes[number]): ConteoComponente => {
        const base = conteoVacio(comp);
        const row = porId.get(comp.id);
        if (row) {
          base.cumple = row.cumple;
          base.enProceso = row.en_proceso;
          base.noCumple = row.no_cumple;
          base.total = row.cumple + row.en_proceso + row.no_cumple;
        }
        return base;
      };

      this.filasSgSst.set(
        componentes.filter(c => c.dominio === 'SG_SST').map(aFila)
          .sort((a, b) => a.orden - b.orden));
      this.filasAmbiental.set(
        componentes.filter(c => c.dominio === 'AMBIENTAL').map(aFila)
          .sort((a, b) => a.orden - b.orden));
    } catch (e) {
      console.error('Error cargando matriz legal:', e);
      this.error.set(this.mensajeError(e, 'No se pudo cargar la matriz.'));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Convierte un error de Supabase/PostgREST en un mensaje legible y accionable. */
  private mensajeError(e: unknown, prefijo: string): string {
    const err = e as { message?: string; code?: string; details?: string; hint?: string };
    const code = err?.code ?? '';
    // Tabla o función inexistente ⇒ migración pendiente de aplicar.
    if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202' ||
        /relation .* does not exist|could not find the (table|function)/i.test(err?.message ?? '')) {
      return `${prefijo} Falta aplicar la migración en Supabase ` +
        `(2026_10_28_01_matriz_legal_evaluacion_rework.sql).`;
    }
    const detalle = err?.message || err?.details || 'Error desconocido.';
    return `${prefijo} ${detalle}`;
  }

  /** Actualiza un conteo (entero >= 0) y dispara el recálculo reactivo. */
  setValor(dominio: Dominio, componenteId: string, campo: CampoConteo, valor: unknown): void {
    const n = Math.max(0, Math.trunc(Number(valor) || 0));
    const sig = dominio === 'SG_SST' ? this.filasSgSst : this.filasAmbiental;
    sig.update(filas => filas.map(f =>
      f.componenteId === componenteId
        ? { ...f, [campo]: n, total: this.recalcTotal(f, campo, n) }
        : f));
  }

  private recalcTotal(f: ConteoComponente, campo: CampoConteo, n: number): number {
    const cumple = campo === 'cumple' ? n : f.cumple;
    const enProceso = campo === 'enProceso' ? n : f.enProceso;
    const noCumple = campo === 'noCumple' ? n : f.noCumple;
    return cumple + enProceso + noCumple;
  }

  pct(valor: number): string {
    return `${(valor * 100).toFixed(1)}%`;
  }

  trackId(_: number, f: ConteoComponente): string {
    return f.componenteId;
  }

  sumCumple(r: ResumenDominio): number {
    return r.componentes.reduce((s, c) => s + c.cumple, 0);
  }
  sumEnProceso(r: ResumenDominio): number {
    return r.componentes.reduce((s, c) => s + c.enProceso, 0);
  }
  sumNoCumple(r: ResumenDominio): number {
    return r.componentes.reduce((s, c) => s + c.noCumple, 0);
  }

  alturaBarra(valor: number): string {
    return `${(valor / this.chartMax()) * 100}%`;
  }

  async guardar(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const filas: ConteoUpsert[] = [...this.filasSgSst(), ...this.filasAmbiental()].map(f => ({
        componente_id: f.componenteId,
        periodo: this.periodo(),
        cumple: f.cumple,
        en_proceso: f.enProceso,
        no_cumple: f.noCumple,
      }));
      await this.service.guardarConteos(empId, this.periodo(), filas);
      await this.cargar();
    } catch (e) {
      console.error('Error guardando conteos:', e);
      this.error.set(this.mensajeError(e, 'No se pudo guardar.'));
    } finally {
      this.guardando.set(false);
    }
  }

  async exportar(): Promise<void> {
    const resumen: MatrizLegalResumen = {
      periodo: this.periodo(),
      sgSst: this.resumenSgSst(),
      ambiental: this.resumenAmbiental(),
    };
    try {
      await this.service.exportarMatrizExcel(resumen, this.empresaNombre());
    } catch (e) {
      console.error('Error exportando a Excel:', e);
      this.error.set('No se pudo exportar el archivo.');
    }
  }
}
