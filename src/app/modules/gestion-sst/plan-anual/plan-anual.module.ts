import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared.module';
import { PlanAnualDashboardComponent } from './pages/dashboard/plan-anual-dashboard.component';
import { ActividadFormModalComponent } from './components/actividad-form-modal/actividad-form-modal.component';

const routes: Routes = [
  { path: '', component: PlanAnualDashboardComponent }
];

@NgModule({
  declarations: [
    PlanAnualDashboardComponent,
    ActividadFormModalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes),
  ]
})
export class PlanAnualModule {}
