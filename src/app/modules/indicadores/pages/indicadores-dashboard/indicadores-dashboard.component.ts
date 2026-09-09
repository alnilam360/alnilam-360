import { Component, EventEmitter, Input, OnInit, Output, computed, effect, signal } from '@angular/core';
import { MatrizAtIndicadoresService } from '../../../../core/services/matriz-at-indicadores.service';
import { TenantService } from '../../../../core/services/tenant.service';
import { MESES_LABELS, ValorIndicador, ConteoEtiqueta } from '../../../../core/models/matriz-at.model';

type Periodo = 'mes' | 'trim' | 'anio';

interface ResumenKpi {
  periodoLabel: string;
  frecuencia: ValorIndicador;
  severidad: ValorIndicador;
  tasa: ValorIndicador;
  numAt: number;
  numIncidentes: number;
}

@Component({
  selector: 'app-indicadores-dashboard',
  standalone: false,
  templateUrl: './indicadores-dashboard.component.html',
  styleUrls: ['./indicadores-dashboard.component.scss'],
})
export class IndicadoresDashboardComponent implements OnInit {
  private _empresaId: string | null = null;
  @Input() set empresaId(id: string | null) {
    this._empresaId = id;
    this.recargar();
  }
  get empresaId() { return this._empresaId; }

  private _anio = new Date().getFullYear();
  @Input() set anio(a: number) {
    this._anio = a;
    this.recargar();
  }
  get anio() { return this._anio; }

  @Input() empresaNombre = '';
  readonly hoy = new Date();

  /** Drill-down hacia la Vista 1 (Matriz): por área o por parte del cuerpo. */
  @Output() drill = new EventEmitter<
    { tipo: 'area'; value: string } | { tipo: 'parte'; ids: string[]; zona: string }
  >();

  readonly periodo = signal<Periodo>('mes');
  readonly mesSel = signal<number>(new Date().getMonth() + 1);
  readonly trimSel = signal<number>(Math.floor(new Date().getMonth() / 3));
  readonly esGerencia = signal<boolean>(false);
  readonly paretoDim = signal<'agente' | 'mecanismo'>('agente');

  readonly meses = MESES_LABELS;
  readonly trimestres = ['Q1', 'Q2', 'Q3', 'Q4'];

  /** KPI del período seleccionado (recálculo desde conteos base en el servicio). */
  readonly resumen = computed<ResumenKpi>(() => {
    const p = this.periodo();
    if (p === 'mes') {
      const m = this.srv.indicadoresMensuales()[this.mesSel() - 1];
      return { periodoLabel: `${m.label} ${this.anio}`, frecuencia: m.frecuenciaAccidentalidad, severidad: m.severidadAccidentalidad, tasa: m.tasaAccidentalidad, numAt: m.numAt, numIncidentes: m.numIncidentes };
    }
    if (p === 'trim') {
      const t = this.srv.indicadoresTrimestrales()[this.trimSel()];
      return { periodoLabel: t.periodo, frecuencia: t.frecuenciaAccidentalidad, severidad: t.severidadAccidentalidad, tasa: t.tasaAccidentalidad, numAt: t.numAt, numIncidentes: t.numIncidentes };
    }
    const y = this.srv.indicadorAnual();
    return { periodoLabel: y.periodo, frecuencia: y.frecuenciaAccidentalidad, severidad: y.severidadAccidentalidad, tasa: y.tasaAccidentalidad, numAt: y.numAt, numIncidentes: y.numIncidentes };
  });

  readonly paretoConteos = computed<ConteoEtiqueta[]>(() =>
    this.paretoDim() === 'agente' ? this.srv.agrupaciones().porAgente : this.srv.agrupaciones().porMecanismo);

  readonly trendData = computed(() => ({
    labels: this.meses,
    series: [
      { label: 'Frecuencia', color: '#3b82f6', valores: this.srv.serieFrecuencia().puntos },
      { label: 'Severidad', color: '#f97316', valores: this.srv.serieSeveridad().puntos },
    ],
  }));

  constructor(public srv: MatrizAtIndicadoresService, private tenant: TenantService) {
    // El período local controla también los agregados del servicio (Bird/Pareto/área/cuerpo).
    effect(() => this.srv.setPeriodo(this.periodo(), this.mesSel(), this.trimSel()));
  }

  onHeatmap(ev: { zona: string; count: number; ids: string[] }): void {
    if (ev.count > 0) this.drill.emit({ tipo: 'parte', ids: ev.ids, zona: ev.zona });
  }

  async ngOnInit(): Promise<void> {
    const perfil = await this.tenant.getPerfilSeguro();
    const rol = (perfil?.rol ?? '').toLowerCase();
    this.esGerencia.set(rol.includes('geren') || rol.includes('direc'));
  }

  private recargar(): void {
    if (this._empresaId) this.srv.cargar(this._empresaId, this._anio);
  }

  imprimir(): void {
    window.print();
  }
}
