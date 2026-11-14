import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import { Empresa } from '../models/models';
import {
  EstandarLite, Hallazgo, ProgramaVerificacionRow, Verificacion, VerificacionPlantilla, VerificacionPlantillaItem, VerificacionRespuesta,
} from '../models/verificacion.model';

const BUCKET = 'verificaciones-evidencias';
const MAX_EVIDENCIA = 5 * 1024 * 1024;
const COLS_RESPUESTA = 'id, verificacion_id, orden, item_texto, plantilla_item_id, resultado, observacion, evidencia_url, created_at';
const COLS_HALLAZGO =
  'id, empresa_id, verificacion_id, respuesta_id, descripcion, clasificacion, severidad, estandar_id, responsable_id, responsable_texto, fecha_compromiso, jerarquia, estado, fecha_cierre, eficacia_verificada, fecha_verificacion, evidencia_cierre_url, created_at';

const COLS_PLANTILLA = 'id, empresa_id, tipo, subtipo, nombre, activo, created_at';
const COLS_ITEM = 'id, plantilla_id, orden, texto, categoria, estandar_id, activo, created_at';
const COLS_VERIFICACION =
  'id, empresa_id, tipo, subtipo, titulo, plantilla_id, sede_id, responsable_id, responsable_texto, fecha_programada, fecha_ejecucion, estado, alcance, criterios, puntaje, observaciones, created_at, updated_at';

/** Auditorías e Inspecciones: programa anual y programación de verificaciones. */
@Injectable({ providedIn: 'root' })
export class VerificacionesService {
  constructor(
    private sb: SupabaseClientService,
    private tenant: TenantService,
  ) {}

  /** Contexto de empresa: admin ve selector; el resto su empresa. */
  async resolverContextoEmpresa(): Promise<{ esAdmin: boolean; empresas: Empresa[]; empresaId: string }> {
    const esAdmin = await this.tenant.isAdministrador();
    const empresas = await this.tenant.listarEmpresasDisponibles();
    const empresaId = (await this.tenant.getEmpresaTenantId()) || empresas[0]?.id || '';
    return { esAdmin, empresas, empresaId };
  }

  async getPrograma(empresaId: string, anio: number): Promise<ProgramaVerificacionRow[]> {
    const { data, error } = await this.sb.client.rpc('get_programa_verificaciones', { p_empresa_id: empresaId, p_anio: anio });
    if (error) throw error;
    return (data as unknown as ProgramaVerificacionRow[]) ?? [];
  }

  async listarPlantillas(empresaId: string): Promise<VerificacionPlantilla[]> {
    const { data, error } = await this.sb.client
      .from('sst_verificacion_plantilla')
      .select('id, empresa_id, tipo, subtipo, nombre, activo, created_at')
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return (data as unknown as VerificacionPlantilla[]) ?? [];
  }

  async crearVerificacion(v: Verificacion): Promise<Verificacion> {
    const { id: _id, created_at: _c, ...fila } = v;
    const { data, error } = await this.sb.client
      .from('sst_verificacion')
      .insert({ ...fila, updated_at: new Date().toISOString() })
      .select(COLS_VERIFICACION)
      .single();
    if (error) throw error;
    return data as unknown as Verificacion;
  }

