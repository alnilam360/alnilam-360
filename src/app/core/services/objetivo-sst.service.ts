import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import {
  CatalogoResponsablePlanItem,
  IndicadorDisponible,
  ObjetivoSst,
  ObjetivoSstEstado
} from '../models/politica-sst.model';

@Injectable({
  providedIn: 'root'
})
export class ObjetivoSstService {
  private sb = inject(SupabaseClientService);

  /**
   * Lista objetivos de la empresa con avance en tiempo real desde la vista v_objetivo_sst_avance.
   * Si se provee politicaId, filtra por esa versión específica.
   */
  async listarObjetivos(empresaId: string, politicaId?: string): Promise<ObjetivoSst[]> {
    if (!empresaId) return [];

    let query = this.sb.client
      .from('v_objetivo_sst_avance')
      .select(`
        *,
        responsable_item:catalogo_responsable_plan!responsable_id(id, nombre, orden, activo)
      `)
      .eq('empresa_id', empresaId);

    if (politicaId) {
      query = query.eq('politica_sst_id', politicaId);
    }

    const { data, error } = await query.order('orden', { ascending: true }).order('created_at', { ascending: true });

    if (error) {
      console.error('Error listando objetivos SST desde vista de avance:', error);
      throw error;
    }

    const lista = (data as unknown as ObjetivoSst[]) || [];

    // Calcular avance y recalcular estado si tiene indicador vinculado
    return lista.map(item => this.enriquecerObjetivo(item));
  }

  /**
   * Guarda un objetivo (creación o actualización).
   */
  async guardarObjetivo(objetivo: Partial<ObjetivoSst>): Promise<ObjetivoSst> {
    const payload: Record<string, any> = {
      empresa_id: objetivo.empresa_id,
      politica_sst_id: objetivo.politica_sst_id,
      descripcion: (objetivo.descripcion || '').trim(),
      meta_texto: (objetivo.meta_texto || '').trim(),
      meta_valor_numerico: objetivo.meta_valor_numerico !== undefined && objetivo.meta_valor_numerico !== null
        ? Number(objetivo.meta_valor_numerico)
        : null,
      meta_unidad: objetivo.meta_unidad || null,
      criterio_cumplimiento: objetivo.criterio_cumplimiento || 'mayor_igual',
      indicador_vinculado_id: objetivo.indicador_vinculado_id || null,
      responsable_id: objetivo.responsable_id || null,
      fecha_inicio: objetivo.fecha_inicio || new Date().getFullYear() + '-01-01',
      fecha_fin: objetivo.fecha_fin || new Date().getFullYear() + '-12-31',
      estado: objetivo.estado || 'vigente',
      orden: objetivo.orden ?? 0
    };

    if (objetivo.id) {
      // Actualizar
      const { data, error } = await this.sb.client
        .from('objetivo_sst')
        .update(payload)
        .eq('id', objetivo.id)
        .select(`
          *,
          responsable_item:catalogo_responsable_plan!responsable_id(id, nombre, orden, activo)
        `)
        .single();

      if (error) {
        console.error('Error actualizando objetivo SST:', error);
        throw error;
      }
      return this.enriquecerObjetivo(data as unknown as ObjetivoSst);
    } else {
      // Insertar
      const { data, error } = await this.sb.client
        .from('objetivo_sst')
        .insert(payload)
        .select(`
          *,
          responsable_item:catalogo_responsable_plan!responsable_id(id, nombre, orden, activo)
        `)
        .single();

      if (error) {
        console.error('Error insertando objetivo SST:', error);
        throw error;
      }
      return this.enriquecerObjetivo(data as unknown as ObjetivoSst);
    }
  }

