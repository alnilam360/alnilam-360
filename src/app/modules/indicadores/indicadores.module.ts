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

import { IndicadoresAnalisisComponent } from './components/indicadores-analisis/indicadores-analisis.component';
import { Cie10SelectorComponent } from './components/cie10-selector/cie10-selector.component';
import { EnfermedadLaboralComponent } from './pages/enfermedad-laboral/enfermedad-laboral.component';
import { AusentismoComponent } from './pages/ausentismo/ausentismo.component';
import { SgSstEprComponent } from './pages/sg-sst-epr/sg-sst-epr.component';

const routes: Routes = [
  {
    path: 'accidentalidad',
    children: [
      { path: 'indicadores', component: AccidentalidadShellComponent, data: { tab: 'indicadores' } },
      { path: 'matriz', component: AccidentalidadShellComponent, data: { tab: 'matriz' } },
      { path: 'analisis', component: AccidentalidadShellComponent, data: { tab: 'analisis' } },
      { path: 'fichas', component: AccidentalidadShellComponent, data: { tab: 'analisis' } },
      { path: '', component: AccidentalidadShellComponent }
    ]
  },
  { path: 'enfermedad-laboral', component: EnfermedadLaboralComponent },
  { path: 'ausentismo', component: AusentismoComponent },
  { path: 'sg-sst', component: SgSstEprComponent },
  { path: '', redirectTo: 'accidentalidad', pathMatch: 'full' }
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
    IndicadoresAnalisisComponent,
    Cie10SelectorComponent,
    EnfermedadLaboralComponent,
    AusentismoComponent,
    SgSstEprComponent
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
