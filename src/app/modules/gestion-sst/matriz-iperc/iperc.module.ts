import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from '../../../shared/shared.module';

import { IpercDashboardComponent } from './pages/dashboard/iperc-dashboard.component';
import { IpercFormComponent } from './pages/form/iperc-form.component';

const routes: Routes = [
    { path: '', component: IpercDashboardComponent },
    { path: 'nuevo', component: IpercFormComponent },
    { path: ':id/editar', component: IpercFormComponent }
];

@NgModule({
    declarations: [
        IpercDashboardComponent,
        IpercFormComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        IonicModule,
        SharedModule,
        RouterModule.forChild(routes)
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class IpercModule { }
