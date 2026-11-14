import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
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
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes),
  ]
})
export class MatrizLegalModule {}
