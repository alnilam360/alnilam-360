import { Component, Input, OnInit, signal } from '@angular/core';
import { MatrizAtCasoService } from '../../../../core/services/matriz-at-caso.service';
import {
  MatrizAtCaso, FiltrosCaso, SedeLite, Gravedad, TipoEvento, EstadoCaso,
} from '../../../../core/models/matriz-at.model';

@Component({
  selector: 'app-matriz-casos',
  standalone: false,
  templateUrl: './matriz-casos.component.html',
})
export class MatrizCasosComponent implements OnInit {
  private _empresaId: string | null = null;
  @Input() set empresaId(id: string | null) { this._empresaId = id; if (this.iniciado) this.cargar(); }
  get empresaId() { return this._empresaId; }

  @Input() anio = new Date().getFullYear();
  @Input() filtroInicial: FiltrosCaso = {};

  readonly casos = signal<MatrizAtCaso[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly wizardOpen = signal(false);
  readonly casoEditar = signal<MatrizAtCaso | null>(null);
  readonly detalle = signal<MatrizAtCaso | null>(null);

  sedes: SedeLite[] = [];
  areas: string[] = [];
  parteFiltro: { ids: string[]; zona: string } | null = null;
  private iniciado = false;

  // Filtros UI
  f = {
    desde: '' as string,
    hasta: '' as string,
    sedeId: '' as string,
    areaProceso: '' as string,
    tipoEvento: '' as '' | TipoEvento,
    gravedad: '' as '' | Gravedad,
    estado: '' as '' | EstadoCaso,
  };

  constructor(public svc: MatrizAtCasoService) {}

  async ngOnInit(): Promise<void> {
    this.iniciado = true;
    this.f.desde = `${this.anio}-01-01`;
    this.f.hasta = `${this.anio}-12-31`;
    if (this.filtroInicial.areaProceso) this.f.areaProceso = this.filtroInicial.areaProceso;
    if (this.filtroInicial.parteCuerpoIds?.length) {
      this.parteFiltro = { ids: this.filtroInicial.parteCuerpoIds, zona: this.filtroInicial.parteCuerpoZona ?? 'parte del cuerpo' };
    }
    if (this._empresaId) {
      this.sedes = await this.svc.getSedes(this._empresaId);
    }
    await this.cargar();
  }

  private construirFiltros(): FiltrosCaso {
    const fi: FiltrosCaso = {};
    if (this.f.desde) fi.desde = this.f.desde;
    if (this.f.hasta) fi.hasta = this.f.hasta + 'T23:59:59';
    if (this.f.sedeId) fi.sedeId = this.f.sedeId;
    if (this.f.areaProceso) fi.areaProceso = this.f.areaProceso;
    if (this.f.tipoEvento) fi.tipoEvento = this.f.tipoEvento;
    if (this.f.gravedad) fi.gravedad = this.f.gravedad;
    if (this.f.estado) fi.estado = this.f.estado;
    if (this.parteFiltro) fi.parteCuerpoIds = this.parteFiltro.ids;
    return fi;
  }

  quitarParteFiltro(): void { this.parteFiltro = null; this.cargar(); }

  async cargar(): Promise<void> {
    if (!this._empresaId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const casos = await this.svc.listarCasos(this._empresaId, this.construirFiltros());
      this.casos.set(casos);
      this.areas = [...new Set(casos.map((c) => c.area_proceso).filter((a): a is string => !!a))];
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudieron cargar los casos.');
    } finally {
      this.loading.set(false);
    }
  }

  aplicarFiltros(): void { this.cargar(); }

  limpiarFiltros(): void {
    this.f = { desde: `${this.anio}-01-01`, hasta: `${this.anio}-12-31`, sedeId: '', areaProceso: '', tipoEvento: '', gravedad: '', estado: '' };
    this.parteFiltro = null;
    this.cargar();
  }

  abrirWizard(): void { this.casoEditar.set(null); this.wizardOpen.set(true); }
  editar(c: MatrizAtCaso): void { this.casoEditar.set(c); this.wizardOpen.set(true); }
  cerrarWizard(): void { this.wizardOpen.set(false); this.casoEditar.set(null); }
  onGuardado(): void { this.cerrarWizard(); this.cargar(); }
  verDetalle(c: MatrizAtCaso): void { this.detalle.set(c); }

  // Alertas de plazo por fila
  arlVencido(c: MatrizAtCaso): boolean { return this.svc.estadoReporteArl(c).vencido; }
  investigacionFueraPlazo(c: MatrizAtCaso): boolean { return this.svc.estadoInvestigacion(c) === 'fuera_de_plazo'; }

  etiquetaGravedad(c: MatrizAtCaso): string {
    return c.tipo_evento === 'incidente_casi_accidente' ? 'Incidente' : (c.clasificacion_gravedad ?? '—');
  }
  gravedadColor(c: MatrizAtCaso): string {
    if (c.tipo_evento === 'incidente_casi_accidente') return 'bg-cyan-600';
    switch (c.clasificacion_gravedad) {
      case 'mortal': return 'bg-red-500';
      case 'grave': return 'bg-orange-500';
      case 'leve': return 'bg-amber-400';
      default: return 'bg-dark-accent';
    }
  }
  estadoBadge(e: EstadoCaso): string {
    switch (e) {
      case 'cerrado': return 'bg-emerald-500/15 text-emerald-300';
      case 'en_investigacion': return 'bg-brand-primary/15 text-brand-primary';
      default: return 'bg-dark-accent text-dark-text';
    }
  }
}
