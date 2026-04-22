import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../../shared/shared.module';

import { PlanMejoraDashboardComponent } from './pages/dashboard/plan-mejora-dashboard.component';

const routes: Routes = [
    { path: '', component: PlanMejoraDashboardComponent }
];

@NgModule({
    declarations: [
        PlanMejoraDashboardComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        SharedModule,
        RouterModule.forChild(routes)
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PlanMejoraModule { }
