const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0, minimumFractionDigits: 0,
});

export function formatearCOP(valor: number): string {
  return formatoCOP.format(valor);
}

/** Avance 0..1; sin presupuesto => 0 (guarda división por cero). */
export function porcentajeAvance(ejecutado: number, presupuestado: number): number {
  if (presupuestado <= 0) return 0;
  return Math.min(Math.max(ejecutado / presupuestado, 0), 1);
}

/** Diferencia ejecutado - presupuestado (>0 sobregasto). */
export function variacion(ejecutado: number, presupuestado: number): number {
  return ejecutado - presupuestado;
}

/** Variación relativa; sin presupuesto => null. */
export function variacionPct(ejecutado: number, presupuestado: number): number | null {
  return presupuestado > 0 ? ejecutado / presupuestado - 1 : null;
}

/** Semáforo con ratio crudo (sin saturar): >1 sobre, >=0.9 cerca. */
export function estadoAvance(ejecutado: number, presupuestado: number): 'bajo' | 'cerca' | 'sobre' {
  if (presupuestado <= 0) return 'bajo';
  const r = ejecutado / presupuestado;
  if (r > 1) return 'sobre';
  return r >= 0.9 ? 'cerca' : 'bajo';
}

/** Porcentaje con signo; null => guion. */
export function formatearVariacionPct(v: number | null): string {
  if (v === null) return '—';
  return `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
}

/** Clase de color de texto según signo de la variación. */
export function claseVariacion(v: number | null): string {
  if (v === null || v === 0) return 'text-dark-text';
  return v > 0 ? 'text-red-400' : 'text-emerald-400';
}

export function formatearMeta(meta: number | null): string {
  if (meta === null) return '—';
  return `${(meta * 100).toFixed(2)}%`;
}

/** Proyección lineal simple (mínimos cuadrados) del próximo saldo. No es modelo estadístico. <2 puntos => null. COP entero. */
export function proyeccionSaldo(saldos: number[]): number | null {
  const n = saldos.length;
  if (n < 2) return null;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const sumY = saldos.reduce((a, b) => a + b, 0);
  const sumXY = saldos.reduce((acc, y, x) => acc + x * y, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return Math.round(slope * n + intercept);
}
