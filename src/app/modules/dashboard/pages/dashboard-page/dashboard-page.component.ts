import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService, AuthState } from '../../../../core/services/auth.service';
import { TenantService } from '../../../../core/services/tenant.service';
import { ResEvaluacionesService } from '../../../../core/services/res-evaluaciones.service';
import { PlanAnualService } from '../../../../core/services/plan-anual.service';
import { MatrizIndicadoresService } from '../../../../core/services/matriz-indicadores.service';
import {
  ProximaActividad,
  CicloCumplimiento,
  arcosDonut,
  cumplimientoPorCiclo,
  estadoActividades,
  estadoCumplimiento0312,
  proximasDesdeActividades
} from '../../funciones/dashboard.funcion';
import {
  COLOR_CICLO,
  DASH_ALERTS_MOCK,
  INDICADOR_PLAN_BASE,
  KEY_INDICATORS_MOCK,
  KPI_0312_BASE,
  KPI_INDICADORES_BASE,
  KPI_MOCK,
  KPI_PLAN_BASE,
  KeyIndicator,
  KpiCard,
  PHVA_PHASES,
  QUICK_ACCESS_ACTIONS
} from './dashboard.mock';

const CIRCUNFERENCIA_DONUT = 2 * Math.PI * 36;

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private tenant = inject(TenantService);
  private evaluaciones = inject(ResEvaluacionesService);
  private planes = inject(PlanAnualService);
  private matriz = inject(MatrizIndicadoresService);
  private subscription = new Subscription();

  userName = '';
  readonly anio = new Date().getFullYear();
  readonly phvaPhases = PHVA_PHASES;
  readonly quickAccessActions = QUICK_ACCESS_ACTIONS;
  readonly dashAlerts = DASH_ALERTS_MOCK;

  private kpi0312 = signal<KpiCard>(KPI_0312_BASE);
  private kpiPlan = signal<KpiCard>(KPI_PLAN_BASE);
  private kpiIndicadores = signal<KpiCard>(KPI_INDICADORES_BASE);
  private indicadorPlan = signal<KeyIndicator>(INDICADOR_PLAN_BASE);

  readonly upcomingActivities = signal<ProximaActividad[]>([]);
  readonly puntaje0312 = signal<number | null>(null);
  readonly ciclos = signal<CicloCumplimiento[]>([]);

  readonly kpiCards = computed<KpiCard[]>(() => [this.kpi0312(), this.kpiPlan(), this.kpiIndicadores(), ...KPI_MOCK]);
  readonly keyIndicators = computed<KeyIndicator[]>(() => [...KEY_INDICATORS_MOCK, this.indicadorPlan()]);
  readonly donutSegmentos = computed(() => {
    const ciclos = this.ciclos();
    const arcos = arcosDonut(ciclos.map(c => c.total), CIRCUNFERENCIA_DONUT);
    return ciclos.map((c, i) => ({
      ...c,
      color: COLOR_CICLO[c.ciclo] ?? '#64748b',
      dasharray: `${arcos[i].dash} ${CIRCUNFERENCIA_DONUT - arcos[i].dash}`,
      dashoffset: -arcos[i].offset
    }));
  });

  ngOnInit(): void {
    this.subscription.add(
      this.authService.authState$.subscribe((state: AuthState) => {
        if (state.perfil?.nombre) {
          this.userName = state.perfil.nombre.split(' ')[0];
        } else if (state.user?.email) {
          this.userName = state.user.email.split('@')[0];
        }
      })
    );
    void this.cargarDatosReales();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  isGoodTrend(ind: KeyIndicator): boolean {
    return (ind.trendDir === 'up') === ind.trendGood;
  }

  getSparkColor(ind: KeyIndicator): string {
    return this.isGoodTrend(ind) ? '#10b981' : '#ef4444';
  }

  private async cargarDatosReales(): Promise<void> {
    let empresaId: string | null = null;
    try {
      empresaId = await this.tenant.getEmpresaTenantId();
    } catch {
      return;
    }
    if (!empresaId) return;
    await Promise.all([this.cargar0312(empresaId), this.cargarPlan(empresaId), this.cargarIndicadores(empresaId)]);
  }

  private async cargar0312(empresaId: string): Promise<void> {
    try {
      const lista = await this.evaluaciones.listarEvaluaciones(empresaId);
      const ultima = lista.find(e => e.estado === 'Finalizado');
      if (!ultima?.id) return;
      const puntaje = Number(ultima.puntaje_total);
      const estado = estadoCumplimiento0312(puntaje);
      this.puntaje0312.set(puntaje);
      this.kpi0312.update(k => ({ ...k, value: `${puntaje}%`, status: estado.label, statusColor: estado.color, progress: puntaje, progressColor: estado.color }));
      const { detalle } = await this.evaluaciones.obtenerEvaluacionConDetalle(ultima.id);
      this.ciclos.set(cumplimientoPorCiclo(detalle));
    } catch {
      // widget queda en placeholder
    }
  }

  private async cargarPlan(empresaId: string): Promise<void> {
    try {
      const plan = await this.planes.getPlanPorEmpresaAnio(empresaId, this.anio);
      if (!plan?.id) return;
      const actividades = await this.planes.listarActividades(plan.id);
      const kpi = this.planes.calcularKpi(actividades, plan.meta_porcentaje ?? 90);
      this.upcomingActivities.set(proximasDesdeActividades(actividades, new Date().getMonth() + 1, 3));
      if (kpi.cumplimientoAnual === null) return;
      const pct = kpi.cumplimientoAnual;
      const estado = estadoActividades(pct);
      this.kpiPlan.update(k => ({ ...k, value: `${pct}%`, status: estado.label, statusColor: estado.color, progress: pct, progressColor: estado.color }));
      this.indicadorPlan.update(i => ({ ...i, value: `${pct}%`, isBad: pct < kpi.metaPorcentaje }));
    } catch {
      // widget queda en placeholder
    }
  }

  private async cargarIndicadores(empresaId: string): Promise<void> {
    try {
      const { resumen } = await this.matriz.obtenerRegistrosMatriz(empresaId, this.anio);
      if (resumen.total === 0) return;
      this.kpiIndicadores.update(k => ({
        ...k,
        value: `${resumen.cumplen} / ${resumen.total}`,
        status: 'En meta',
        statusColor: '#8b5cf6',
        progress: resumen.porcentajeCumplimiento
      }));
    } catch {
      // widget queda en placeholder
    }
  }
}