  async actualizarVerificacion(id: string, cambios: Partial<Verificacion>): Promise<void> {
    const { error } = await this.sb.client
      .from('sst_verificacion')
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  cancelarVerificacion(id: string): Promise<void> {
    return this.actualizarVerificacion(id, { estado: 'cancelada' });
  }

  // ── Ejecución (F3) ──────────────────────────────────────────────────────────
  async getVerificacion(id: string): Promise<{ verificacion: Verificacion; respuestas: VerificacionRespuesta[]; hallazgos: Hallazgo[] }> {
    const c = this.sb.client;
    const [v, r, h] = await Promise.all([
      c.from('sst_verificacion').select(COLS_VERIFICACION).eq('id', id).single(),
      c.from('sst_verificacion_respuesta').select(COLS_RESPUESTA).eq('verificacion_id', id).order('orden'),
      c.from('sst_hallazgo').select(COLS_HALLAZGO).eq('verificacion_id', id).order('created_at'),
    ]);
    if (v.error) throw v.error;
    if (r.error) throw r.error;
    if (h.error) throw h.error;
    return {
      verificacion: v.data as unknown as Verificacion,
      respuestas: (r.data as unknown as VerificacionRespuesta[]) ?? [],
      hallazgos: (h.data as unknown as Hallazgo[]) ?? [],
    };
  }

  async itemsPlantilla(plantillaId: string): Promise<VerificacionPlantillaItem[]> {
    const { data, error } = await this.sb.client
      .from('sst_verificacion_plantilla_item')
      .select('id, plantilla_id, orden, texto, categoria, estandar_id, activo, created_at')
      .eq('plantilla_id', plantillaId).eq('activo', true).order('orden');
    if (error) throw error;
    return (data as unknown as VerificacionPlantillaItem[]) ?? [];
  }

  /** Siembra las respuestas desde la plantilla (sin duplicar) y pasa a 'en_curso'. */
  async iniciarEjecucion(v: Verificacion): Promise<VerificacionRespuesta[]> {
    const id = v.id as string;
    const existentes = (await this.getVerificacion(id)).respuestas;
    if (existentes.length > 0 || !v.plantilla_id) return existentes;
    const items = await this.itemsPlantilla(v.plantilla_id);
    const filas = items.map(i => ({
      verificacion_id: id, orden: i.orden, item_texto: i.texto, plantilla_item_id: i.id ?? null, resultado: null,
    }));
    if (filas.length > 0) {
      const { error } = await this.sb.client.from('sst_verificacion_respuesta').insert(filas);
      if (error) throw error;
    }
    if (v.estado === 'programada') await this.actualizarVerificacion(id, { estado: 'en_curso' });
    return (await this.getVerificacion(id)).respuestas;
  }

  async guardarRespuesta(r: VerificacionRespuesta): Promise<VerificacionRespuesta> {
    const tabla = this.sb.client.from('sst_verificacion_respuesta');
    const campos = { resultado: r.resultado, observacion: r.observacion, evidencia_url: r.evidencia_url };
    const q = r.id ? tabla.update(campos).eq('id', r.id) : tabla.insert({ ...campos, verificacion_id: r.verificacion_id, orden: r.orden, item_texto: r.item_texto, plantilla_item_id: r.plantilla_item_id });
    const { data, error } = await q.select(COLS_RESPUESTA).single();
    if (error) throw error;
    return data as unknown as VerificacionRespuesta;
  }

  agregarItemManual(verificacionId: string, orden: number, texto: string): Promise<VerificacionRespuesta> {
    return this.guardarRespuesta({
      verificacion_id: verificacionId, orden, item_texto: texto, plantilla_item_id: null,
      resultado: null, observacion: null, evidencia_url: null,
    });
  }

  async crearHallazgo(h: Hallazgo): Promise<Hallazgo> {
    const { id: _id, created_at: _c, ...fila } = h;
    const { data, error } = await this.sb.client.from('sst_hallazgo').insert(fila).select(COLS_HALLAZGO).single();
    if (error) throw error;
    return data as unknown as Hallazgo;
  }

  async actualizarHallazgo(id: string, cambios: Partial<Hallazgo>): Promise<void> {
    const { id: _id, created_at: _c, ...fila } = cambios;
    const { error } = await this.sb.client.from('sst_hallazgo').update(fila).eq('id', id);
    if (error) throw error;
  }

  async eliminarHallazgo(id: string): Promise<void> {
    const { error } = await this.sb.client.from('sst_hallazgo').delete().eq('id', id);
    if (error) throw error;
  }

  async subirEvidencia(empresaId: string, verificacionId: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('La evidencia debe ser una imagen');
    if (file.size > MAX_EVIDENCIA) throw new Error('La imagen supera 5 MB');
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${empresaId}/${verificacionId}/${Date.now()}.${ext}`;
    const { error } = await this.sb.client.storage.from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  }

  async urlFirmadaEvidencia(path: string): Promise<string> {
    const { data, error } = await this.sb.client.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  // ── Plantillas (F4) ─────────────────────────────────────────────────────────
  async crearPlantilla(p: VerificacionPlantilla): Promise<VerificacionPlantilla> {
    if (!p.empresa_id) throw new Error('La plantilla requiere empresa');
    const { id: _id, created_at: _c, ...fila } = p;
    const { data, error } = await this.sb.client.from('sst_verificacion_plantilla').insert(fila).select(COLS_PLANTILLA).single();
    if (error) throw error;
    return data as unknown as VerificacionPlantilla;
  }

  async actualizarPlantilla(id: string, cambios: Partial<VerificacionPlantilla>): Promise<void> {
    const { id: _id, created_at: _c, empresa_id: _e, ...fila } = cambios;
    const { error } = await this.sb.client.from('sst_verificacion_plantilla').update(fila).eq('id', id);
    if (error) throw error;
  }

  /** Copia una plantilla (global o propia) a la empresa, con sus ítems. Devuelve el id nuevo. */
  async clonarPlantilla(origenId: string, empresaId: string): Promise<string> {
    const { data, error } = await this.sb.client.from('sst_verificacion_plantilla')
      .select(COLS_PLANTILLA).eq('id', origenId).single();
    if (error) throw error;
    const origen = data as unknown as VerificacionPlantilla;
    const items = await this.itemsPlantilla(origenId);
    const nueva = await this.crearPlantilla({
      empresa_id: empresaId, tipo: origen.tipo, subtipo: origen.subtipo, nombre: `${origen.nombre} (copia)`, activo: true,
    });
    if (items.length > 0) {
      const filas = items.map(i => ({
        plantilla_id: nueva.id as string, orden: i.orden, texto: i.texto, categoria: i.categoria, estandar_id: i.estandar_id, activo: true,
      }));
      const { error: e2 } = await this.sb.client.from('sst_verificacion_plantilla_item').insert(filas);
      if (e2) throw e2;
    }
    return nueva.id as string;
  }

  async crearItem(i: VerificacionPlantillaItem): Promise<VerificacionPlantillaItem> {
    const { id: _id, created_at: _c, ...fila } = i;
    const { data, error } = await this.sb.client.from('sst_verificacion_plantilla_item').insert(fila).select(COLS_ITEM).single();
    if (error) throw error;
    return data as unknown as VerificacionPlantillaItem;
  }

  async actualizarItem(id: string, cambios: Partial<VerificacionPlantillaItem>): Promise<void> {
    const { id: _id, created_at: _c, plantilla_id: _p, ...fila } = cambios;
    const { error } = await this.sb.client.from('sst_verificacion_plantilla_item').update(fila).eq('id', id);
    if (error) throw error;
  }

  async eliminarItem(id: string): Promise<void> {
    const { error } = await this.sb.client.from('sst_verificacion_plantilla_item').delete().eq('id', id);
    if (error) throw error;
  }

  async listarEstandares(): Promise<EstandarLite[]> {
    const { data, error } = await this.sb.client.from('sst_estandares_catalogo')
      .select('id, item, descripcion_estandar').order('item');
    if (error) throw error;
    return (data as unknown as EstandarLite[]) ?? [];
  }

  /** Cierra vía RPC; el puntaje lo calcula la BD. */
  async cerrarVerificacion2(id: string): Promise<Verificacion> {
    const { data, error } = await this.sb.client.rpc('cerrar_verificacion', { p_verif_id: id });
    if (error) throw error;
    return data as unknown as Verificacion;
  }
}
