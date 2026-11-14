import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { CockpitComponent } from './pages/cockpit/cockpit.component';
import { EjecucionComponent } from './pages/ejecucion/ejecucion.component';
import { PlantillasComponent } from './pages/plantillas/plantillas.component';

const routes: Routes = [
  { path: '', component: CockpitComponent },
  { path: 'ejecucion/:id', component: EjecucionComponent },
  { path: 'plantillas', component: PlantillasComponent },
];

@NgModule({
  declarations: [CockpitComponent, EjecucionComponent, PlantillasComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, SharedModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AuditoriasModule {}
