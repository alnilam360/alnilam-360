import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
      },

      // Gestión SST
      {
        path: 'gestion-sst',
        children: [
          // Evaluaciones Res. 0312 (unificado: tipo calculado automáticamente por empresa)
          {
            path: 'evaluaciones',
            loadChildren: () => import('./modules/gestion-sst/evaluaciones/evaluaciones.module').then(m => m.EvaluacionesModule)
          },
          // Plan de Mejora
          {
            path: 'plan-mejora',
            loadChildren: () => import('./modules/gestion-sst/plan-mejora/plan-mejora.module').then(m => m.PlanMejoraModule)
          },
          // Matriz IPERC
          {
            path: 'matriz-iperc',
            loadChildren: () => import('./modules/gestion-sst/matriz-iperc/iperc.module').then(m => m.IpercModule)
          },
          // Planes y Programas
          {
            path: 'planes',
            children: [
              { path: 'plan-trabajo', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'plan-trabajo' } },
              { path: 'capacitaciones', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'capacitaciones' } },
              { path: 'inspecciones', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'inspecciones' } },
              { path: 'mantenimiento', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'mantenimiento' } },
              { path: 'prevencion', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'prevencion' } },
              { path: 'ergonomia', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'ergonomia' } },
              { path: 'residuos', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'residuos' } },
              { path: 'estilos-vida', loadChildren: () => import('./modules/gestion-sst/planes/planes.module').then(m => m.PlanesModule), data: { tipo: 'estilos-vida' } },
              { path: '', redirectTo: 'plan-trabajo', pathMatch: 'full' }
            ]
          },
          // Incidentes y Reportes
          {
            path: 'incidentes',
            children: [
              { path: 'registro', loadChildren: () => import('./modules/gestion-sst/incidentes/incidentes.module').then(m => m.IncidentesModule), data: { tipo: 'registro' } },
              { path: 'investigacion', loadChildren: () => import('./modules/gestion-sst/incidentes/incidentes.module').then(m => m.IncidentesModule), data: { tipo: 'investigacion' } },
              { path: 'lecciones', loadChildren: () => import('./modules/gestion-sst/incidentes/incidentes.module').then(m => m.IncidentesModule), data: { tipo: 'lecciones' } },
              { path: 'actos-condiciones', loadChildren: () => import('./modules/gestion-sst/incidentes/incidentes.module').then(m => m.IncidentesModule), data: { tipo: 'actos-condiciones' } },
              { path: 'consolidado', loadChildren: () => import('./modules/gestion-sst/incidentes/incidentes.module').then(m => m.IncidentesModule), data: { tipo: 'consolidado' } },
              { path: '', redirectTo: 'registro', pathMatch: 'full' }
            ]
          },
          // Inspecciones
          {
            path: 'inspecciones',
            children: [
              { path: 'epps', loadChildren: () => import('./modules/gestion-sst/inspecciones/inspecciones.module').then(m => m.InspeccionesModule), data: { tipo: 'epps' } },
              { path: 'gerencial', loadChildren: () => import('./modules/gestion-sst/inspecciones/inspecciones.module').then(m => m.InspeccionesModule), data: { tipo: 'gerencial' } },
              { path: 'locativa', loadChildren: () => import('./modules/gestion-sst/inspecciones/inspecciones.module').then(m => m.InspeccionesModule), data: { tipo: 'locativa' } },
              { path: 'quimicas', loadChildren: () => import('./modules/gestion-sst/inspecciones/inspecciones.module').then(m => m.InspeccionesModule), data: { tipo: 'quimicas' } },
              { path: 'extintores', loadChildren: () => import('./modules/gestion-sst/inspecciones/inspecciones.module').then(m => m.InspeccionesModule), data: { tipo: 'extintores' } },
              { path: 'botiquin', loadChildren: () => import('./modules/gestion-sst/inspecciones/inspecciones.module').then(m => m.InspeccionesModule), data: { tipo: 'botiquin' } },
              { path: '', redirectTo: 'epps', pathMatch: 'full' }
            ]
          },
          // Emergencias
          {
            path: 'emergencias',
            children: [
              { path: 'medevac', loadChildren: () => import('./modules/gestion-sst/emergencias/emergencias.module').then(m => m.EmergenciasModule), data: { tipo: 'medevac' } },
              { path: 'registro-medevac', loadChildren: () => import('./modules/gestion-sst/emergencias/emergencias.module').then(m => m.EmergenciasModule), data: { tipo: 'registro-medevac' } },
              { path: 'simulacros', loadChildren: () => import('./modules/gestion-sst/emergencias/emergencias.module').then(m => m.EmergenciasModule), data: { tipo: 'simulacros' } },
              { path: 'conformacion-brigadas', loadChildren: () => import('./modules/gestion-sst/emergencias/emergencias.module').then(m => m.EmergenciasModule), data: { tipo: 'conformacion-brigadas' } },
              { path: 'estructura-brigadas', loadChildren: () => import('./modules/gestion-sst/emergencias/emergencias.module').then(m => m.EmergenciasModule), data: { tipo: 'estructura-brigadas' } },
              { path: '', redirectTo: 'medevac', pathMatch: 'full' }
            ]
          },
          { path: '', redirectTo: 'evaluaciones', pathMatch: 'full' }
        ]
      },

      // Documentos
      {
        path: 'documentos',
        children: [
          {
            path: 'controlados',
            children: [
              { path: 'politicas', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'politicas' } },
              { path: 'manual-sgsst', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'manual-sgsst' } },
              { path: 'manual-control', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'manual-control' } },
              { path: 'perfil-trabajadores', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'perfil-trabajadores' } },
              { path: 'perfil-representante', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'perfil-representante' } },
              { path: 'induccion', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'induccion' } },
              { path: 'carta-representante', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'carta-representante' } },
              { path: 'otros', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'otros' } },
              { path: '', redirectTo: 'politicas', pathMatch: 'full' }
            ]
          },
          {
            path: 'catalogos',
            children: [
              { path: 'lista-maestra', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'lista-maestra' } },
              { path: 'matriz-requisitos', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'matriz-requisitos' } },
              { path: 'matriz-peligros', loadChildren: () => import('./modules/documentos/documentos.module').then(m => m.DocumentosModule), data: { tipo: 'matriz-peligros' } },
              { path: '', redirectTo: 'lista-maestra', pathMatch: 'full' }
            ]
          },
          { path: '', redirectTo: 'controlados', pathMatch: 'full' }
        ]
      },

      // Formatos Operativos
      {
        path: 'formatos',
        children: [
          { path: 'planes-accion', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'planes-accion' } },
          { path: 'chequeo-auditoria', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'chequeo-auditoria' } },
          { path: 'informe-auditoria', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'informe-auditoria' } },
          { path: 'registro-asistencia', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'registro-asistencia' } },
          { path: 'evaluacion-induccion', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'evaluacion-induccion' } },
          { path: 'profesiograma', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'profesiograma' } },
          { path: 'matriz-epps', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'matriz-epps' } },
          { path: 'entrega-dotacion', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'entrega-dotacion' } },
          { path: 'encuesta-sociodemografico', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'encuesta-sociodemografico' } },
          { path: 'tabulacion-encuesta', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'tabulacion-encuesta' } },
          { path: 'seguimiento-examenes', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'seguimiento-examenes' } },
          { path: 'reporte-actos', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'reporte-actos' } },
          { path: 'otros', loadChildren: () => import('./modules/formatos/formatos.module').then(m => m.FormatosModule), data: { tipo: 'otros' } },
          { path: '', redirectTo: 'planes-accion', pathMatch: 'full' }
        ]
      },

      // Indicadores
      {
        path: 'indicadores',
        children: [
          {
            path: 'accidentalidad',
            children: [
              { path: 'indicadores', loadChildren: () => import('./modules/indicadores/indicadores.module').then(m => m.IndicadoresModule), data: { tipo: 'indicadores' } },
              { path: 'matriz', loadChildren: () => import('./modules/indicadores/indicadores.module').then(m => m.IndicadoresModule), data: { tipo: 'matriz' } },
              { path: 'fichas', loadChildren: () => import('./modules/indicadores/indicadores.module').then(m => m.IndicadoresModule), data: { tipo: 'fichas' } },
              { path: '', redirectTo: 'indicadores', pathMatch: 'full' }
            ]
          },
          { path: 'ausentismo', loadChildren: () => import('./modules/indicadores/indicadores.module').then(m => m.IndicadoresModule), data: { tipo: 'ausentismo' } },
          { path: 'otros-kpi', loadChildren: () => import('./modules/indicadores/indicadores.module').then(m => m.IndicadoresModule), data: { tipo: 'otros-kpi' } },
          { path: '', redirectTo: 'accidentalidad', pathMatch: 'full' }
        ]
      },

      // Auditorías
      {
        path: 'auditorias',
        children: [
          { path: 'programacion', loadChildren: () => import('./modules/auditorias/auditorias.module').then(m => m.AuditoriasModule), data: { tipo: 'programacion' } },
          { path: 'resultados', loadChildren: () => import('./modules/auditorias/auditorias.module').then(m => m.AuditoriasModule), data: { tipo: 'resultados' } },
          { path: 'hallazgos', loadChildren: () => import('./modules/auditorias/auditorias.module').then(m => m.AuditoriasModule), data: { tipo: 'hallazgos' } },
          { path: 'informes', loadChildren: () => import('./modules/auditorias/auditorias.module').then(m => m.AuditoriasModule), data: { tipo: 'informes' } },
          { path: '', redirectTo: 'programacion', pathMatch: 'full' }
        ]
      },

      // Personal / RRHH
      {
        path: 'personal',
        children: [
          { path: 'empleados', loadChildren: () => import('./modules/personal/personal.module').then(m => m.PersonalModule), data: { tipo: 'empleados' } },
          { path: 'roles', loadChildren: () => import('./modules/personal/personal.module').then(m => m.PersonalModule), data: { tipo: 'roles' } },
          { path: 'brigadas', loadChildren: () => import('./modules/personal/personal.module').then(m => m.PersonalModule), data: { tipo: 'brigadas' } },
          { path: 'asignaciones', loadChildren: () => import('./modules/personal/personal.module').then(m => m.PersonalModule), data: { tipo: 'asignaciones' } },
          { path: '', redirectTo: 'empleados', pathMatch: 'full' }
        ]
      },

      // Calendario
      {
        path: 'calendario',
        children: [
          { path: 'eventos', loadChildren: () => import('./modules/calendario/calendario.module').then(m => m.CalendarioModule), data: { tipo: 'eventos' } },
          { path: 'capacitacion', loadChildren: () => import('./modules/calendario/calendario.module').then(m => m.CalendarioModule), data: { tipo: 'capacitacion' } },
          { path: 'inspecciones', loadChildren: () => import('./modules/calendario/calendario.module').then(m => m.CalendarioModule), data: { tipo: 'inspecciones' } },
          { path: 'auditorias', loadChildren: () => import('./modules/calendario/calendario.module').then(m => m.CalendarioModule), data: { tipo: 'auditorias' } },
          { path: '', redirectTo: 'eventos', pathMatch: 'full' }
        ]
      },

      // Reportes
      {
        path: 'reportes',
        children: [
          { path: '0312', loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule), data: { tipo: '0312' } },
          { path: 'formatos', loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule), data: { tipo: 'formatos' } },
          { path: 'indicadores', loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule), data: { tipo: 'indicadores' } },
          { path: 'documentos', loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule), data: { tipo: 'documentos' } },
          { path: 'exportar', loadChildren: () => import('./modules/reportes/reportes.module').then(m => m.ReportesModule), data: { tipo: 'exportar' } },
          { path: '', redirectTo: '0312', pathMatch: 'full' }
        ]
      },

      // Configuración
      {
        path: 'configuracion',
        children: [
          { path: 'usuarios', loadChildren: () => import('./modules/usuarios/usuarios.module').then(m => m.UsuariosModule) },
          { path: '', loadChildren: () => import('./modules/configuracion/configuracion.module').then(m => m.ConfiguracionModule) }
        ]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
