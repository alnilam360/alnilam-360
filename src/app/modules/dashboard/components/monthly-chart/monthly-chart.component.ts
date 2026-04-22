import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-monthly-chart',
  templateUrl: './monthly-chart.component.html',
  styleUrls: ['./monthly-chart.component.scss'],
  standalone: false
})
export class MonthlyChartComponent implements OnInit, AfterViewInit {
  @Input() labels: string[] = [];
  @Input() inspections: number[] = [];
  @Input() incidents: number[] = [];
  
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  maxValue: number = 0;
  chartBars: { label: string; inspection: number; incident: number; inspectionHeight: string; incidentHeight: string }[] = [];

  ngOnInit(): void {
    this.calculateChart();
  }

  ngAfterViewInit(): void {
    // Chart calculations already done in ngOnInit
  }

  private calculateChart(): void {
    this.maxValue = Math.max(...this.inspections, ...this.incidents) * 1.2;
    
    this.chartBars = this.labels.map((label, index) => ({
      label,
      inspection: this.inspections[index] || 0,
      incident: this.incidents[index] || 0,
      inspectionHeight: `${((this.inspections[index] || 0) / this.maxValue) * 100}%`,
      incidentHeight: `${((this.incidents[index] || 0) / this.maxValue) * 100}%`
    }));
  }

  getYAxisLabels(): number[] {
    const step = Math.ceil(this.maxValue / 4);
    return [0, step, step * 2, step * 3, Math.ceil(this.maxValue)].reverse();
  }
}
