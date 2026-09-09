import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConteoEtiqueta } from '../../../../core/models/matriz-at.model';

/** Barras por categoría (área/proceso) con drill-down al hacer clic. */
@Component({
  selector: 'app-bar-breakdown',
  standalone: false,
  template: `
    <div class="bg-dark-secondary border border-dark-border rounded-xl p-4 h-full flex flex-col">
      <div class="flex items-center gap-2 mb-3">
        <ion-icon [name]="icon" class="text-brand-primary"></ion-icon>
        <span class="text-[10px] uppercase tracking-wider text-dark-text font-semibold">{{ titulo }}</span>
      </div>

      <div *ngIf="filas.length === 0" class="flex-1 flex items-center justify-center">
        <p class="text-[11px] text-dark-text">Sin datos en el período.</p>
      </div>

      <div class="flex flex-col gap-2">
        <button *ngFor="let f of filas" (click)="barSelect.emit(f)"
                class="group flex items-center gap-2 text-left w-full rounded hover:bg-dark-accent/50 px-1 py-0.5 transition">
          <span class="text-[11px] text-[rgb(var(--color-heading))] w-24 truncate" [title]="f.label">{{ f.label }}</span>
          <div class="flex-1 h-4 bg-dark-accent rounded overflow-hidden">
            <div class="h-full bg-brand-primary rounded transition-all duration-500 group-hover:opacity-80" [style.width]="width(f.count)"></div>
          </div>
          <span class="text-[10px] text-dark-text tabular-nums w-6 text-right">{{ f.count }}</span>
        </button>
      </div>

      <p *ngIf="filas.length > 0" class="text-[10px] text-dark-text mt-2">Clic en una barra para filtrar los casos por {{ dimension }}.</p>
    </div>
  `,
})
export class BarBreakdownComponent {
  @Input() titulo = 'Por área';
  @Input() icon = 'grid-outline';
  @Input() dimension = 'área';
  @Input() set conteos(list: ConteoEtiqueta[]) {
    this.filas = list;
    this.max = Math.max(1, ...list.map((c) => c.count));
  }
  @Output() barSelect = new EventEmitter<ConteoEtiqueta>();

  filas: ConteoEtiqueta[] = [];
  private max = 1;
  width(count: number): string { return `${(count / this.max) * 100}%`; }
}
