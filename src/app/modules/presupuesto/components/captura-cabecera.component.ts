import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Empresa } from '../../../core/models/models';
import { PresupuestoPeriodo } from '../../../core/models/presupuesto.model';

/** Cabecera de página de captura: título + selector de empresa (admin) y de periodo. */
@Component({
  selector: 'app-presupuesto-cabecera',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Finanzas · COP
          </span>
          <span class="font-mono text-[10px] text-dark-text">Presupuesto mensual</span>
        </div>
        <h1 class="text-xl font-bold text-[rgb(var(--color-heading))] flex items-center gap-2.5">
          <span class="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center text-brand-primary">
            <i class="pi text-lg" [ngClass]="icono"></i>
          </span>
          {{ titulo }}
        </h1>
        <p class="text-xs text-dark-text mt-0.5">{{ subtitulo }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div *ngIf="esAdmin && empresas.length > 1" class="min-w-[180px]">
          <select [ngModel]="empresaId" (ngModelChange)="empresaChange.emit($event)"
            class="w-full px-3 py-1.5 text-xs bg-dark-secondary border border-dark-border rounded-lg text-[rgb(var(--color-heading))] focus:outline-none focus:border-brand-primary">
            <option *ngFor="let e of empresas" [value]="e.id">{{ e.nombre }}</option>
          </select>
        </div>
        <div *ngIf="mostrarPeriodo" class="min-w-[160px]">
          <select [ngModel]="periodoId" (ngModelChange)="periodoChange.emit($event)"
            class="w-full px-3 py-1.5 text-xs bg-dark-secondary border border-dark-border rounded-lg text-[rgb(var(--color-heading))] focus:outline-none focus:border-brand-primary font-medium">
            <option *ngIf="periodos.length === 0" value="">Sin periodos</option>
            <option *ngFor="let p of periodos" [value]="p.id">{{ p.mes }}</option>
          </select>
        </div>
      </div>
    </div>`,
})
export class CapturaCabeceraComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() icono = 'pi-wallet';
  @Input() esAdmin = false;
  @Input() empresas: Empresa[] = [];
  @Input() empresaId = '';
  @Input() periodos: PresupuestoPeriodo[] = [];
  @Input() periodoId = '';
  @Input() mostrarPeriodo = true;
  @Output() empresaChange = new EventEmitter<string>();
  @Output() periodoChange = new EventEmitter<string>();
}
