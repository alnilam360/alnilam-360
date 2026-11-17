import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CapEstadoSesion, CapSesion } from '../../../../../core/models/capacitacion.model';
import { armarMesCalendario, DiaCalendario, SemanaCalendario } from '../../funciones/calendario-mes.funcion';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const BADGE_ESTADO: Record<CapEstadoSesion, string> = {
  programada: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  dictada: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  cancelada: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

@Component({
  selector: 'app-cronograma-calendario',
  templateUrl: './cronograma-calendario.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CronogramaCalendarioComponent implements OnChanges {
  @Input({ required: true }) anio!: number;
  @Input({ required: true }) sesiones!: CapSesion[];
  @Input({ required: true }) nombreTema!: Record<string, string>;
  @Output() editar = new EventEmitter<CapSesion>();

  readonly diasSemana = DIAS;
  mes0 = 0;
  semanas: SemanaCalendario[] = [];

  ngOnChanges(c: SimpleChanges): void {
    if (c['anio']) {
      const hoy = new Date();
      this.mes0 = this.anio === hoy.getFullYear() ? hoy.getMonth() : 0;
    }
    this.recalcular();
  }

  mesAnterior(): void { this.mes0 = Math.max(0, this.mes0 - 1); this.recalcular(); }
  mesSiguiente(): void { this.mes0 = Math.min(11, this.mes0 + 1); this.recalcular(); }

  etiquetaMes(): string { return `${MESES[this.mes0]} ${this.anio}`; }
  onChip(s: CapSesion): void { this.editar.emit(s); }
  badge(estado: CapEstadoSesion): string { return BADGE_ESTADO[estado]; }
  trackDia(_: number, d: DiaCalendario): string { return d.fecha; }
  trackSesion(_: number, s: CapSesion): string { return s.id ?? `${s.fecha}-${s.tema_id}`; }

  private recalcular(): void {
    this.semanas = armarMesCalendario(this.anio, this.mes0, this.sesiones, this.hoyLocal());
  }

  private hoyLocal(): string {
    const h = new Date();
    const p = (n: number): string => String(n).padStart(2, '0');
    return `${h.getFullYear()}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
  }
}
