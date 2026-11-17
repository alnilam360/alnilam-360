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
    icon: 'pi-home',
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
      { id: 'politica-objetivos', label: 'Política, Objetivos y Metas', icon: 'pi-flag', route: '/documentos/controlados/politicas' },
      { id: 'evaluacion-inicial', label: 'Evaluación Inicial', icon: 'pi-clipboard', route: '/gestion-sst/evaluaciones' },
      { id: 'plan-anual-trabajo', label: 'Plan Anual de Trabajo', icon: 'pi-calendar', route: '/gestion-sst/planes/plan-trabajo' },
      { id: 'matriz-legal', label: 'Matriz Legal', icon: 'pi-file', route: '/matriz-legal' },
      { id: 'recursos-responsables', label: 'Recursos y Responsables', icon: 'pi-users', route: '/personal/roles' }
    ]
  },
  {
    id: 'hacer',
    label: 'HACER',
    phvaGroup: 'H',
    children: [
      { id: 'gestion-peligros', label: 'Gestión de Peligros y Riesgos', icon: 'pi-exclamation-triangle', route: '/gestion-sst/matriz-iperc' },
      { id: 'gestion-salud', label: 'Gestión de la Salud', icon: 'pi-heart', route: '/formatos/seguimiento-examenes' },
      { id: 'capacitacion-competencias', label: 'Capacitación y Competencias', icon: 'pi-book', route: '/gestion-sst/planes/capacitaciones' },
      { id: 'contratistas-proveedores', label: 'Contratistas y Proveedores', icon: 'pi-building', route: '/personal/asignaciones' },
      { id: 'comunicacion-participacion', label: 'Comunicación y Participación', icon: 'pi-megaphone', route: '/gestion-sst/planes/estilos-vida' }
    ]
  },
  {
    id: 'verificar',
    label: 'VERIFICAR',
    phvaGroup: 'V',
    children: [
      {
        id: 'indicadores-grupo',
        label: 'Matriz de Indicadores',
        icon: 'pi-chart-bar',
        children: [
          { id: 'ind-matriz-consolidada', label: '0. Matriz de Indicadores', icon: 'pi-th-large', route: '/indicadores/matriz-indicadores' },
          { id: 'ind-accidentalidad', label: '1. Accidentalidad (AT)', icon: 'pi-bolt', route: '/indicadores/accidentalidad' },
          { id: 'ind-enfermedad-laboral', label: '2. Enfermedad Laboral (EL)', icon: 'pi-heart', route: '/indicadores/enfermedad-laboral' },
          { id: 'ind-ausentismo', label: '3. Ausentismo Laboral', icon: 'pi-clock', route: '/indicadores/ausentismo' },
          { id: 'ind-sg-sst', label: '4. Estructura, Proceso y Resultado', icon: 'pi-chart-pie', route: '/indicadores/sg-sst' }
        ]
      },
      { id: 'auditorias-inspecciones', label: 'Auditorías e Inspecciones', icon: 'pi-check-square', route: '/auditorias' },
      { id: 'investigacion-atel', label: 'Investigación de AT/EL', icon: 'pi-search', route: '/investigacion-atel' },
      { id: 'revision-alta-direccion', label: 'Revisión por la Alta Dirección', icon: 'pi-eye' }
    ]
  },
  {
    id: 'actuar',
    label: 'ACTUAR',
    phvaGroup: 'A',
    children: [
      { id: 'acciones-correctivas', label: 'Acciones Correctivas', icon: 'pi-wrench', route: '/acciones-correctivas' },
      { id: 'acciones-preventivas', label: 'Acciones Preventivas', icon: 'pi-shield', route: '/gestion-sst/incidentes/actos-condiciones' },
      { id: 'mejora-continua', label: 'Mejora Continua', icon: 'pi-arrow-up', route: '/gestion-sst/plan-mejora' }
    ]
  },
  {
    id: 'documentos',
    label: 'Documentos',
    subtitle: 'Gestión Documental',
    icon: 'pi-folder',
    isUtility: true,
    route: '/documentos/controlados/politicas'
  },
  {
    id: 'reportes',
    label: 'Reportes',
    subtitle: 'Informes y Estadísticas',
    icon: 'pi-chart-bar',
    isUtility: true,
    route: '/reportes/indicadores'
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    subtitle: 'Administración del Sistema',
    icon: 'pi-cog',
    isUtility: true,
    children: [
      { id: 'conf-empresas', label: 'Empresas', icon: 'pi-building', route: '/configuracion/empresas' },
      { id: 'conf-roles', label: 'Roles', icon: 'pi-shield', route: '/configuracion/roles' },
      { id: 'conf-usuarios', label: 'Usuarios', icon: 'pi-users', route: '/configuracion/usuarios' },
      { id: 'conf-trabajadores', label: 'Trabajadores', icon: 'pi-users', route: '/configuracion/trabajadores' },
      { id: 'conf-cargos', label: 'Cargos', icon: 'pi-briefcase', route: '/configuracion/cargos' }
    ]
  },
  {
    id: 'presupuesto',
    label: 'Presupuesto',
    subtitle: 'Presupuesto y Finanzas',
    icon: 'pi-money-bill',
    isUtility: true,
    children: [
      { id: 'pres-resumen', label: 'Resumen del mes', icon: 'pi-chart-pie', route: '/presupuesto/resumen' },
      { id: 'pres-recaudo', label: 'Recaudo', icon: 'pi-money-bill', route: '/presupuesto/recaudo' },
      { id: 'pres-nomina', label: 'Nomina', icon: 'pi-users', route: '/presupuesto/nomina' },
      { id: 'pres-gastos', label: 'Gastos', icon: 'pi-credit-card', route: '/presupuesto/gastos' },
      { id: 'pres-cxp', label: 'Cuentas por pagar', icon: 'pi-receipt', route: '/presupuesto/cuentas-por-pagar' },
      { id: 'pres-socios', label: 'Socios', icon: 'pi-users', route: '/presupuesto/socios' },
      { id: 'pres-centros', label: 'Centros de costo', icon: 'pi-sitemap', route: '/presupuesto/centros-costo' },
      { id: 'pres-periodos', label: 'Periodos', icon: 'pi-calendar', route: '/presupuesto/periodos' },
      { id: 'pres-catalogo', label: 'Catalogo de rubros', icon: 'pi-list', route: '/presupuesto/catalogo' }
    ]
  },
  {
    id: 'ayuda',
    label: 'Ayuda y Soporte',
    subtitle: 'Centro de Ayuda',
    icon: 'pi-question-circle',
    isUtility: true
  }
];
