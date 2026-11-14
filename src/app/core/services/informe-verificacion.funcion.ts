import { Hallazgo, InformeVerificacion, ResultadoItem, VerificacionRespuesta } from '../models/verificacion.model';

const ETIQUETA_RESULTADO: Record<ResultadoItem, string> = { cumple: 'Cumple', no_cumple: 'No cumple', no_aplica: 'No aplica' };

export function etiquetaResultado(r: ResultadoItem | null): string {
  return r ? ETIQUETA_RESULTADO[r] : 'Sin evaluar';
}

const dia = (f: string | null): string => f?.slice(0, 10) ?? '—';

export function filaItem(r: VerificacionRespuesta): (string | number)[] {
  return [r.orden, r.item_texto, etiquetaResultado(r.resultado), r.observacion ?? '', r.evidencia_url ? 'Sí' : 'No'];
}

export function filaHallazgo(h: Hallazgo, estandares: Record<string, string> = {}): string[] {
  const std = h.estandar_id ? (estandares[h.estandar_id] ?? h.estandar_id) : '—';
  const accion = [h.responsable_texto ?? '—', dia(h.fecha_compromiso), h.jerarquia ?? '—'].join(' · ');
  const eficacia = h.eficacia_verificada ? `Sí${h.fecha_verificacion ? ' (' + dia(h.fecha_verificacion) + ')' : ''}` : 'No';
  return [h.descripcion, h.clasificacion ?? '—', h.severidad ?? '—', std, accion, h.estado, dia(h.fecha_cierre), eficacia];
}

/** Informe_<titulo>_<fecha>.xlsx con el título saneado. */
export function nombreArchivoInforme(i: InformeVerificacion, hoy: string): string {
  const t = i.verificacion.titulo.trim().replace(/[^\w\-áéíóúñÁÉÍÓÚÑ]+/g, '_').replace(/^_+|_+$/g, '') || 'verificacion';
  return `Informe_${t}_${hoy}.xlsx`;
}
