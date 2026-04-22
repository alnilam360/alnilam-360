import { Component, OnInit } from '@angular/core';

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: string;
  iconBg: string;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  time: string;
  type: 'inspection' | 'incident' | 'training' | 'document' | 'audit';
  status: 'completed' | 'pending' | 'in-progress';
}

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  standalone: false
})
export class DashboardPageComponent implements OnInit {
  
  statCards: StatCard[] = [
    {
      title: 'Inspecciones Realizadas',
      value: 156,
      change: 12.5,
      changeType: 'increase',
      icon: 'search-outline',
      iconBg: 'bg-blue-500/20'
    },
    {
      title: 'Incidentes Reportados',
      value: 23,
      change: 8.2,
      changeType: 'decrease',
      icon: 'warning-outline',
      iconBg: 'bg-red-500/20'
    },
    {
      title: 'Capacitaciones',
      value: 45,
      change: 15.3,
      changeType: 'increase',
      icon: 'school-outline',
      iconBg: 'bg-green-500/20'
    },
    {
      title: 'Personal Activo',
      value: 1248,
      change: 3.1,
      changeType: 'increase',
      icon: 'people-outline',
      iconBg: 'bg-purple-500/20'
    }
  ];

  monthlyData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    inspections: [65, 78, 90, 81, 56, 55, 40, 89, 96, 110, 85, 92],
    incidents: [12, 8, 15, 10, 7, 9, 5, 11, 8, 6, 4, 7]
  };

  complianceData = {
    percentage: 87.5,
    target: 95,
    description: 'Cumplimiento del plan SST anual',
    details: [
      { label: 'Meta Anual', value: '95%', trend: null },
      { label: 'Mes Anterior', value: '82%', trend: 'up' },
      { label: 'Tendencia', value: '+5.5%', trend: 'up' }
    ]
  };

  recentActivities: Activity[] = [
    {
      id: 1,
      title: 'Inspección de seguridad completada',
      description: 'Área de producción - Planta Norte',
      time: 'Hace 30 min',
      type: 'inspection',
      status: 'completed'
    },
    {
      id: 2,
      title: 'Nuevo incidente reportado',
      description: 'Caída desde altura - Nivel bajo',
      time: 'Hace 2 horas',
      type: 'incident',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Capacitación en progreso',
      description: 'Manejo de extintores - 25 participantes',
      time: 'Hace 3 horas',
      type: 'training',
      status: 'in-progress'
    },
    {
      id: 4,
      title: 'Documento aprobado',
      description: 'Procedimiento de trabajo en alturas v2.0',
      time: 'Hace 5 horas',
      type: 'document',
      status: 'completed'
    },
    {
      id: 5,
      title: 'Auditoría programada',
      description: 'Auditoría interna ISO 45001 - Próxima semana',
      time: 'Hace 1 día',
      type: 'audit',
      status: 'pending'
    }
  ];

  quickActions = [
    { label: 'Nueva Inspección', icon: 'add-circle-outline', color: 'primary' },
    { label: 'Reportar Incidente', icon: 'alert-circle-outline', color: 'danger' },
    { label: 'Programar Capacitación', icon: 'calendar-outline', color: 'success' },
    { label: 'Subir Documento', icon: 'cloud-upload-outline', color: 'warning' }
  ];

  constructor() { }

  ngOnInit(): void { }
}
