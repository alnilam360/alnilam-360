import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Confirmación de borrado con el mismo overlay Tailwind que los formularios. */
@Component({
  selector: 'app-presupuesto-confirmar',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4"
      (click)="cancelar.emit()">
      <div class="relative w-full max-w-sm my-24 bg-dark-secondary border border-dark-border rounded-2xl shadow-2xl"
        (click)="$event.stopPropagation()">
        <div class="px-4 py-3 border-b border-dark-border">
          <h3 class="text-base font-semibold text-[rgb(var(--color-heading))]">Eliminar registro</h3>
        </div>
        <p class="px-4 py-4 text-xs text-dark-text">¿Eliminar <b class="text-[rgb(var(--color-heading))]">{{ nombre }}</b>? Esta acción no se puede deshacer.</p>
        <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-dark-border bg-dark-primary/50">
          <button (click)="cancelar.emit()"
            class="px-3 py-2 text-sm rounded-lg border border-dark-border text-[rgb(var(--color-heading))] hover:bg-dark-accent transition-all duration-200">
            Cancelar
          </button>
          <button (click)="confirmar.emit()" [disabled]="guardando"
            class="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
            Eliminar
          </button>
        </div>
      </div>
    </div>`,
})
export class CapturaConfirmarComponent {
  @Input() nombre = '';
  @Input() guardando = false;
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
