import { Component, Input } from '@angular/core';

interface Activity {
  id: number;
  title: string;
  description: string;
  time: string;
  type: 'inspection' | 'incident' | 'training' | 'document' | 'audit';
  status: 'completed' | 'pending' | 'in-progress';
}

@Component({
  selector: 'app-recent-activity',
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.scss'],
  standalone: false
})
export class RecentActivityComponent {
  @Input() activities: Activity[] = [];

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'inspection': 'search-outline',
      'incident': 'warning-outline',
      'training': 'school-outline',
      'document': 'document-text-outline',
      'audit': 'clipboard-outline'
    };
    return icons[type] || 'ellipse-outline';
  }

  getTypeBgColor(type: string): string {
    const colors: { [key: string]: string } = {
      'inspection': 'bg-blue-500/20',
      'incident': 'bg-red-500/20',
      'training': 'bg-green-500/20',
      'document': 'bg-purple-500/20',
      'audit': 'bg-yellow-500/20'
    };
    return colors[type] || 'bg-gray-500/20';
  }

  getTypeIconColor(type: string): string {
    const colors: { [key: string]: string } = {
      'inspection': 'text-blue-400',
      'incident': 'text-red-400',
      'training': 'text-green-400',
      'document': 'text-purple-400',
      'audit': 'text-yellow-400'
    };
    return colors[type] || 'text-gray-400';
  }

  getStatusBadge(status: string): { text: string; class: string } {
    const badges: { [key: string]: { text: string; class: string } } = {
      'completed': { text: 'Completado', class: 'bg-green-500/20 text-green-400' },
      'pending': { text: 'Pendiente', class: 'bg-yellow-500/20 text-yellow-400' },
      'in-progress': { text: 'En progreso', class: 'bg-blue-500/20 text-blue-400' }
    };
    return badges[status] || { text: status, class: 'bg-gray-500/20 text-gray-400' };
  }
}
