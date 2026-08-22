import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
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
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes),
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PlanAnualModule {}
