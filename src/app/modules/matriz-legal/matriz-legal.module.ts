import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';

import { MatrizLegalDashboardComponent } from './pages/dashboard/matriz-legal-dashboard.component';
import { RequisitosListComponent } from './pages/requisitos-list/requisitos-list.component';
import { EvaluacionCumplimientoComponent } from './pages/evaluacion/evaluacion-cumplimiento.component';
import { CatalogosComponent } from './pages/catalogos/catalogos.component';
import { RequisitoFormComponent } from './components/requisito-form/requisito-form.component';

const routes: Routes = [
  { path: '', component: MatrizLegalDashboardComponent },
  { path: 'requisitos', component: RequisitosListComponent },
  { path: 'evaluacion', component: EvaluacionCumplimientoComponent },
  { path: 'catalogos', component: CatalogosComponent },
];

@NgModule({
  declarations: [
    MatrizLegalDashboardComponent,
    RequisitosListComponent,
    EvaluacionCumplimientoComponent,
    CatalogosComponent,
    RequisitoFormComponent,
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
export class MatrizLegalModule {}
