import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PoliticaSstEstado } from '../../../core/models/politica-sst.model';

export type AccionFlujo = 'enviar_revision' | 'devolver_borrador' | 'aprobar' | 'publicar' | 'nueva_version';

@Component({
  selector: 'app-documento-flujo-aprobacion',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-dark-secondary/60 border border-dark-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <!-- Steps Indicator -->
      <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
        @for (step of steps; track step.key) {
          <div class="flex items-center gap-2">
            <div
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200"
              [ngClass]="getStepClasses(step.key)"
            >
              <ion-icon [name]="step.icon" class="text-sm shrink-0"></ion-icon>
              <span>{{ step.label }}</span>
            </div>
            @if (!$last) {
              <ion-icon name="chevron-forward-outline" class="text-slate-600 text-xs"></ion-icon>
            }
          </div>
        }

        @if (estado() === 'obsoleto') {
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 ml-2">
            <ion-icon name="archive-outline" class="text-sm"></ion-icon>
            <span>Versión Obsoleta</span>
          </div>
        }
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
        @if (estado() === 'borrador') {
          <button
            type="button"
            (click)="onAccion('enviar_revision')"
            [disabled]="disabled() || !canSendRevision()"
            class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-blue-600/20 transition-all duration-200"
          >
            <ion-icon name="paper-plane-outline" class="text-sm"></ion-icon>
            <span>Enviar a Revisión</span>
          </button>
        }

        @if (estado() === 'en_revision') {
          <button
            type="button"
            (click)="onAccion('devolver_borrador')"
            [disabled]="disabled()"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 transition-all duration-200"
          >
            <ion-icon name="arrow-undo-outline" class="text-sm"></ion-icon>
            <span>Devolver a Borrador</span>
          </button>

          <button
            type="button"
            (click)="onAccion('aprobar')"
            [disabled]="disabled() || !canAprobar()"
            class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-emerald-600/20 transition-all duration-200"
          >
            <ion-icon name="checkmark-done-outline" class="text-sm"></ion-icon>
            <span>Aprobar (Firma Rep. Legal)</span>
          </button>
        }

        @if (estado() === 'aprobado') {
          <button
            type="button"
            (click)="onAccion('publicar')"
            [disabled]="disabled()"
            class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all duration-200"
          >
            <ion-icon name="megaphone-outline" class="text-sm"></ion-icon>
            <span>Publicar como Vigente</span>
          </button>
        }

        @if (estado() === 'publicado' || estado() === 'obsoleto') {
          <button
            type="button"
            (click)="onAccion('nueva_version')"
            [disabled]="disabled()"
            class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-primary hover:bg-blue-600 text-white shadow-md shadow-brand-primary/20 transition-all duration-200"
          >
            <ion-icon name="add-circle-outline" class="text-sm"></ion-icon>
            <span>+ Crear Nueva Versión</span>
          </button>
        }
      </div>
    </div>
  `
})
export class DocumentoFlujoAprobacionComponent {
  readonly estado = input.required<PoliticaSstEstado>();
  readonly canSendRevision = input<boolean>(true);
  readonly canAprobar = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  readonly accion = output<AccionFlujo>();

  readonly steps = [
    { key: 'borrador', label: '1. Borrador', icon: 'create-outline' },
    { key: 'en_revision', label: '2. En Revisión', icon: 'eye-outline' },
    { key: 'aprobado', label: '3. Aprobado', icon: 'shield-checkmark-outline' },
    { key: 'publicado', label: '4. Publicado', icon: 'checkmark-circle-outline' }
  ];

  getStepClasses(stepKey: string): string {
    const actual = this.estado();
    const rankMap: Record<string, number> = {
      borrador: 1,
      en_revision: 2,
      aprobado: 3,
      publicado: 4,
      obsoleto: 5
    };

    const currentRank = rankMap[actual] || 1;
    const stepRank = rankMap[stepKey] || 1;

    if (actual === stepKey) {
      if (actual === 'publicado') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 ring-1 ring-emerald-500/50';
      if (actual === 'aprobado') return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 ring-1 ring-indigo-500/50';
      if (actual === 'en_revision') return 'bg-amber-500/20 text-amber-400 border-amber-500/50 ring-1 ring-amber-500/50';
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50 ring-1 ring-blue-500/50';
    }

    if (stepRank < currentRank) {
      return 'bg-slate-800/80 text-emerald-400/80 border-slate-700/60';
    }

    return 'bg-slate-900/40 text-slate-500 border-slate-800';
  }

  onAccion(tipo: AccionFlujo): void {
    this.accion.emit(tipo);
  }
}
