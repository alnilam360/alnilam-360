import { Injectable } from '@angular/core';
import { EstadoVencimientoInfo } from '../models/politica-sst.model';

@Injectable({
  providedIn: 'root'
})
export class AlertaVencimientoService {

  /**
   * Calcula el estado de vencimiento según una fecha objetivo y un umbral en días (por defecto 30).
   * Reutilizable entre Política SST, Matriz Legal y Recursos y Responsables.
   */
  calcularAlerta(fechaVencimiento: string | Date | null | undefined, umbralDias: number = 30): EstadoVencimientoInfo {
    if (!fechaVencimiento) {
      return {
        estado: 'sin_fecha',
        diasRestantes: null,
        label: 'Sin fecha de revisión',
        claseColor: 'bg-slate-800 text-slate-400 border-slate-700',
        icono: 'help-circle-outline'
      };
    }

    const fechaObj = typeof fechaVencimiento === 'string'
      ? new Date(fechaVencimiento.includes('T') ? fechaVencimiento : `${fechaVencimiento}T00:00:00`)
      : new Date(fechaVencimiento);

    if (isNaN(fechaObj.getTime())) {
      return {
        estado: 'sin_fecha',
        diasRestantes: null,
        label: 'Fecha no válida',
        claseColor: 'bg-slate-800 text-slate-400 border-slate-700',
        icono: 'alert-circle-outline'
      };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const target = new Date(fechaObj);
    target.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      const diasVencidos = Math.abs(diffDias);
      return {
        estado: 'vencido',
        diasRestantes: diffDias,
        label: diasVencidos === 1 ? 'Vencido hace 1 día' : `Vencido hace ${diasVencidos} días`,
        claseColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        icono: 'alert-circle-outline'
      };
    }

    if (diffDias <= umbralDias) {
      return {
        estado: 'por_vencer',
        diasRestantes: diffDias,
        label: diffDias === 0 ? 'Vence hoy' : diffDias === 1 ? 'Vence mañana' : `Por vencer en ${diffDias} días`,
        claseColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        icono: 'time-outline'
      };
    }

    return {
      estado: 'vigente',
      diasRestantes: diffDias,
      label: `Vigente (${diffDias} días restantes)`,
      claseColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icono: 'checkmark-circle-outline'
    };
  }
}
