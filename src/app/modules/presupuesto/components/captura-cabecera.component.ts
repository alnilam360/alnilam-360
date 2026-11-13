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
        <h1 class="text-xl font-bold text-[rgb(var(--color-heading))] flex items-center gap-2">
          <i class="pi text-brand-primary text-2xl" [ngClass]="icono"></i>
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
        <div class="min-w-[160px]">
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
  @Output() empresaChange = new EventEmitter<string>();
  @Output() periodoChange = new EventEmitter<string>();
}
