import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { RecursosResponsablesComponent } from './pages/recursos-responsables/recursos-responsables.component';

const routes: Routes = [
  { path: '', component: RecursosResponsablesComponent }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    RecursosResponsablesComponent,
    RouterModule.forChild(routes)
  ]
})
export class PersonalModule { }
