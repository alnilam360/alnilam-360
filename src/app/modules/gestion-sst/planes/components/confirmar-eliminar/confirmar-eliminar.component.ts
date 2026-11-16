import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirmar-eliminar',
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-sm bg-dark-secondary border border-dark-border rounded-xl p-4 space-y-3">
        <h3 class="text-sm font-bold text-[rgb(var(--color-heading))]">Eliminar {{ etiqueta }}</h3>
        <p class="text-xs text-dark-text">Esta acción no se puede deshacer.</p>
        <p *ngIf="error" class="text-xs text-red-300">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" (click)="cancelado.emit()" [disabled]="eliminando"
                  class="px-3 py-2 min-h-10 text-xs rounded-lg border border-dark-border text-dark-text">Cancelar</button>
          <button type="button" (click)="confirmado.emit()" [disabled]="eliminando"
                  class="px-3 py-2 min-h-10 text-xs rounded-lg bg-red-500 text-white disabled:opacity-50">
            {{ eliminando ? 'Eliminando…' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ConfirmarEliminarComponent {
  @Input() etiqueta = '';
  @Input() eliminando = false;
  @Input() error: string | null = null;
  @Output() confirmado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();
}
