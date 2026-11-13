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

export function formatearMeta(meta: number | null): string {
  if (meta === null) return '—';
  return `${(meta * 100).toFixed(2)}%`;
}
