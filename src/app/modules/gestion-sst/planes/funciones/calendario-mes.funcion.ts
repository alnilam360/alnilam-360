import { CapSesion } from '../../../../core/models/capacitacion.model';

export interface DiaCalendario { fecha: string; delMes: boolean; hoy: boolean; sesiones: CapSesion[]; }
export type SemanaCalendario = DiaCalendario[];

const DIA_MS = 86_400_000;

function formatoUtc(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Rejilla de 6 semanas x 7 días (inicia lunes); aritmética en UTC para evitar desfase de zona. */
export function armarMesCalendario(anio: number, mes0: number, sesiones: CapSesion[], hoyStr: string): SemanaCalendario[] {
  const porFecha = new Map<string, CapSesion[]>();
  for (const s of sesiones) {
    const lista = porFecha.get(s.fecha);
    if (lista) lista.push(s); else porFecha.set(s.fecha, [s]);
  }
  const primero = Date.UTC(anio, mes0, 1);
  const offset = (new Date(primero).getUTCDay() + 6) % 7;
  const semanas: SemanaCalendario[] = [];
  for (let w = 0; w < 6; w++) {
    const semana: SemanaCalendario = [];
    for (let d = 0; d < 7; d++) {
      const dia = new Date(primero + (w * 7 + d - offset) * DIA_MS);
      const fecha = formatoUtc(dia);
      semana.push({
        fecha,
        delMes: dia.getUTCMonth() === mes0 && dia.getUTCFullYear() === anio,
        hoy: hoyStr !== '' && fecha === hoyStr,
        sesiones: porFecha.get(fecha) ?? [],
      });
    }
    semanas.push(semana);
  }
  return semanas;
}
