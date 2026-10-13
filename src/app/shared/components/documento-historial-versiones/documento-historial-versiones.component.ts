import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PoliticaSst } from '../../../core/models/politica-sst.model';
import { BadgeVencimientoComponent } from '../badge-vencimiento/badge-vencimiento.component';

@Component({
  selector: 'app-documento-historial-versiones',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    TableModule,
    ButtonModule,
    BadgeVencimientoComponent
  ],
  templateUrl: './documento-historial-versiones.component.html',
  styleUrls: ['./documento-historial-versiones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentoHistorialVersionesComponent {
  readonly versiones = input.required<PoliticaSst[]>();
  readonly verVersion = output<PoliticaSst>();

  onVerVersion(v: PoliticaSst): void {
    this.verVersion.emit(v);
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      borrador: 'Borrador',
      en_revision: 'En Revisión',
      aprobado: 'Aprobado',
      publicado: 'Publicado',
      obsoleto: 'Obsoleto'
    };
    return map[estado] || estado;
  }

  getEstadoClasses(estado: string): string {
    const map: Record<string, string> = {
      borrador: 'bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-sm shadow-blue-500/10',
      en_revision: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-sm shadow-amber-500/10',
      aprobado: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 shadow-sm shadow-indigo-500/10',
      publicado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10 font-bold',
      obsoleto: 'bg-slate-800/80 text-slate-400 border-slate-700/60'
    };
    return map[estado] || 'bg-slate-800 text-slate-400 border-slate-700';
  }

  getEstadoDot(estado: string): string {
    const map: Record<string, string> = {
      borrador: 'bg-blue-400',
      en_revision: 'bg-amber-400',
      aprobado: 'bg-indigo-400',
      publicado: 'bg-emerald-400 animate-pulse',
      obsoleto: 'bg-slate-500'
    };
    return map[estado] || 'bg-slate-500';
  }
}
