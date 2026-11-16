import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NecesidadIperc } from '../../../../../core/models/capacitacion.model';

@Component({
  selector: 'app-necesidades-iperc-panel',
  templateUrl: './necesidades-iperc-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class NecesidadesIpercPanelComponent {
  @Input() necesidades: NecesidadIperc[] = [];
  @Output() crearTema = new EventEmitter<NecesidadIperc>();

  trackByIperc(_: number, n: NecesidadIperc): string {
    return n.iperc_id;
  }
}
