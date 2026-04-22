import { Component, Input } from '@angular/core';

interface QuickAction {
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss'],
  standalone: false
})
export class QuickActionsComponent {
  @Input() actions: QuickAction[] = [];

  getColorClasses(color: string): { bg: string; hover: string; text: string } {
    const colors: { [key: string]: { bg: string; hover: string; text: string } } = {
      'primary': { bg: 'bg-blue-500/20', hover: 'hover:bg-blue-500/30', text: 'text-blue-400' },
      'success': { bg: 'bg-green-500/20', hover: 'hover:bg-green-500/30', text: 'text-green-400' },
      'danger': { bg: 'bg-red-500/20', hover: 'hover:bg-red-500/30', text: 'text-red-400' },
      'warning': { bg: 'bg-yellow-500/20', hover: 'hover:bg-yellow-500/30', text: 'text-yellow-400' },
      'info': { bg: 'bg-cyan-500/20', hover: 'hover:bg-cyan-500/30', text: 'text-cyan-400' }
    };
    return colors[color] || colors['primary'];
  }

  upcomingTasks = [
    { title: 'Inspección Área B', date: 'Mañana, 9:00 AM', priority: 'high' },
    { title: 'Capacitación EPP', date: 'Vie, 14:00', priority: 'medium' },
    { title: 'Revisión documentos', date: 'Lun próximo', priority: 'low' }
  ];

  getPriorityClass(priority: string): string {
    const classes: { [key: string]: string } = {
      'high': 'bg-red-500',
      'medium': 'bg-yellow-500',
      'low': 'bg-green-500'
    };
    return classes[priority] || 'bg-gray-500';
  }
}
