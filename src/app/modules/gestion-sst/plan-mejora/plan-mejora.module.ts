import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class PlanMejoraModule { }
