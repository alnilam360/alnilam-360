import { Component, Input, OnInit } from '@angular/core';

interface Detail {
  label: string;
  value: string;
  trend: string | null;
}

@Component({
  selector: 'app-progress-gauge',
  templateUrl: './progress-gauge.component.html',
  styleUrls: ['./progress-gauge.component.scss'],
  standalone: false
})
export class ProgressGaugeComponent implements OnInit {
  @Input() percentage: number = 0;
  @Input() target: number = 100;
  @Input() description: string = '';
  @Input() details: Detail[] = [];

  dashOffset: number = 0;
  circumference: number = 251.2; // 2 * PI * 40 (radius)

  ngOnInit(): void {
    this.calculateDashOffset();
  }

  private calculateDashOffset(): void {
    const progress = this.percentage / 100;
    this.dashOffset = this.circumference * (1 - progress * 0.75); // 75% of circle
  }

  getStatusColor(): string {
    if (this.percentage >= this.target) return 'text-green-400';
    if (this.percentage >= this.target * 0.8) return 'text-brand-primary';
    if (this.percentage >= this.target * 0.6) return 'text-yellow-400';
    return 'text-red-400';
  }

  getGaugeColor(): string {
    if (this.percentage >= this.target) return '#10b981';
    if (this.percentage >= this.target * 0.8) return '#3b82f6';
    if (this.percentage >= this.target * 0.6) return '#f59e0b';
    return '#ef4444';
  }
}
