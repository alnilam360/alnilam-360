import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PlaceholderPageComponent } from './components/placeholder-page/placeholder-page.component';

@NgModule({
  declarations: [
    PlaceholderPageComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
  ],
  exports: [
    PlaceholderPageComponent
  ]
})
export class SharedModule { }
