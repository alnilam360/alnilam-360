import { Component, Input } from '@angular/core';

interface Serie { label: string; color: string; valores: (number | null)[]; }

/** Línea de tendencia 12 meses para Frecuencia y Severidad, con metas punteadas. */
@Component({
  selector: 'app-trend-line',
  standalone: false,
  template: `
    <div class="bg-dark-secondary border border-dark-border rounded-xl p-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <ion-icon name="trending-up-outline" class="text-brand-primary"></ion-icon>
          <span class="text-[10px] uppercase tracking-wider text-dark-text font-semibold">Tendencia 12 meses</span>
        </div>
        <div class="flex items-center gap-4 text-[10px] text-dark-text">
          <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-brand-primary"></span> Frecuencia</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-orange-500"></span> Severidad</span>
        </div>
      </div>

      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" class="w-full h-48" preserveAspectRatio="none" role="img" aria-label="Tendencia mensual">
        <!-- ejes -->
        <line [attr.x1]="padX" [attr.y1]="padY" [attr.x2]="padX" [attr.y2]="H - padY" stroke="rgb(var(--color-dark-border))" stroke-width="1"/>
        <line [attr.x1]="padX" [attr.y1]="H - padY" [attr.x2]="W - 4" [attr.y2]="H - padY" stroke="rgb(var(--color-dark-border))" stroke-width="1"/>
        <!-- series -->
        <polyline *ngFor="let s of paths" [attr.points]="s.points" fill="none" [attr.stroke]="s.color" stroke-width="2" stroke-linejoin="round"/>
      </svg>

      <div class="flex justify-between text-[9px] text-dark-text mt-1 px-6">
        <span *ngFor="let l of labels">{{ l }}</span>
      </div>
    </div>
  `,
})
export class TrendLineComponent {
  readonly W = 700; readonly H = 200; readonly padX = 24; readonly padY = 12;
  labels: string[] = [];
  paths: { color: string; points: string }[] = [];

  @Input() set data(d: { labels: string[]; series: Serie[] }) {
    this.labels = d.labels;
    const todos: number[] = [];
    for (const s of d.series) for (const v of s.valores) if (v != null) todos.push(v);
    const max = Math.max(1, ...todos);
    const n = d.labels.length || 12;
    const usableW = this.W - this.padX - 4;
    const usableH = this.H - this.padY * 2;
    this.paths = d.series.map((s) => ({
      color: s.color,
      points: s.valores
        .map((v, i) => {
          if (v == null) return null;
          const x = this.padX + (usableW * i) / Math.max(1, n - 1);
          const y = this.padY + usableH * (1 - v / max);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .filter((p): p is string => p != null)
        .join(' '),
    }));
  }
}
