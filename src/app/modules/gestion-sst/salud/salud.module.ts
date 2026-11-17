import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SaludService } from './services/salud.service';
import { SaludDashboardComponent } from './pages/dashboard/salud-dashboard.component';
import { ExamenesTrabajadorComponent } from './components/examenes-trabajador/examenes-trabajador.component';
import { ExamenFormModalComponent } from './components/examen-form-modal/examen-form-modal.component';
import { RestriccionesPanelComponent } from './components/restricciones-panel/restricciones-panel.component';
import { PerfilCargoPanelComponent } from './components/perfil-cargo-panel/perfil-cargo-panel.component';
import { DiagnosticoPanelComponent } from './components/diagnostico-panel/diagnostico-panel.component';

const routes: Routes = [
  { path: '', component: SaludDashboardComponent }
];

@NgModule({
  declarations: [
    SaludDashboardComponent, ExamenesTrabajadorComponent, ExamenFormModalComponent,
    RestriccionesPanelComponent, PerfilCargoPanelComponent,
    DiagnosticoPanelComponent,
  ],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)],
  providers: [SaludService]
})
export class SaludModule { }
