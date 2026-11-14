/** Funciones puras del dashboard (sin DI ni I/O). */

export interface EstadoVisual {
  label: string;
  color: string;
}

export interface ActividadMinima {
  actividad: string;
  meses?: { mes: number; programado: boolean }[];
}

export interface ProximaActividad {
  day: string;
  month: string;
  title: string;
  type: string;
}

export interface DetalleMinimo {
  calificacion: string | null;
  estandar?: { ciclo_phva: string };
}

export interface CicloCumplimiento {
  ciclo: string;
  total: number;
  cumplen: number;
  porcentaje: number;
}

export interface ArcoDonut {
  dash: number;
  offset: number;
}

const MESES_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const ORDEN_CICLOS = ['Planear', 'Hacer', 'Verificar', 'Actuar'];

export function estadoCumplimiento0312(pct: number): EstadoVisual {
  if (pct >= 86) return { label: 'Aceptable', color: '#10b981' };
  if (pct >= 61) return { label: 'Moderadamente aceptable', color: '#f59e0b' };
  return { label: 'Crítico', color: '#ef4444' };
}

export function estadoActividades(pct: number): EstadoVisual {
  if (pct >= 85) return { label: 'Completadas', color: '#3b82f6' };
  if (pct >= 60) return { label: 'En avance', color: '#f59e0b' };
  return { label: 'Bajo', color: '#ef4444' };
}

/** Meses programados >= mesActual (1-12), ordenados por mes; el día no se modela, se muestra '—'. */
export function proximasDesdeActividades(
  actividades: ActividadMinima[],
  mesActual: number,
  limite: number
): ProximaActividad[] {
  const items: { mes: number; title: string }[] = [];
  for (const a of actividades) {
    for (const m of a.meses ?? []) {
      if (m.programado && m.mes >= mesActual) items.push({ mes: m.mes, title: a.actividad });
    }
  }
  items.sort((x, y) => x.mes - y.mes);
  return items.slice(0, limite).map(i => ({
    day: '—',
    month: MESES_ES[i.mes - 1] ?? '',
    title: i.title,
    type: 'Programada'
  }));
}

/** Agrupa el detalle por ciclo PHVA: cumple si la calificación empieza por 'Cumple'. */
export function cumplimientoPorCiclo(detalle: DetalleMinimo[]): CicloCumplimiento[] {
  const mapa = new Map<string, { total: number; cumplen: number }>();
  for (const d of detalle) {
    const ciclo = d.estandar?.ciclo_phva;
    if (!ciclo) continue;
    if (d.calificacion === 'No Aplica') continue; // excluido de la base, como calcularPuntajeTotal (metodología 0312)
    const acc = mapa.get(ciclo) ?? { total: 0, cumplen: 0 };
    acc.total++;
    if (d.calificacion?.startsWith('Cumple')) acc.cumplen++;
    mapa.set(ciclo, acc);
  }
  return [...mapa.entries()]
    .sort((a, b) => ORDEN_CICLOS.indexOf(a[0]) - ORDEN_CICLOS.indexOf(b[0]))
    .map(([ciclo, v]) => ({ ciclo, ...v, porcentaje: Math.round((v.cumplen / v.total) * 100) }));
}

export function arcosDonut(pesos: number[], circunferencia: number): ArcoDonut[] {
  const suma = pesos.reduce((s, p) => s + p, 0);
  if (suma <= 0) return [];
  let acumulado = 0;
  return pesos.map(p => {
    const dash = (p / suma) * circunferencia;
    const arco = { dash, offset: acumulado };
    acumulado += dash;
    return arco;
  });
}
