import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CargosComponent } from './pages/cargos/cargos.component';
import { SharedModule } from '../../shared/shared.module';
import { EmpresasComponent } from './pages/empresas/empresas.component';
import { RolesComponent } from './pages/roles/roles.component';
import { TrabajadoresComponent } from './pages/trabajadores/trabajadores.component';
import { CargueMasivoModalComponent } from './pages/trabajadores/components/cargue-masivo-modal/cargue-masivo-modal.component';

// PrimeNG
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

const routes: Routes = [
  { path: '', redirectTo: 'empresas', pathMatch: 'full' },
  { path: 'empresas', component: EmpresasComponent },
  { path: 'roles', component: RolesComponent },
  { path: 'trabajadores', component: TrabajadoresComponent },
  { path: 'cargos', component: CargosComponent }
];

@NgModule({
  declarations: [
    EmpresasComponent,
    RolesComponent,
    TrabajadoresComponent,
    CargosComponent,
    CargueMasivoModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes),
    // PrimeNG
    TableModule,
    InputTextModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    CheckboxModule,
    AutoCompleteModule,
    ProgressBarModule,
    TooltipModule
  ]
})
export class ConfiguracionModule { }

