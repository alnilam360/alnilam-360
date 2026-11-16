import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-planes-host',
  template: `
    <app-capacitacion-dashboard *ngIf="esCapacitaciones; else placeholder"></app-capacitacion-dashboard>
    <ng-template #placeholder><app-placeholder-page></app-placeholder-page></ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PlanesHostComponent {
  readonly esCapacitaciones = inject(ActivatedRoute).snapshot.data['tipo'] === 'capacitaciones';
}
