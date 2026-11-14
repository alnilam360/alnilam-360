import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BandejaComponent } from './pages/bandeja/bandeja.component';

import { InvestigacionDetalleComponent } from './pages/detalle/investigacion-detalle.component';

const routes: Routes = [
  { path: '', component: BandejaComponent },
  { path: ':casoId', component: InvestigacionDetalleComponent },
];

@NgModule({
  declarations: [BandejaComponent, InvestigacionDetalleComponent],
  imports: [CommonModule, FormsModule, SharedModule, RouterModule.forChild(routes)]
})
export class InvestigacionAtelModule {}
