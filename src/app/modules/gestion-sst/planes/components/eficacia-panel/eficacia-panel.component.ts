import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CapacitacionService } from '../../services/capacitacion.service';
import { resumirEficacia, ResumenEficacia, SemaforoEficacia } from '../../funciones/eficacia.funcion';
import { CapTema, EficaciaSesion } from '../../../../../core/models/capacitacion.model';

const BADGE: Record<SemaforoEficacia, string> = {
  mejora: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  empeora: 'bg-red-500/20 text-red-300 border border-red-500/30',
  neutro: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  sin_datos: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
};
const ETIQUETA: Record<SemaforoEficacia, string> = {
  mejora: 'Mejora', empeora: 'Empeora', neutro: 'Neutro', sin_datos: 'Sin datos',
};

@Component({
  selector: 'app-eficacia-panel',
  templateUrl: './eficacia-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class EficaciaPanelComponent implements OnInit {
  @Input({ required: true }) tema!: CapTema;
  @Output() cerrado = new EventEmitter<void>();

  private svc = inject(CapacitacionService);
  private cdr = inject(ChangeDetectorRef);

  readonly ventanas = [30, 60, 90, 180];
  ventanaDias = 90;
  cargando = true;
  errorMsg: string | null = null;
  sesiones: EficaciaSesion[] = [];
  resumen: ResumenEficacia = resumirEficacia([]);
  maximo = 1;

  ngOnInit(): Promise<void> {
    return this.cargar();
  }

  async cambiarVentana(valor: string): Promise<void> {
    this.ventanaDias = Number(valor);
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    if (!this.tema.id) return;
    this.cargando = true; this.errorMsg = null;
    try {
      this.sesiones = await this.svc.getEficaciaTema(this.tema.id, this.ventanaDias);
      this.resumen = resumirEficacia(this.sesiones);
      this.maximo = Math.max(1, ...this.sesiones.map(s => Math.max(s.antes, s.despues)));
    } catch (e) {
      this.sesiones = [];
      this.resumen = resumirEficacia([]);
      this.errorMsg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error cargando la eficacia.';
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  ancho(valor: number): string {
    return `${Math.round((valor / this.maximo) * 100)}%`;
  }

  badge(s: SemaforoEficacia): string { return BADGE[s]; }
  etiqueta(s: SemaforoEficacia): string { return ETIQUETA[s]; }

  trackSesion(_: number, s: EficaciaSesion): string {
    return s.sesion_id;
  }
}
