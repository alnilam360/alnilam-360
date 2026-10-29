import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../shared/shared.module';

import { MatrizLegalComponent } from './pages/matriz/matriz-legal.component';

const routes: Routes = [
  { path: '', component: MatrizLegalComponent },
];

@NgModule({
  declarations: [
    MatrizLegalComponent,
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
