import { Component, Input } from '@angular/core';
import { TrianguloBird } from '../../../../core/models/matriz-at.model';

/** Pirámide de Bird: mortal/grave/leve/casi-accidente del período. */
@Component({
  selector: 'app-bird-triangle',
  standalone: false,
  template: `
    <div class="bg-dark-secondary border border-dark-border rounded-xl p-4 h-full flex flex-col">
      <div class="flex items-center gap-2 mb-3">
        <ion-icon name="triangle-outline" class="text-brand-primary"></ion-icon>
        <span class="text-[10px] uppercase tracking-wider text-dark-text font-semibold">Triángulo de Bird</span>
      </div>

      <div class="flex-1 flex flex-col items-center justify-center gap-1.5 py-1">
        <div *ngFor="let r of filas"
             class="h-8 rounded flex items-center justify-between px-3 text-white text-xs font-semibold shadow-sm"
             [ngClass]="r.color" [style.width]="r.width">
          <span class="truncate">{{ r.label }}</span>
          <span class="tabular-nums">{{ r.count }}</span>
        </div>
      </div>

      <p class="text-[10px] text-dark-text text-center mt-2">
        Proporción {{ data.ratio }} · base ancha de casi-accidentes = mejor reporte temprano
      </p>
    </div>
  `,
})
export class BirdTriangleComponent {
  @Input() set triangulo(t: TrianguloBird) {
    this.data = t;
    const max = Math.max(t.mortal, t.grave, t.leve, t.casiAccidente, 1);
    const w = (n: number) => `${Math.max(22, Math.round((n / max) * 100))}%`;
    this.filas = [
      { label: 'Mortal', count: t.mortal, color: 'bg-red-500', width: w(t.mortal) },
      { label: 'Grave', count: t.grave, color: 'bg-orange-500', width: w(t.grave) },
      { label: 'Leve', count: t.leve, color: 'bg-amber-400', width: w(t.leve) },
      { label: 'Casi-accidente', count: t.casiAccidente, color: 'bg-cyan-500', width: w(t.casiAccidente) },
    ];
  }
  data: TrianguloBird = { mortal: 0, grave: 0, leve: 0, casiAccidente: 0, ratio: '0 : 0 : 0 : 0' };
  filas: { label: string; count: number; color: string; width: string }[] = [];
}
