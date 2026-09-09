import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConteoEtiqueta } from '../../../../core/models/matriz-at.model';

type ZonaKey =
  | 'cabeza' | 'ojos' | 'cuello' | 'hombros' | 'brazos' | 'manos'
  | 'tronco' | 'abdomen' | 'piernas' | 'pies' | 'general';

/**
 * Silueta humana (frente/espalda) con zonas coloreadas por frecuencia de lesión.
 * Componente standalone reutilizable. Emite la zona al hacer clic.
 */
@Component({
  selector: 'app-body-heatmap',
  standalone: false,
  template: `
    <div class="bg-dark-secondary border border-dark-border rounded-xl p-4 h-full flex flex-col">
      <div class="flex items-center gap-2 mb-3">
        <ion-icon name="body-outline" class="text-brand-primary"></ion-icon>
        <span class="text-[10px] uppercase tracking-wider text-dark-text font-semibold">Mapa corporal de lesiones</span>
      </div>

      <div class="flex-1 flex items-center justify-center gap-6">
        <!-- Frente -->
        <svg viewBox="0 0 120 260" class="h-56 w-auto" role="img" aria-label="Silueta frontal">
          <g stroke="rgb(var(--color-dark-border))" stroke-width="1">
            <circle [attr.fill]="fill('cabeza')" cx="60" cy="24" r="18" (click)="pick('cabeza')" class="cursor-pointer"/>
            <circle [attr.fill]="fill('ojos')" cx="53" cy="22" r="3" (click)="pick('ojos')" class="cursor-pointer"/>
            <circle [attr.fill]="fill('ojos')" cx="67" cy="22" r="3" (click)="pick('ojos')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('cuello')" x="53" y="42" width="14" height="10" (click)="pick('cuello')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('hombros')" x="34" y="52" width="52" height="12" rx="6" (click)="pick('hombros')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('tronco')" x="42" y="64" width="36" height="46" rx="6" (click)="pick('tronco')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('abdomen')" x="44" y="110" width="32" height="30" rx="6" (click)="pick('abdomen')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('brazos')" x="26" y="64" width="14" height="60" rx="7" (click)="pick('brazos')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('brazos')" x="80" y="64" width="14" height="60" rx="7" (click)="pick('brazos')" class="cursor-pointer"/>
            <circle [attr.fill]="fill('manos')" cx="33" cy="132" r="8" (click)="pick('manos')" class="cursor-pointer"/>
            <circle [attr.fill]="fill('manos')" cx="87" cy="132" r="8" (click)="pick('manos')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('piernas')" x="45" y="140" width="14" height="80" rx="7" (click)="pick('piernas')" class="cursor-pointer"/>
            <rect [attr.fill]="fill('piernas')" x="61" y="140" width="14" height="80" rx="7" (click)="pick('piernas')" class="cursor-pointer"/>
            <ellipse [attr.fill]="fill('pies')" cx="52" cy="228" rx="9" ry="6" (click)="pick('pies')" class="cursor-pointer"/>
            <ellipse [attr.fill]="fill('pies')" cx="68" cy="228" rx="9" ry="6" (click)="pick('pies')" class="cursor-pointer"/>
          </g>
        </svg>

        <!-- Leyenda -->
        <div class="flex flex-col gap-1 text-[10px] text-dark-text">
          <span class="uppercase tracking-wider font-semibold mb-1">Frecuencia</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:rgba(239,68,68,0.85)"></span> alta</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:rgba(239,68,68,0.45)"></span> media</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm" style="background:rgba(239,68,68,0.2)"></span> baja</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-dark-accent"></span> sin casos</span>
        </div>
      </div>

      <p *ngIf="total === 0" class="text-[10px] text-dark-text text-center mt-2">Sin casos con parte del cuerpo registrada en el período.</p>
    </div>
  `,
})
export class BodyHeatmapComponent {
  @Input() set conteos(list: ConteoEtiqueta[]) {
    this.mapa = new Map();
    this.mapaIds = new Map();
    this.total = 0;
    for (const c of list) {
      const z = this.zonaDe(c.label);
      this.mapa.set(z, (this.mapa.get(z) ?? 0) + c.count);
      if (c.id) this.mapaIds.set(z, [...(this.mapaIds.get(z) ?? []), c.id]);
      this.total += c.count;
    }
    this.max = Math.max(1, ...this.mapa.values());
  }
  @Output() regionSelect = new EventEmitter<{ zona: ZonaKey; count: number; ids: string[] }>();

  private mapa = new Map<ZonaKey, number>();
  private mapaIds = new Map<ZonaKey, string[]>();
  private max = 1;
  total = 0;

  fill(z: ZonaKey): string {
    const n = this.mapa.get(z) ?? 0;
    if (n === 0) return 'rgb(var(--color-dark-accent))';
    const op = 0.2 + 0.65 * (n / this.max);
    return `rgba(239,68,68,${op.toFixed(2)})`;
  }

  pick(z: ZonaKey): void {
    this.regionSelect.emit({ zona: z, count: this.mapa.get(z) ?? 0, ids: this.mapaIds.get(z) ?? [] });
  }

  private zonaDe(label: string): ZonaKey {
    const s = (label ?? '').toLowerCase();
    if (s.includes('ojo')) return 'ojos';
    if (s.includes('cabeza') || s.includes('craneo') || s.includes('cráneo') || s.includes('cara') || s.includes('oído') || s.includes('oido')) return 'cabeza';
    if (s.includes('cuello')) return 'cuello';
    if (s.includes('hombro')) return 'hombros';
    if (s.includes('mano') || s.includes('dedo') || s.includes('pulgar') || s.includes('muñeca') || s.includes('muneca')) return 'manos';
    if (s.includes('miembros superiores') || s.includes('brazo') || s.includes('codo')) return 'brazos';
    if (s.includes('espalda') || s.includes('lumbar') || s.includes('columna') || s.includes('abdomen')) return 'abdomen';
    if (s.includes('torax') || s.includes('tórax') || s.includes('pecho') || s.includes('tronco') || s.includes('costilla')) return 'tronco';
    if (s.includes('pie') || s.includes('talon') || s.includes('talón')) return 'pies';
    if (s.includes('miembros inferiores') || s.includes('pierna') || s.includes('rodilla') || s.includes('muslo') || s.includes('tobillo')) return 'piernas';
    return 'general';
  }
}
