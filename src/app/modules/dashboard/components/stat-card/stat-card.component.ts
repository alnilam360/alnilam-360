import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  standalone: false
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = 0;
  @Input() change: number = 0;
  @Input() changeType: 'increase' | 'decrease' = 'increase';
  @Input() icon: string = 'analytics-outline';
  @Input() iconBg: string = 'bg-blue-500/20';
}
