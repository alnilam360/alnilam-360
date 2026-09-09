import { Component, Input } from '@angular/core';
import { IndicadorEstado } from '../../../../core/models/matriz-at.model';

/** Tarjeta KPI con badge de cumplimiento de meta (verde/ámbar/rojo). */
@Component({
  selector: 'app-kpi-card',
  standalone: false,
  template: `
    <div class="bg-dark-secondary border border-dark-border rounded-xl p-4 flex flex-col gap-1
                transition-all duration-200 hover:border-dark-text/30">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg flex items-center justify-center bg-dark-accent">
          <ion-icon [name]="icon" class="text-sm text-brand-primary"></ion-icon>
        </span>
        <span class="text-[10px] uppercase tracking-wider text-dark-text font-semibold">{{ label }}</span>
      </div>

      <div class="flex items-end gap-2 mt-1">
        <span class="text-2xl font-bold text-[rgb(var(--color-heading))] tabular-nums">
          {{ estado === 'ok' ? (valor | number:'1.0-2') : '—' }}<span *ngIf="estado === 'ok' && unidad" class="text-sm font-medium text-dark-text ml-0.5">{{ unidad }}</span>
        </span>
        <span *ngIf="estado === 'ok' && meta != null" class="mb-1 w-2.5 h-2.5 rounded-full flex-shrink-0" [ngClass]="badgeClass()"></span>
      </div>

      <p *ngIf="estado === 'ok' && meta != null" class="text-[10px] text-dark-text">meta {{ metaComparador }} {{ meta | number:'1.0-2' }}</p>
      <p *ngIf="estado === 'pendiente_parametros'" class="text-[10px] text-amber-400">Pendiente de parámetros del mes</p>
      <p *ngIf="estado === 'sin_datos'" class="text-[10px] text-dark-text">Sin datos suficientes</p>
      <p *ngIf="sub" class="text-[10px] text-dark-text">{{ sub }}</p>
    </div>
  `,
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() icon = 'stats-chart-outline';
  @Input() valor: number | null = null;
  @Input() unidad = '';
  @Input() estado: IndicadorEstado = 'sin_datos';
  @Input() meta: number | null = null;
  @Input() cumpleMeta: boolean | null = null;
  @Input() metaComparador = '≤';
  @Input() sub = '';

  badgeClass(): string {
    if (this.cumpleMeta === true) return 'bg-emerald-500';
    if (this.cumpleMeta === false) return 'bg-red-500';
    return 'bg-amber-400';
  }
}
