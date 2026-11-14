import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { UsuariosComponent } from './pages/usuarios/usuarios.component';

const routes: Routes = [
    { path: '', component: UsuariosComponent }
];

@NgModule({
    declarations: [
        UsuariosComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(routes),
        // PrimeNG
        TableModule,
        InputTextModule,
        ButtonModule,
        TagModule
    ]
})
export class UsuariosModule { }
