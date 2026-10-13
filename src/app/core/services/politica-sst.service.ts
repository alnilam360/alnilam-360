import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { PoliticaSst, PoliticaSstEstado, TrabajadorSimple } from '../models/politica-sst.model';

@Injectable({
  providedIn: 'root'
})
export class PoliticaSstService {
  private sb = inject(SupabaseClientService);

  /**
   * Obtiene la política vigente ('publicada') para la empresa.
   * Si no hay publicada, devuelve la versión más reciente (ej. primer borrador).
   */
  async getPoliticaVigente(empresaId: string): Promise<PoliticaSst | null> {
    if (!empresaId) return null;

    // 1. Intentar obtener la versión publicada
    const { data: publicada, error: errPub } = await this.sb.client
      .from('politica_sst')
      .select(`
        *,
        elaborado_por_trabajador:trabajadores!elaborado_por(id, nombre, cargo, documento),
        revisado_por_trabajador:trabajadores!revisado_por(id, nombre, cargo, documento)
      `)
      .eq('empresa_id', empresaId)
      .eq('estado', 'publicado')
      .maybeSingle();

    if (errPub) {
      console.error('Error al consultar política publicada:', errPub);
      throw errPub;
    }

    if (publicada) {
      return publicada as unknown as PoliticaSst;
    }

    // 2. Si no hay publicada, traer la versión con mayor número
    const { data: ultima, error: errUlt } = await this.sb.client
      .from('politica_sst')
      .select(`
        *,
        elaborado_por_trabajador:trabajadores!elaborado_por(id, nombre, cargo, documento),
        revisado_por_trabajador:trabajadores!revisado_por(id, nombre, cargo, documento)
      `)
      .eq('empresa_id', empresaId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errUlt) {
      console.error('Error al consultar última versión de política:', errUlt);
      throw errUlt;
    }

    return (ultima as unknown as PoliticaSst) || null;
  }

  /**
   * Obtiene el historial completo de versiones de la política para la empresa.
   */
  async getHistorialVersiones(empresaId: string): Promise<PoliticaSst[]> {
    if (!empresaId) return [];

    const { data, error } = await this.sb.client
      .from('politica_sst')
      .select(`
        *,
        elaborado_por_trabajador:trabajadores!elaborado_por(id, nombre, cargo, documento),
        revisado_por_trabajador:trabajadores!revisado_por(id, nombre, cargo, documento)
      `)
      .eq('empresa_id', empresaId)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error al consultar historial de políticas:', error);
      throw error;
    }

    return (data as unknown as PoliticaSst[]) || [];
  }

  /**
   * Obtiene una política por ID específico con datos de trabajadores vinculados.
   */
  async getPoliticaPorId(id: string): Promise<PoliticaSst | null> {
    if (!id) return null;

    const { data, error } = await this.sb.client
      .from('politica_sst')
      .select(`
        *,
        elaborado_por_trabajador:trabajadores!elaborado_por(id, nombre, cargo, documento),
        revisado_por_trabajador:trabajadores!revisado_por(id, nombre, cargo, documento)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error al consultar política por ID:', error);
      throw error;
    }

    return (data as unknown as PoliticaSst) || null;
  }

  /**
   * Crea una nueva versión de la política (nace en estado 'borrador').
   * El número de versión se asigna automáticamente por trigger de base de datos.
   */
  async crearNuevaVersion(empresaId: string, base?: Partial<PoliticaSst>): Promise<PoliticaSst> {
    if (!empresaId) throw new Error('empresaId es requerido');

    const payload: Record<string, any> = {
      empresa_id: empresaId,
      contenido: base?.contenido || '',
      alcance: base?.alcance || '',
      elaborado_por: base?.elaborado_por || null,
      revisado_por: base?.revisado_por || null,
      fecha_elaboracion: base?.fecha_elaboracion || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await this.sb.client
      .from('politica_sst')
      .insert(payload)
      .select(`
        *,
        elaborado_por_trabajador:trabajadores!elaborado_por(id, nombre, cargo, documento),
        revisado_por_trabajador:trabajadores!revisado_por(id, nombre, cargo, documento)
      `)
      .single();

    if (error) {
      console.error('Error creando nueva versión de política:', error);
      throw error;
    }

    return data as unknown as PoliticaSst;
  }

  /**
   * Actualiza el contenido, alcance o responsables de una política en estado borrador.
   */
  async guardarBorrador(id: string, datos: Partial<PoliticaSst>): Promise<PoliticaSst> {
    const payload: Record<string, any> = {};
    if (datos.contenido !== undefined) payload['contenido'] = datos.contenido;
    if (datos.alcance !== undefined) payload['alcance'] = datos.alcance;
    if (datos.elaborado_por !== undefined) payload['elaborado_por'] = datos.elaborado_por || null;
    if (datos.revisado_por !== undefined) payload['revisado_por'] = datos.revisado_por || null;
    if (datos.fecha_elaboracion !== undefined) payload['fecha_elaboracion'] = datos.fecha_elaboracion;

    const { data, error } = await this.sb.client
      .from('politica_sst')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        elaborado_por_trabajador:trabajadores!elaborado_por(id, nombre, cargo, documento),
        revisado_por_trabajador:trabajadores!revisado_por(id, nombre, cargo, documento)
      `)
      .single();

    if (error) {
      console.error('Error guardando borrador de política:', error);
      throw error;
    }

    return data as unknown as PoliticaSst;
  }

  /**
   * Ejecuta una transición de estado:
   * borrador -> en_revision -> aprobado -> publicado (u obsoleto)
   */
  async cambiarEstado(
    id: string,
    nuevoEstado: PoliticaSstEstado,
    datosAdicionales?: Partial<PoliticaSst>
  ): Promise<PoliticaSst> {
    const payload: Record<string, any> = { estado: nuevoEstado };

    if (datosAdicionales) {
      if (datosAdicionales.contenido !== undefined) payload['contenido'] = datosAdicionales.contenido;
      if (datosAdicionales.alcance !== undefined) payload['alcance'] = datosAdicionales.alcance;
      if (datosAdicionales.elaborado_por !== undefined) payload['elaborado_por'] = datosAdicionales.elaborado_por;
      if (datosAdicionales.revisado_por !== undefined) payload['revisado_por'] = datosAdicionales.revisado_por;
    }

    const { data, error } = await this.sb.client
      .from('politica_sst')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        elaborado_por_trabajador:trabajadores!elaborado_por(id, nombre, cargo, documento),
        revisado_por_trabajador:trabajadores!revisado_por(id, nombre, cargo, documento)
      `)
      .single();

    if (error) {
      console.error(`Error cambiando estado de política a ${nuevoEstado}:`, error);
      throw error;
    }

    return data as unknown as PoliticaSst;
  }

  /**
   * Elimina un borrador (solo permitido en estado 'borrador').
   */
  async eliminarBorrador(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('politica_sst')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando borrador de política:', error);
      throw error;
    }
  }

  /**
   * Lista los trabajadores activos de la empresa para seleccionarlos en elaborado_por y revisado_por.
   * Solo lectura sobre public.trabajadores.
   */
  async listarTrabajadores(empresaId: string): Promise<TrabajadorSimple[]> {
    if (!empresaId) return [];

    const { data, error } = await this.sb.client
      .from('trabajadores')
      .select('id, nombre, cargo, documento')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error listando trabajadores de la empresa:', error);
      return [];
    }

    return (data as TrabajadorSimple[]) || [];
  }
}
