export interface MenuItem {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
  route?: string;
  children?: MenuItem[];
  expanded?: boolean;
  badge?: string | number;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
  phvaGroup?: 'P' | 'H' | 'V' | 'A';
  isSectionLabel?: boolean;
  isUtility?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Inicio',
    subtitle: 'Dashboard Ejecutivo',
    icon: 'home-outline',
    route: '/dashboard'
  },
  {
    id: '_phva_header',
    label: 'CICLO PHVA',
    isSectionLabel: true
  },
  {
    id: 'planear',
    label: 'PLANEAR',
    phvaGroup: 'P',
    children: [
      { id: 'politica-objetivos', label: 'Política, Objetivos y Metas', icon: 'flag-outline', route: '/documentos/controlados/politicas' },
      { id: 'evaluacion-inicial', label: 'Evaluación Inicial', icon: 'clipboard-outline', route: '/gestion-sst/evaluaciones' },
      { id: 'plan-anual-trabajo', label: 'Plan Anual de Trabajo', icon: 'calendar-outline', route: '/gestion-sst/planes/plan-trabajo' },
      { id: 'matriz-legal', label: 'Matriz Legal', icon: 'document-text-outline', route: '/documentos/catalogos/matriz-requisitos' },
      { id: 'recursos-responsables', label: 'Recursos y Responsables', icon: 'people-outline', route: '/personal/roles' }
    ]
  },
  {
    id: 'hacer',
    label: 'HACER',
    phvaGroup: 'H',
    children: [
      { id: 'gestion-peligros', label: 'Gestión de Peligros y Riesgos', icon: 'warning-outline', route: '/gestion-sst/matriz-iperc' },
      { id: 'gestion-salud', label: 'Gestión de la Salud', icon: 'heart-outline', route: '/formatos/seguimiento-examenes' },
      { id: 'capacitacion-competencias', label: 'Capacitación y Competencias', icon: 'school-outline', route: '/gestion-sst/planes/capacitaciones' },
      { id: 'contratistas-proveedores', label: 'Contratistas y Proveedores', icon: 'business-outline', route: '/personal/asignaciones' },
      { id: 'comunicacion-participacion', label: 'Comunicación y Participación', icon: 'megaphone-outline', route: '/gestion-sst/planes/estilos-vida' }
    ]
  },
  {
    id: 'verificar',
    label: 'VERIFICAR',
    phvaGroup: 'V',
    children: [
      { id: 'indicadores-resultados', label: 'Indicadores y Resultados', icon: 'stats-chart-outline', route: '/indicadores/accidentalidad/indicadores' },
      { id: 'auditorias-inspecciones', label: 'Auditorías e Inspecciones', icon: 'checkbox-outline', route: '/auditorias/programacion' },
      { id: 'investigacion-atel', label: 'Investigación de AT/EL', icon: 'search-outline', route: '/gestion-sst/incidentes/investigacion' },
      { id: 'cumplimiento-legal', label: 'Cumplimiento Legal', icon: 'shield-checkmark-outline', route: '/documentos/catalogos/matriz-requisitos' },
      { id: 'revision-alta-direccion', label: 'Revisión por la Alta Dirección', icon: 'eye-outline', route: '/gestion-sst/plan-mejora' }
    ]
  },
  {
    id: 'actuar',
    label: 'ACTUAR',
    phvaGroup: 'A',
    children: [
      { id: 'acciones-correctivas', label: 'Acciones Correctivas', icon: 'construct-outline', route: '/gestion-sst/incidentes/registro' },
      { id: 'acciones-preventivas', label: 'Acciones Preventivas', icon: 'shield-outline', route: '/gestion-sst/incidentes/actos-condiciones' },
      { id: 'mejora-continua', label: 'Mejora Continua', icon: 'trending-up-outline', route: '/gestion-sst/plan-mejora' }
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos',
    subtitle: 'Gestión Documental',
    icon: 'folder-outline',
    isUtility: true,
    route: '/documentos/controlados/politicas'
  },
  {
    id: 'reportes',
    label: 'Reportes',
    subtitle: 'Informes y Estadísticas',
    icon: 'bar-chart-outline',
    isUtility: true,
    route: '/reportes/indicadores'
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    subtitle: 'Administración del Sistema',
    icon: 'settings-outline',
    isUtility: true,
    route: '/configuracion/ajustes'
  },
  {
    id: 'ayuda',
    label: 'Ayuda y Soporte',
    subtitle: 'Centro de Ayuda',
    icon: 'help-circle-outline',
    isUtility: true
  }
];