  /**
   * Elimina un objetivo por su ID.
   */
  async eliminarObjetivo(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('objetivo_sst')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando objetivo SST:', error);
      throw error;
    }
  }

  /**
   * Copia todos los objetivos de una política origen a una política destino (Decisión D7).
   */
  async copiarObjetivosAVersion(
    politicaOrigenId: string,
    politicaDestinoId: string,
    empresaId: string
  ): Promise<number> {
    const { data: objetivosOrigen, error: errGet } = await this.sb.client
      .from('objetivo_sst')
      .select('*')
      .eq('politica_sst_id', politicaOrigenId)
      .eq('empresa_id', empresaId);

    if (errGet) {
      console.error('Error consultando objetivos origen:', errGet);
      throw errGet;
    }

    if (!objetivosOrigen || objetivosOrigen.length === 0) return 0;

    const nuevos = objetivosOrigen.map(orig => ({
      empresa_id: empresaId,
      politica_sst_id: politicaDestinoId,
      descripcion: orig.descripcion,
      meta_texto: orig.meta_texto,
      meta_valor_numerico: orig.meta_valor_numerico,
      meta_unidad: orig.meta_unidad,
      criterio_cumplimiento: orig.criterio_cumplimiento,
      indicador_vinculado_id: orig.indicador_vinculado_id,
      responsable_id: orig.responsable_id,
      fecha_inicio: orig.fecha_inicio,
      fecha_fin: orig.fecha_fin,
      estado: 'vigente',
      orden: orig.orden
    }));

    const { data: insertados, error: errIns } = await this.sb.client
      .from('objetivo_sst')
      .insert(nuevos)
      .select('id');

    if (errIns) {
      console.error('Error copiando objetivos a nueva versión:', errIns);
      throw errIns;
    }

    return insertados?.length ?? 0;
  }

  /**
   * Lista los indicadores disponibles ya registrados en `matriz_indicadores_registros` de la empresa.
   * Agrupa por nombre único y devuelve el id de registro representativo para vincular.
   */
  async listarIndicadoresDisponibles(empresaId: string): Promise<IndicadorDisponible[]> {
    if (!empresaId) return [];

    const { data, error } = await this.sb.client
      .from('matriz_indicadores_registros')
      .select('id, nombre, tipo, formula, frecuencia, meta, meta_texto, resultado, anio, mes')
      .eq('empresa_id', empresaId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false });

    if (error) {
      console.error('Error consultando indicadores para catálogo:', error);
      return [];
    }

    if (!data) return [];

    // Agrupar por nombre normalizado (para no repetir el mismo indicador de múltiples meses)
    const map = new Map<string, IndicadorDisponible>();

    for (const r of data) {
      const nombreNorm = (r.nombre || '').trim().toLowerCase();
      if (!nombreNorm) continue;

      if (!map.has(nombreNorm)) {
        map.set(nombreNorm, {
          id: r.id,
          nombre: r.nombre,
          tipo: r.tipo,
          formula: r.formula,
          frecuencia: r.frecuencia,
          meta: r.meta,
          meta_texto: r.meta_texto,
          ultimo_resultado: r.resultado !== null ? Number(r.resultado) : null,
          ultimo_anio: r.anio,
          ultimo_mes: r.mes
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /**
   * Lista los roles responsables desde el catálogo global existente catalogo_responsable_plan.
   */
  async listarResponsablesCatalogo(): Promise<CatalogoResponsablePlanItem[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_responsable_plan')
      .select('id, nombre, orden, activo')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error listando roles de catalogo_responsable_plan:', error);
      return [];
    }

    return (data as CatalogoResponsablePlanItem[]) || [];
  }

  /**
   * Enriquece el objetivo con cálculo de porcentaje de avance y evaluación automática de estado.
   */
  private enriquecerObjetivo(obj: ObjetivoSst): ObjetivoSst {
    const resultado = obj.indicador_ultimo_resultado;
    const meta = obj.meta_valor_numerico;

    // Calcular porcentaje de avance
    if (meta !== null && meta !== undefined && meta > 0 && resultado !== null && resultado !== undefined) {
      if (obj.criterio_cumplimiento === 'menor_igual') {
        // En accidentalidad: 0 o menor que la meta es 100% de cumplimiento
        if (resultado <= meta) {
          obj.porcentaje_avance = 100;
        } else {
          // Si supera la meta, porcentaje decrece
          const ratio = (meta / resultado) * 100;
          obj.porcentaje_avance = Math.max(0, Math.min(100, Math.round(ratio)));
        }
      } else {
        // Mayor o igual (habitual)
        const ratio = (resultado / meta) * 100;
        obj.porcentaje_avance = Math.max(0, Math.round(ratio));
      }
    } else if (resultado !== null && resultado !== undefined && (meta === 0 || meta === null)) {
      obj.porcentaje_avance = 100;
    } else {
      obj.porcentaje_avance = null;
    }

    // Evaluación automática de estado si tiene indicador vinculado
    if (obj.indicador_vinculado_id && meta !== null && meta !== undefined && resultado !== null && resultado !== undefined) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fin = new Date(obj.fecha_fin);
      fin.setHours(0, 0, 0, 0);

      const cumple = obj.criterio_cumplimiento === 'menor_igual'
        ? resultado <= meta
        : resultado >= meta;

      if (cumple) {
        obj.estado = 'cumplido';
      } else {
        if (fin < hoy) {
          obj.estado = 'vencido';
        } else {
          obj.estado = 'vigente'; // En curso dentro del año
        }
      }
    } else {
      // Sin indicador vinculado: revisar si ya pasó la fecha fin y aún está vigente
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fin = new Date(obj.fecha_fin);
      fin.setHours(0, 0, 0, 0);

      if (obj.estado === 'vigente' && fin < hoy) {
        obj.estado = 'vencido';
      }
    }

    return obj;
  }
}
