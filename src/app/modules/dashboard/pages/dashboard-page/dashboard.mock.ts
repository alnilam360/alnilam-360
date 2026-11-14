export interface KpiCard {
  label: string;
  value: string;
  status: string;
  statusColor: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  progress: number;
  progressColor: string;
}

export interface KeyIndicator {
  label: string;
  value: string;
  trendDir: 'up' | 'down';
  trendPct: string;
  trendGood: boolean;
  sparkPoints: string;
  isBad: boolean;
  /** Sin histórico real: oculta flecha, % y sparkline. */
  sinTendencia?: boolean;
}

export interface DashAlert {
  icon: string;
  title: string;
  detail: string;
  when: string;
  severity: 'danger' | 'warning' | 'info';
}

export interface QuickAccessAction {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface PhvaPhase {
  letter: string;
  label: string;
  color: string;
}

export const PHVA_PHASES: PhvaPhase[] = [
  { letter: 'P', label: 'Planear', color: '#3b82f6' },
  { letter: 'H', label: 'Hacer', color: '#10b981' },
  { letter: 'V', label: 'Verificar', color: '#8b5cf6' },
  { letter: 'A', label: 'Actuar', color: '#f59e0b' }
];

/** Colores por ciclo PHVA (mismos que la rueda del hero). */
export const COLOR_CICLO: Record<string, string> = {
  Planear: '#3b82f6',
  Hacer: '#10b981',
  Verificar: '#8b5cf6',
  Actuar: '#f59e0b'
};

// KPI reales (0312, Plan, Indicadores): placeholder mientras carga o si no hay datos.
export const KPI_0312_BASE: KpiCard = {
  label: 'Cumplimiento Est. Mínimos 0312', value: '—', status: 'Sin evaluación', statusColor: '#64748b',
  icon: 'pi-verified', iconColor: '#10b981', iconBg: 'rgba(16,185,129,0.15)',
  progress: 0, progressColor: '#10b981'
};
export const KPI_PLAN_BASE: KpiCard = {
  label: 'Actividades del Plan', value: '—', status: 'Sin plan', statusColor: '#64748b',
  icon: 'pi-clipboard', iconColor: '#3b82f6', iconBg: 'rgba(59,130,246,0.15)',
  progress: 0, progressColor: '#3b82f6'
};
export const KPI_INDICADORES_BASE: KpiCard = {
  label: 'Indicadores Clave', value: '—', status: 'Sin registros', statusColor: '#64748b',
  icon: 'pi-chart-line', iconColor: '#8b5cf6', iconBg: 'rgba(139,92,246,0.15)',
  progress: 0, progressColor: '#8b5cf6'
};

// mock: Documentos Vigentes — modulo/dato no disponible (plan 08)
// mock: Participación Colaboradores — modulo/dato no disponible (plan 08)
export const KPI_MOCK: KpiCard[] = [
  {
    label: 'Documentos Vigentes', value: '156', status: 'Actualizados', statusColor: '#f59e0b',
    icon: 'pi-file', iconColor: '#f59e0b', iconBg: 'rgba(245,158,11,0.15)',
    progress: 78, progressColor: '#f59e0b'
  },
  {
    label: 'Participación Colaboradores', value: '85%', status: 'Activa', statusColor: '#06b6d4',
    icon: 'pi-users', iconColor: '#06b6d4', iconBg: 'rgba(6,182,212,0.15)',
    progress: 85, progressColor: '#06b6d4'
  }
];

// mock: Frecuencia/Severidad de AT y Ausentismo — modulo/dato no disponible (plan 08)
export const KEY_INDICATORS_MOCK: KeyIndicator[] = [
  { label: 'Frecuencia de AT', value: '2,1', trendDir: 'down', trendPct: '15%', trendGood: true, sparkPoints: '0,24 8,20 16,18 24,22 32,14 44,10 56,8', isBad: false },
  { label: 'Severidad de AT', value: '45', trendDir: 'up', trendPct: '8%', trendGood: false, sparkPoints: '0,16 8,18 16,14 24,18 32,22 44,24 56,26', isBad: true },
  { label: 'Ausentismo', value: '3,2%', trendDir: 'down', trendPct: '5%', trendGood: true, sparkPoints: '0,20 8,22 16,18 24,16 32,18 44,14 56,12', isBad: false }
];

export const INDICADOR_PLAN_BASE: KeyIndicator = {
  label: 'Cumplimiento Plan', value: '—', trendDir: 'up', trendPct: '', trendGood: true,
  sparkPoints: '', isBad: false, sinTendencia: true
};

// mock: Alertas y Notificaciones — modulo/dato no disponible (plan 08)
export const DASH_ALERTS_MOCK: DashAlert[] = [
  { icon: 'pi-exclamation-triangle', title: 'Matriz Legal', detail: '2 documentos próximos a vencer', when: 'Hoy', severity: 'danger' },
  { icon: 'pi-book', title: 'Capacitación', detail: '5 capacitaciones pendientes', when: 'Ayer', severity: 'warning' },
  { icon: 'pi-search', title: 'Inspecciones', detail: '3 inspecciones vencidas', when: '2 días', severity: 'info' }
];

export const QUICK_ACCESS_ACTIONS: QuickAccessAction[] = [
  { label: 'Reportar Condición', icon: 'pi-exclamation-triangle', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
  { label: 'Reportar Acto Inseguro', icon: 'pi-exclamation-circle', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
  { label: 'Investigación de AT', icon: 'pi-search', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
  { label: 'Inspecciones', icon: 'pi-clipboard', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
  { label: 'Capacitaciones', icon: 'pi-book', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
  { label: 'Documentos', icon: 'pi-folder-open', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
  { label: 'Emergencias', icon: 'pi-heart', color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)' },
  { label: 'Buzón Sugerencias', icon: 'pi-envelope', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
  { label: 'Normatividad', icon: 'pi-chart-bar', color: '#64748b', bgColor: 'rgba(100,116,139,0.15)' }
];
