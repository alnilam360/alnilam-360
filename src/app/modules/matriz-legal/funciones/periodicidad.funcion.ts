import { NUMERO_PERIODO_RANGO, Periodicidad } from '../../../core/models/matriz-legal.model';

const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function maxNumero(p: Periodicidad): number {
  return NUMERO_PERIODO_RANGO[p].max;
}

export function numeroValido(p: Periodicidad, n: number): boolean {
  const { min, max } = NUMERO_PERIODO_RANGO[p];
  return Number.isInteger(n) && n >= min && n <= max;
}

/** Etiqueta legible del corte: "2026", "2.º semestre 2026", "Q2 2026", "Jun 2026". */
export function etiquetaCorte(periodo: number, p: Periodicidad, numero: number): string {
  switch (p) {
    case 'SEMESTRAL': return `${numero}.º semestre ${periodo}`;
    case 'TRIMESTRAL': return `Q${numero} ${periodo}`;
    case 'MENSUAL': return `${MESES_ABREV[numero - 1] ?? numero} ${periodo}`;
    default: return `${periodo}`;
  }
}

/** Opciones 1..max del selector de número para una periodicidad, con su etiqueta corta. */
export function opcionesNumero(p: Periodicidad): { valor: number; etiqueta: string }[] {
  return Array.from({ length: maxNumero(p) }, (_, i) => {
    const valor = i + 1;
    const etiqueta = p === 'TRIMESTRAL' ? `Q${valor}`
      : p === 'SEMESTRAL' ? `${valor}.º semestre`
      : p === 'MENSUAL' ? MESES_ABREV[i]
      : 'Año completo';
    return { valor, etiqueta };
  });
}
