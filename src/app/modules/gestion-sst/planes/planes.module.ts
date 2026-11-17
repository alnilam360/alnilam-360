import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { CapacitacionService } from './services/capacitacion.service';
import { CapacitacionDashboardComponent } from './pages/dashboard/capacitacion-dashboard.component';
import { TemaFormModalComponent } from './components/tema-form-modal/tema-form-modal.component';
import { SesionFormModalComponent } from './components/sesion-form-modal/sesion-form-modal.component';
import { AsistenciaPanelComponent } from './components/asistencia-panel/asistencia-panel.component';
import { ConfirmarEliminarComponent } from './components/confirmar-eliminar/confirmar-eliminar.component';
import { NecesidadesIpercPanelComponent } from './components/necesidades-iperc-panel/necesidades-iperc-panel.component';
import { EficaciaPanelComponent } from './components/eficacia-panel/eficacia-panel.component';
import { CronogramaCalendarioComponent } from './components/cronograma-calendario/cronograma-calendario.component';
import { PlanesHostComponent } from './pages/planes-host.component';

const routes: Routes = [
  { path: '', component: PlanesHostComponent }
];

@NgModule({
  declarations: [
    PlanesHostComponent, CapacitacionDashboardComponent, TemaFormModalComponent,
    SesionFormModalComponent, AsistenciaPanelComponent, ConfirmarEliminarComponent,
    NecesidadesIpercPanelComponent, EficaciaPanelComponent, CronogramaCalendarioComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  providers: [CapacitacionService]
})
export class PlanesModule { }
