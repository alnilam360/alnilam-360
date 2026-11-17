import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CapacitacionService } from '../../services/capacitacion.service';
import { calcularCumplimiento, Cumplimiento } from '../../funciones/cumplimiento.funcion';
import { CapEstadoSesion, CapSesion, CapTema, NecesidadIperc } from '../../../../../core/models/capacitacion.model';

const BADGE_ESTADO: Record<CapEstadoSesion, string> = {
  programada: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  dictada: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  cancelada: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

@Component({
  selector: 'app-capacitacion-dashboard',
  templateUrl: './capacitacion-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class CapacitacionDashboardComponent implements OnInit {
  anio = new Date().getFullYear();
  loading = true;
  errorMsg: string | null = null;
  temas: CapTema[] = [];
  sesiones: CapSesion[] = [];
  necesidades: NecesidadIperc[] = [];
  cumplimiento: Cumplimiento = calcularCumplimiento([]);
  nombreTema: Record<string, string> = {};

  private svc = inject(CapacitacionService);
  private cdr = inject(ChangeDetectorRef);

  temaModal: CapTema | null = null;
  sesionModal: CapSesion | null = null;
  modal: 'tema' | 'sesion' | null = null;
  asistenciaSesion: CapSesion | null = null;
  eficaciaTema: CapTema | null = null;
  porEliminar: { tipo: 'tema' | 'sesion'; id: string } | null = null;
  eliminando = false;
  errorEliminar: string | null = null;

  ngOnInit(): Promise<void> {
    return this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      [this.temas, this.sesiones, this.necesidades] = await Promise.all([
        this.svc.getTemas(),
        this.svc.getSesiones(this.anio),
        this.svc.getNecesidadesIperc(this.anio),
      ]);
      this.cumplimiento = calcularCumplimiento(this.sesiones);
      this.nombreTema = {};
      this.temas.forEach(t => { this.nombreTema[t.id ?? ''] = t.nombre; });
      this.errorMsg = null;
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : 'Error cargando el programa de capacitación.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // la promesa resuelve fuera de la zona (sesión Supabase)
    }
  }

  abrirTema(t: CapTema | null): void { this.temaModal = t; this.modal = 'tema'; }
  onCrearTemaDesdeIperc(n: NecesidadIperc): void {
    this.abrirTema({
      empresa_id: '', nombre: 'Capacitación: ' + (n.peligro_descripcion || n.proceso),
      fuente: 'iperc', iperc_id: n.iperc_id, activo: true,
    });
  }

  abrirSesion(s: CapSesion | null): void { this.sesionModal = s; this.modal = 'sesion'; }
  cerrarModal(): void { this.modal = null; }

  async alGuardar(): Promise<void> {
    this.modal = null;
    await this.cargar();
  }

  pedirEliminar(tipo: 'tema' | 'sesion', id?: string): void {
    if (!id) return;
    this.errorEliminar = null;
    this.porEliminar = { tipo, id };
  }

  async confirmarEliminar(): Promise<void> {
    const p = this.porEliminar;
    if (!p || this.eliminando) return;
    this.eliminando = true;
    try {
      if (p.tipo === 'tema') await this.svc.eliminarTema(p.id);
      else await this.svc.eliminarSesion(p.id);
      this.porEliminar = null;
      await this.cargar();
    } catch (e) {
      this.errorEliminar = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'No se pudo eliminar.';
    } finally {
      this.eliminando = false;
    }
  }

  vistaCronograma: 'lista' | 'calendario' = 'lista';

  badgeEstado(estado: CapEstadoSesion): string {
    return BADGE_ESTADO[estado];
  }

  trackById(_: number, item: { id?: string }): string | undefined {
    return item.id;
  }
}
