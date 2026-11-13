import { PresupuestoCuentaPorPagar, PresupuestoNomina } from '../../../core/models/presupuesto.model';

type Devengados = Pick<PresupuestoNomina,
  'dev_basico' | 'dev_auxilio_transporte' | 'dev_auxilio_comunicacion' | 'dev_rodamiento' | 'dev_bono_adicional'>;
type Deducciones = Pick<PresupuestoNomina, 'ded_salud' | 'ded_pension' | 'ded_otras'>;

export function totalDevengado(n: Devengados): number {
  return n.dev_basico + n.dev_auxilio_transporte + n.dev_auxilio_comunicacion
    + n.dev_rodamiento + n.dev_bono_adicional;
}

export function totalDeducciones(n: Deducciones): number {
  return n.ded_salud + n.ded_pension + n.ded_otras;
}

export function netoNomina(n: Devengados & Deducciones): number {
  return totalDevengado(n) - totalDeducciones(n);
}

export function saldoPorPagar(c: Pick<PresupuestoCuentaPorPagar, 'por_pagar' | 'ejecutado'>): number {
  return c.por_pagar - c.ejecutado;
}

/** Fecha de negocio sin hora: mediodía UTC para que no retroceda un día en UTC-5. */
export function fechaAISO(fecha: string | null | undefined): string | null {
  return fecha ? `${fecha.slice(0, 10)}T12:00:00Z` : null;
}

/** Valor para <input type="date">. */
export function fechaAInput(fecha: string | null | undefined): string {
  return fecha ? fecha.slice(0, 10) : '';
}

export function sumar<T>(items: T[], campo: (i: T) => number): number {
  return items.reduce((acc, i) => acc + campo(i), 0);
}
