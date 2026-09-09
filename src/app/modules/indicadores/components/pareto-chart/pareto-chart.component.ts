import { Component, Input } from '@angular/core';
import { ConteoEtiqueta } from '../../../../core/models/matriz-at.model';

/** Pareto: barras descendentes + porcentaje acumulado (regla 80/20). */
@Component({
  selector: 'app-pareto-chart',
  standalone: false,
  template: `
    <div class="bg-dark-secondary border border-dark-border rounded-xl p-4 h-full flex flex-col">
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <ion-icon name="bar-chart-outline" class="text-brand-primary"></ion-icon>
          <span class="text-[10px] uppercase tracking-wider text-dark-text font-semibold">{{ titulo }}</span>
        </div>
        <ng-content></ng-content>
      </div>

      <div *ngIf="filas.length === 0" class="flex-1 flex items-center justify-center">
        <p class="text-[11px] text-dark-text">Sin datos en el período.</p>
      </div>

      <div class="flex flex-col gap-2">
        <div *ngFor="let f of filas" class="flex items-center gap-2">
          <span class="text-[11px] text-[rgb(var(--color-heading))] w-24 truncate" [title]="f.label">{{ f.label }}</span>
          <div class="flex-1 h-4 bg-dark-accent rounded overflow-hidden">
            <div class="h-full rounded transition-all duration-500"
                 [class.bg-brand-primary]="!f.dentro80" [class.bg-amber-500]="f.dentro80"
                 [style.width]="f.width"></div>
          </div>
          <span class="text-[10px] text-dark-text tabular-nums w-6 text-right">{{ f.count }}</span>
          <span class="text-[10px] text-dark-text tabular-nums w-10 text-right">{{ f.acum }}%</span>
        </div>
      </div>

      <p *ngIf="filas.length > 0" class="text-[10px] text-dark-text mt-2">
        Barras ámbar = causas que acumulan el 80% de los casos.
      </p>
    </div>
  `,
})
export class ParetoChartComponent {
  @Input() titulo = 'Pareto';
  filas: { label: string; count: number; width: string; acum: number; dentro80: boolean }[] = [];

  @Input() set conteos(list: ConteoEtiqueta[]) {
    const total = list.reduce((s, c) => s + c.count, 0);
    const max = Math.max(1, ...list.map((c) => c.count));
    let acumCount = 0;
    let corte80Alcanzado = false;
    this.filas = list.map((c) => {
      acumCount += c.count;
      const acum = total > 0 ? Math.round((acumCount / total) * 100) : 0;
      const dentro80 = !corte80Alcanzado;
      if (acum >= 80) corte80Alcanzado = true;
      return { label: c.label, count: c.count, width: `${(c.count / max) * 100}%`, acum, dentro80 };
    });
  }
}
