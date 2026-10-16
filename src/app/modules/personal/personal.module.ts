import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';
import { RecursosResponsablesComponent } from './pages/recursos-responsables/recursos-responsables.component';

const routes: Routes = [
  { path: '', component: RecursosResponsablesComponent }
];

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    SharedModule,
    RecursosResponsablesComponent,
    RouterModule.forChild(routes)
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PersonalModule { }
