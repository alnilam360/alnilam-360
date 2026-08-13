import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService, AuthState } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';

interface KpiCard {
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

interface KeyIndicator {
  label: string;
  value: string;
  trendDir: 'up' | 'down';
  trendPct: string;
  trendGood: boolean;
  sparkPoints: string;
  isBad: boolean;
}

interface UpcomingActivity {
  day: string;
  month: string;
  title: string;
  type: string;
}

interface ComplianceStandard {
  label: string;
  value: number;
  color: string;
}

interface DashAlert {
  icon: string;
  title: string;
  detail: string;
  when: string;
  severity: 'danger' | 'warning' | 'info';
}

interface QuickAccessAction {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

interface PhvaPhase {
  letter: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  standalone: false
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  userName = '';
  private subscription = new Subscription();

  phvaPhases: PhvaPhase[] = [
    { letter: 'P', label: 'Planear', color: '#3b82f6' },
    { letter: 'H', label: 'Hacer', color: '#10b981' },
    { letter: 'V', label: 'Verificar', color: '#8b5cf6' },
    { letter: 'A', label: 'Actuar', color: '#f59e0b' }
  ];

  kpiCards: KpiCard[] = [
    {
      label: 'Cumplimiento Est. Mínimos 0312',
      value: '92%',
      status: 'Aceptable',
      statusColor: '#10b981',
      icon: 'shield-checkmark-outline',
      iconColor: '#10b981',
      iconBg: 'rgba(16,185,129,0.15)',
      progress: 92,
      progressColor: '#10b981'
    },
    {
      label: 'Actividades del Plan',
      value: '78%',
      status: 'Completadas',
      statusColor: '#3b82f6',
      icon: 'clipboard-outline',
      iconColor: '#3b82f6',
      iconBg: 'rgba(59,130,246,0.15)',
      progress: 78,
      progressColor: '#3b82f6'
    },
    {
      label: 'Indicadores Clave',
      value: '10 / 12',
      status: 'En meta',
      statusColor: '#8b5cf6',
      icon: 'pulse-outline',
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139,92,246,0.15)',
      progress: 83,
      progressColor: '#8b5cf6'
    },
    {
      label: 'Documentos Vigentes',
      value: '156',
      status: 'Actualizados',
      statusColor: '#f59e0b',
      icon: 'document-text-outline',
      iconColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.15)',
      progress: 78,
      progressColor: '#f59e0b'
    },
    {
      label: 'Participación Colaboradores',
      value: '85%',
      status: 'Activa',
      statusColor: '#06b6d4',
      icon: 'people-outline',
      iconColor: '#06b6d4',
      iconBg: 'rgba(6,182,212,0.15)',
      progress: 85,
      progressColor: '#06b6d4'
    }
  ];

  keyIndicators: KeyIndicator[] = [
    {
      label: 'Frecuencia de AT',
      value: '2,1',
      trendDir: 'down',
      trendPct: '15%',
      trendGood: true,
      sparkPoints: '0,24 8,20 16,18 24,22 32,14 44,10 56,8',
      isBad: false
    },
    {
      label: 'Severidad de AT',
      value: '45',
      trendDir: 'up',
      trendPct: '8%',
      trendGood: false,
      sparkPoints: '0,16 8,18 16,14 24,18 32,22 44,24 56,26',
      isBad: true
    },
    {
      label: 'Ausentismo',
      value: '3,2%',
      trendDir: 'down',
      trendPct: '5%',
      trendGood: true,
      sparkPoints: '0,20 8,22 16,18 24,16 32,18 44,14 56,12',
      isBad: false
    },
    {
      label: 'Cumplimiento Plan',
      value: '92%',
      trendDir: 'up',
      trendPct: '6%',
      trendGood: true,
      sparkPoints: '0,28 8,24 16,22 24,18 32,14 44,10 56,8',
      isBad: false
    }
  ];

  upcomingActivities: UpcomingActivity[] = [
    { day: '12', month: 'MAY', title: 'Capacitación trabajo seguro en alturas', type: 'Programada' },
    { day: '15', month: 'MAY', title: 'Inspección de condiciones locativas', type: 'Programada' },
    { day: '20', month: 'MAY', title: 'Revisión por la Alta Dirección', type: 'Programada' }
  ];

  complianceStandards: ComplianceStandard[] = [
    { label: 'Recursos', value: 100, color: '#10b981' },
    { label: 'Gestión Integral', value: 92, color: '#3b82f6' },
    { label: 'Salud en el Trabajo', value: 93, color: '#06b6d4' },
    { label: 'Peligros y Riesgos', value: 90, color: '#ef4444' },
    { label: 'Amenazas', value: 96, color: '#8b5cf6' },
    { label: 'Verificación', value: 94, color: '#f59e0b' },
    { label: 'Mejoramiento', value: 95, color: '#64748b' }
  ];

  dashAlerts: DashAlert[] = [
    { icon: 'warning-outline', title: 'Matriz Legal', detail: '2 documentos próximos a vencer', when: 'Hoy', severity: 'danger' },
    { icon: 'school-outline', title: 'Capacitación', detail: '5 capacitaciones pendientes', when: 'Ayer', severity: 'warning' },
    { icon: 'search-outline', title: 'Inspecciones', detail: '3 inspecciones vencidas', when: '2 días', severity: 'info' }
  ];

  quickAccessActions: QuickAccessAction[] = [
    { label: 'Reportar Condición', icon: 'warning-outline', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
    { label: 'Reportar Acto Inseguro', icon: 'alert-circle-outline', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
    { label: 'Investigación de AT', icon: 'search-outline', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
    { label: 'Inspecciones', icon: 'clipboard-outline', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
    { label: 'Capacitaciones', icon: 'school-outline', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
    { label: 'Documentos', icon: 'folder-open-outline', color: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
    { label: 'Emergencias', icon: 'medical-outline', color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)' },
    { label: 'Buzón Sugerencias', icon: 'mail-outline', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
    { label: 'Normatividad', icon: 'scale-outline', color: '#64748b', bgColor: 'rgba(100,116,139,0.15)' }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.authService.authState$.subscribe((state: AuthState) => {
        if (state.perfil?.nombre) {
          this.userName = state.perfil.nombre.split(' ')[0];
        } else if (state.user?.email) {
          this.userName = state.user.email.split('@')[0];
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  isGoodTrend(ind: KeyIndicator): boolean {
    return (ind.trendDir === 'up') === ind.trendGood;
  }

  getSparkColor(ind: KeyIndicator): string {
    return this.isGoodTrend(ind) ? '#10b981' : '#ef4444';
  }
}
