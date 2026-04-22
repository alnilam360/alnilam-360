import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../../shared/shared.module';

import { EvaluacionesDashboardComponent } from './pages/dashboard/evaluaciones-dashboard.component';
import { EvaluacionDetalleComponent } from './pages/detalle/evaluacion-detalle.component';

const routes: Routes = [
  { path: '', component: EvaluacionesDashboardComponent },
  { path: ':id', component: EvaluacionDetalleComponent }
];

@NgModule({
  declarations: [
    EvaluacionesDashboardComponent,
    EvaluacionDetalleComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EvaluacionesModule { }
