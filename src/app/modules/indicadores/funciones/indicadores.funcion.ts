/** Tasa de ausentismo (%) = días de incapacidad / días programados * 100, 2 decimales. */
export function tasaAusentismo(diasIncapacidad: number, diasProgramados: number): number {
  if (!diasProgramados) return 0;
  return Number(((diasIncapacidad / diasProgramados) * 100).toFixed(2));
}

/** Casos por 100.000 trabajadores, 1 decimal. Sirve para prevalencia (todos los casos) e incidencia (casos nuevos). */
function tasaPor100k(casos: number, promedioTrabajadores: number): number {
  if (!promedioTrabajadores) return 0;
  return Number(((casos / promedioTrabajadores) * 100000).toFixed(1));
}

export function tasaPrevalencia(totalCasos: number, promedioTrabajadores: number): number {
  return tasaPor100k(totalCasos, promedioTrabajadores);
}

export function tasaIncidencia(casosNuevos: number, promedioTrabajadores: number): number {
  return tasaPor100k(casosNuevos, promedioTrabajadores);
}
