import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { MonthlyChartComponent } from './components/monthly-chart/monthly-chart.component';
import { ProgressGaugeComponent } from './components/progress-gauge/progress-gauge.component';
import { RecentActivityComponent } from './components/recent-activity/recent-activity.component';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardPageComponent
  }
];

@NgModule({
  declarations: [
    DashboardPageComponent,
    StatCardComponent,
    MonthlyChartComponent,
    ProgressGaugeComponent,
    RecentActivityComponent,
    QuickActionsComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DashboardModule { }
