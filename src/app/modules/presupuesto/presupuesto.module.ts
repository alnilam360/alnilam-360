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

import { GastosComponent } from './pages/gastos/gastos.component';
import { RecaudoComponent } from './pages/recaudo/recaudo.component';
import { NominaComponent } from './pages/nomina/nomina.component';
import { CuentasPorPagarComponent } from './pages/cuentas-por-pagar/cuentas-por-pagar.component';
import { CapturaCabeceraComponent } from './components/captura-cabecera.component';
import { CapturaConfirmarComponent } from './components/captura-confirmar.component';

const routes: Routes = [
  { path: 'resumen', component: ResumenComponent },
  { path: 'gastos', component: GastosComponent },
  { path: 'recaudo', component: RecaudoComponent },
  { path: 'nomina', component: NominaComponent },
  { path: 'cuentas-por-pagar', component: CuentasPorPagarComponent },
  { path: 'socios', component: SociosComponent },
  { path: 'periodos', component: PeriodosComponent },
  { path: 'catalogo', component: CatalogoComponent },
  { path: '', redirectTo: 'resumen', pathMatch: 'full' },
];

@NgModule({
  declarations: [
    ResumenComponent, SociosComponent, PeriodosComponent, CatalogoComponent,
    GastosComponent, RecaudoComponent, NominaComponent, CuentasPorPagarComponent,
    CapturaCabeceraComponent, CapturaConfirmarComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PresupuestoModule {}
