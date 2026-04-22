export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  expanded?: boolean;
  badge?: string | number;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'grid-outline',
    route: '/dashboard'
  },
  {
    id: 'gestion-sst',
    label: 'Gestión SST',
    icon: 'shield-checkmark-outline',
    children: [
      {
        id: 'evaluaciones-0312',
        label: 'Eval Res. 0312',
        icon: 'clipboard-outline',
        route: '/gestion-sst/evaluaciones'
      },
      {
        id: 'plan-mejora',
        label: 'Plan de Mejora',
        icon: 'construct-outline',
        route: '/gestion-sst/plan-mejora'
      },
      {
        id: 'matriz-iperc',
        label: 'Matriz IPERC',
        icon: 'shield-half-outline',
        route: '/gestion-sst/matriz-iperc'
      },
      {
        id: 'planes-programas',
        label: 'Planes y Programas',
        icon: 'document-text-outline',
        children: [
          { id: 'plan-trabajo', label: 'Plan de Trabajo', route: '/gestion-sst/planes/plan-trabajo' },
          { id: 'programa-capacitaciones', label: 'Programa de Capacitaciones', route: '/gestion-sst/planes/capacitaciones' },
          { id: 'programa-inspecciones', label: 'Programa de Inspecciones', route: '/gestion-sst/planes/inspecciones' },
          { id: 'programa-mantenimiento', label: 'Programa de Mantenimiento', route: '/gestion-sst/planes/mantenimiento' },
          { id: 'prevencion', label: 'Prevención (alcohol/cigarrillo/sustancias)', route: '/gestion-sst/planes/prevencion' },
          { id: 'ergonomia', label: 'Ergonomía', route: '/gestion-sst/planes/ergonomia' },
          { id: 'gestion-residuos', label: 'Gestión de Residuos', route: '/gestion-sst/planes/residuos' },
          { id: 'estilos-vida', label: 'Estilos de Vida Saludable', route: '/gestion-sst/planes/estilos-vida' }
        ]
      },
      {
        id: 'incidentes-reportes',
        label: 'Incidentes y Reportes',
        icon: 'warning-outline',
        children: [
          { id: 'registro-incidentes', label: 'Registro de Incidentes', route: '/gestion-sst/incidentes/registro' },
          { id: 'investigacion-accidentes', label: 'Investigación de Accidentes', route: '/gestion-sst/incidentes/investigacion' },
          { id: 'lecciones-aprendidas', label: 'Lecciones Aprendidas', route: '/gestion-sst/incidentes/lecciones' },
          { id: 'reporte-actos-condiciones', label: 'Reporte de Actos y Condiciones Inseguras', route: '/gestion-sst/incidentes/actos-condiciones' },
          { id: 'consolidado-actos', label: 'Consolidado de Actos/Condiciones Inseguras', route: '/gestion-sst/incidentes/consolidado' }
        ]
      },
      {
        id: 'inspecciones',
        label: 'Inspecciones',
        icon: 'search-outline',
        children: [
          { id: 'insp-epps', label: 'Uso de EPPS', route: '/gestion-sst/inspecciones/epps' },
          { id: 'insp-gerencial', label: 'Gerencial', route: '/gestion-sst/inspecciones/gerencial' },
          { id: 'insp-locativa', label: 'Locativa', route: '/gestion-sst/inspecciones/locativa' },
          { id: 'insp-quimicas', label: 'Sustancias Químicas', route: '/gestion-sst/inspecciones/quimicas' },
          { id: 'insp-extintores', label: 'Extintores', route: '/gestion-sst/inspecciones/extintores' },
          { id: 'insp-botiquin', label: 'Botiquín', route: '/gestion-sst/inspecciones/botiquin' }
        ]
      },
      {
        id: 'emergencias',
        label: 'Emergencias',
        icon: 'medical-outline',
        children: [
          { id: 'medevac', label: 'MEDEVAC', route: '/gestion-sst/emergencias/medevac' },
          { id: 'registro-medevac', label: 'Registro MEDEVAC', route: '/gestion-sst/emergencias/registro-medevac' },
          { id: 'simulacros', label: 'Simulacros', route: '/gestion-sst/emergencias/simulacros' },
          { id: 'conformacion-brigadas', label: 'Conformación de Brigadas', route: '/gestion-sst/emergencias/conformacion-brigadas' },
          { id: 'estructura-brigadas', label: 'Estructura de Brigadas', route: '/gestion-sst/emergencias/estructura-brigadas' }
        ]
      }
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos',
    icon: 'folder-outline',
    children: [
      {
        id: 'docs-controlados',
        label: 'Documentos Controlados',
        icon: 'document-lock-outline',
        children: [
          { id: 'politicas', label: 'Políticas Organizacionales', route: '/documentos/controlados/politicas' },
          { id: 'manual-sgsst', label: 'Manual SG-SST', route: '/documentos/controlados/manual-sgsst' },
          { id: 'manual-control-docs', label: 'Manual Control de Documentos', route: '/documentos/controlados/manual-control' },
          { id: 'perfil-trabajadores', label: 'Perfil de Trabajadores', route: '/documentos/controlados/perfil-trabajadores' },
          { id: 'perfil-representante', label: 'Perfil Representante Dirección', route: '/documentos/controlados/perfil-representante' },
          { id: 'induccion', label: 'Inducción', route: '/documentos/controlados/induccion' },
          { id: 'carta-representante', label: 'Carta Representante SST', route: '/documentos/controlados/carta-representante' },
          { id: 'otros-docs-maestros', label: 'Otros documentos maestros', route: '/documentos/controlados/otros' }
        ]
      },
      {
        id: 'catalogos-matrices',
        label: 'Catálogos y Matrices',
        icon: 'albums-outline',
        children: [
          { id: 'lista-maestra', label: 'Lista Maestra de Documentos', route: '/documentos/catalogos/lista-maestra' },
          { id: 'matriz-requisitos', label: 'Matriz de Requisitos Legales', route: '/documentos/catalogos/matriz-requisitos' },
          { id: 'matriz-peligros', label: 'Matriz de Identificación de Peligros (GTC45)', route: '/documentos/catalogos/matriz-peligros' }
        ]
      }
    ]
  },
  {
    id: 'formatos-operativos',
    label: 'Formatos Operativos',
    icon: 'document-outline',
    children: [
      { id: 'planes-accion', label: 'Planes de Acción', route: '/formatos/planes-accion' },
      { id: 'chequeo-auditoria', label: 'Lista de Chequeo Auditoría', route: '/formatos/chequeo-auditoria' },
      { id: 'informe-auditoria', label: 'Informe de Auditoría', route: '/formatos/informe-auditoria' },
      { id: 'registro-asistencia', label: 'Registro de Asistencia', route: '/formatos/registro-asistencia' },
      { id: 'eval-induccion', label: 'Evaluación de Inducción', route: '/formatos/evaluacion-induccion' },
      { id: 'profesiograma', label: 'Profesiograma', route: '/formatos/profesiograma' },
      { id: 'matriz-epps', label: 'Matriz EPPs', route: '/formatos/matriz-epps' },
      { id: 'entrega-dotacion', label: 'Entrega de Dotación/EPPS', route: '/formatos/entrega-dotacion' },
      { id: 'encuesta-sociodemografico', label: 'Encuesta Perfil Sociodemográfico', route: '/formatos/encuesta-sociodemografico' },
      { id: 'tabulacion-encuesta', label: 'Tabulación Encuesta Perfil Sociodemográfico', route: '/formatos/tabulacion-encuesta' },
      { id: 'seguimiento-examenes', label: 'Seguimiento Exámenes Médicos', route: '/formatos/seguimiento-examenes' },
      { id: 'reporte-actos', label: 'Reporte de Actos y Condiciones', route: '/formatos/reporte-actos' },
      { id: 'otros-formatos', label: 'Otros formatos', route: '/formatos/otros' }
    ]
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    icon: 'stats-chart-outline',
    children: [
      {
        id: 'accidentalidad',
        label: 'Accidentalidad',
        icon: 'pulse-outline',
        children: [
          { id: 'indicadores-accidentalidad', label: 'Indicadores', route: '/indicadores/accidentalidad/indicadores' },
          { id: 'matriz-indicadores', label: 'Matriz de Indicadores', route: '/indicadores/accidentalidad/matriz' },
          { id: 'fichas-automatizadas', label: 'Fichas Automatizadas', route: '/indicadores/accidentalidad/fichas' }
        ]
      },
      { id: 'ausentismo', label: 'Ausentismo', route: '/indicadores/ausentismo', icon: 'calendar-clear-outline' },
      { id: 'otros-kpi', label: 'Otros KPI SST', route: '/indicadores/otros-kpi', icon: 'analytics-outline' }
    ]
  },
  {
    id: 'auditorias',
    label: 'Auditorías',
    icon: 'checkbox-outline',
    children: [
      { id: 'programacion-auditorias', label: 'Programación', route: '/auditorias/programacion', icon: 'calendar-outline' },
      { id: 'resultados-auditorias', label: 'Resultados', route: '/auditorias/resultados', icon: 'list-outline' },
      { id: 'seguimiento-hallazgos', label: 'Seguimiento de Hallazgos', route: '/auditorias/hallazgos', icon: 'eye-outline' },
      { id: 'informes-auditorias', label: 'Informes', route: '/auditorias/informes', icon: 'document-text-outline' }
    ]
  },
  {
    id: 'personal',
    label: 'Personal / RRHH',
    icon: 'people-outline',
    children: [
      { id: 'empleados', label: 'Empleados', route: '/personal/empleados', icon: 'person-outline' },
      { id: 'roles-responsabilidades', label: 'Roles y Responsabilidades', route: '/personal/roles', icon: 'key-outline' },
      { id: 'brigadas', label: 'Brigadas', route: '/personal/brigadas', icon: 'shield-outline' },
      { id: 'asignaciones-sede', label: 'Asignaciones por Sede', route: '/personal/asignaciones', icon: 'business-outline' }
    ]
  },
  {
    id: 'calendario',
    label: 'Calendario',
    icon: 'calendar-outline',
    children: [
      { id: 'eventos-vencimientos', label: 'Eventos y Vencimientos', route: '/calendario/eventos', icon: 'time-outline' },
      { id: 'cal-capacitacion', label: 'Capacitación', route: '/calendario/capacitacion', icon: 'school-outline' },
      { id: 'cal-inspecciones', label: 'Inspecciones', route: '/calendario/inspecciones', icon: 'search-outline' },
      { id: 'cal-auditorias', label: 'Auditorías', route: '/calendario/auditorias', icon: 'checkbox-outline' }
    ]
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: 'bar-chart-outline',
    children: [
      { id: 'reporte-0312', label: 'Reporte 0312', route: '/reportes/0312', icon: 'document-outline' },
      { id: 'reportes-formatos', label: 'Reportes de Formatos', route: '/reportes/formatos', icon: 'documents-outline' },
      { id: 'rep-indicadores', label: 'Indicadores', route: '/reportes/indicadores', icon: 'trending-up-outline' },
      { id: 'rep-documentos', label: 'Documentos y Versiones', route: '/reportes/documentos', icon: 'folder-open-outline' },
      { id: 'exportar', label: 'Exportar a PDF/Excel', route: '/reportes/exportar', icon: 'download-outline' }
    ]
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: 'settings-outline',
    children: [
      { id: 'empresas-sedes', label: 'Empresas y Sedes', route: '/configuracion/empresas', icon: 'business-outline' },
      { id: 'roles-permisos', label: 'Roles y Permisos', route: '/configuracion/roles', icon: 'shield-checkmark-outline' },
      { id: 'usuarios-permisos', label: 'Usuarios', route: '/configuracion/usuarios', icon: 'people-circle-outline' },
      { id: 'catalogos', label: 'Catálogos (Tipo de Jornada, Tipo de Vinculación, Sexo)', route: '/configuracion/catalogos', icon: 'list-outline' },
      { id: 'plantillas-evaluacion', label: 'Plantillas de Evaluación', route: '/configuracion/plantillas', icon: 'copy-outline' },
      { id: 'ajustes-generales', label: 'Ajustes Generales', route: '/configuracion/ajustes', icon: 'options-outline' }
    ]
  }
];
