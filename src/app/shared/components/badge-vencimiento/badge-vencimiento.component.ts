import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AlertaVencimientoService } from '../../../core/services/alerta-vencimiento.service';

@Component({
  selector: 'app-badge-vencimiento',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (info(); as item) {
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors duration-150 {{ item.claseColor }} {{ customClass() }}"
        [title]="item.label"
      >
        @if (showIcon()) {
          <ion-icon [name]="item.icono" class="text-sm shrink-0"></ion-icon>
        }
        <span>{{ item.label }}</span>
      </span>
    }
  `
})
export class BadgeVencimientoComponent {
  private alertaService = inject(AlertaVencimientoService);

  readonly fecha = input<string | Date | null | undefined>(null);
  readonly umbralDias = input<number>(30);
  readonly showIcon = input<boolean>(true);
  readonly customClass = input<string>('');

  readonly info = computed(() => {
    return this.alertaService.calcularAlerta(this.fecha(), this.umbralDias());
  });
}
