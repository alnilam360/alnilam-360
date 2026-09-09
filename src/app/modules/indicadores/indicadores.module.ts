import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';

import { AccidentalidadShellComponent } from './pages/accidentalidad-shell/accidentalidad-shell.component';
import { IndicadoresDashboardComponent } from './pages/indicadores-dashboard/indicadores-dashboard.component';
import { MatrizCasosComponent } from './pages/matriz-casos/matriz-casos.component';
import { CasoWizardComponent } from './pages/matriz-casos/caso-wizard.component';
import { CasoDetalleComponent } from './pages/matriz-casos/caso-detalle.component';
import { ParametrosMensualesComponent } from './pages/parametros/parametros-mensuales.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { BirdTriangleComponent } from './components/bird-triangle/bird-triangle.component';
import { BodyHeatmapComponent } from './components/body-heatmap/body-heatmap.component';
import { TrendLineComponent } from './components/trend-line/trend-line.component';
import { ParetoChartComponent } from './components/pareto-chart/pareto-chart.component';
import { BarBreakdownComponent } from './components/bar-breakdown/bar-breakdown.component';

const routes: Routes = [
  { path: '', component: AccidentalidadShellComponent },
];

@NgModule({
  declarations: [
    AccidentalidadShellComponent,
    IndicadoresDashboardComponent,
    MatrizCasosComponent,
    CasoWizardComponent,
    CasoDetalleComponent,
    ParametrosMensualesComponent,
    KpiCardComponent,
    BirdTriangleComponent,
    BodyHeatmapComponent,
    TrendLineComponent,
    ParetoChartComponent,
    BarBreakdownComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    RouterModule.forChild(routes),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class IndicadoresModule { }
