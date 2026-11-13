import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';

import { ResumenComponent } from './pages/resumen/resumen.component';
import { SociosComponent } from './pages/socios/socios.component';
import { PeriodosComponent } from './pages/periodos/periodos.component';
import { CatalogoComponent } from './pages/catalogo/catalogo.component';

const routes: Routes = [
  { path: 'resumen', component: ResumenComponent },
  { path: 'socios', component: SociosComponent },
  { path: 'periodos', component: PeriodosComponent },
  { path: 'catalogo', component: CatalogoComponent },
  { path: '', redirectTo: 'resumen', pathMatch: 'full' },
];

@NgModule({
  declarations: [ResumenComponent, SociosComponent, PeriodosComponent, CatalogoComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PresupuestoModule {}
