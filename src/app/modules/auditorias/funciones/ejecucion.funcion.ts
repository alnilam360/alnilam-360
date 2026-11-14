import { Hallazgo, ResultadoItem, VerificacionRespuesta } from '../../../core/models/verificacion.model';

type ConResultado = { resultado: ResultadoItem | null };

/** % cumplimiento = cumple / (cumple + no_cumple), excluye no_aplica. Redondeo idéntico a la RPC. */
export function porcentajeCumplimiento(respuestas: ConResultado[]): number | null {
  const cumple = respuestas.filter(r => r.resultado === 'cumple').length;
  const noCumple = respuestas.filter(r => r.resultado === 'no_cumple').length;
  const evaluables = cumple + noCumple;
  if (evaluables === 0) return null;
  return Math.round((100 * cumple / evaluables) * 100) / 100;
}

/** Una sugerencia por cada respuesta no_cumple aún sin hallazgo. */
export function derivarHallazgos(
  respuestas: VerificacionRespuesta[], hallazgos: Hallazgo[],
): { respuesta_id: string; item_texto: string }[] {
  const usadas = new Set(hallazgos.map(h => h.respuesta_id));
  return respuestas
    .filter(r => r.resultado === 'no_cumple' && r.id && !usadas.has(r.id))
    .map(r => ({ respuesta_id: r.id as string, item_texto: r.item_texto }));
}

export function puedeCerrar(respuestas: ConResultado[]): boolean {
  return respuestas.length > 0 && respuestas.every(r => r.resultado !== null);
}
