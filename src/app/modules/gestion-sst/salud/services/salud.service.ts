import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';
import { TenantService } from '../../../../core/services/tenant.service';
import {
  SaludCoberturaRow, SaludDiagnosticoRow, SaludExamen, SaludExamenClinico, SaludPerfilCargoRow, SaludRestriccion,
} from '../../../../core/models/salud.model';

const COLS_EXAMEN = 'id, empresa_id, trabajador_id, tipo, fecha, fecha_proximo, aptitud, requiere_seguimiento, ips_nombre, medico_licencia, created_at, updated_at';
const COLS_CLINICO = 'examen_id, empresa_id, concepto_path, observaciones';
const COLS_REST = 'id, empresa_id, examen_id, clase, descripcion, temporalidad, fecha_fin, estado, responsable, fecha_limite_accion, created_at, updated_at';

export type NuevoExamen = Omit<SaludExamen, 'id' | 'empresa_id' | 'trabajador_id' | 'created_at' | 'updated_at'>;
export type NuevaRestriccion = Omit<SaludRestriccion, 'id' | 'empresa_id' | 'examen_id' | 'created_at' | 'updated_at'>;

@Injectable()
export class SaludService {
  private sb = inject(SupabaseClientService);
  private tenant = inject(TenantService);

  // Bucket privado solo médico/super-admin (storage policies); ruta <empresa_id>/<archivo>.
  private readonly BUCKET = 'salud-conceptos';
  readonly MAX_CONCEPTO_BYTES = 10 * 1024 * 1024;

  validarConcepto(file: File): string | null {
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) return 'Solo se permite PDF.';
    if (file.size > this.MAX_CONCEPTO_BYTES) return 'El archivo supera el límite de 10 MB.';
    return null;
  }

  private async empresaId(): Promise<string> {
    const id = await this.tenant.getEmpresaTenantId();
    if (!id) throw new Error('No hay empresa activa.');
    return id;
  }

  async getCobertura(anio: number): Promise<SaludCoberturaRow[]> {
    const { data, error } = await this.sb.client.rpc('salud_cobertura', { p_anio: anio });
    if (error) throw error;
    return (data ?? []) as SaludCoberturaRow[];
  }

  async getDiagnostico(anio: number): Promise<SaludDiagnosticoRow[]> {
    const { data, error } = await this.sb.client.rpc('salud_diagnostico_general', { p_anio: anio });
    if (error) throw error;
    return (data ?? []) as SaludDiagnosticoRow[];
  }

  async getPerfilCargo(cargo: string): Promise<SaludPerfilCargoRow[]> {
    const { data, error } = await this.sb.client.rpc('salud_perfil_cargo', { p_cargo: cargo });
    if (error) throw error;
    return (data ?? []) as SaludPerfilCargoRow[];
  }

  async getExamenes(trabajadorId: string): Promise<SaludExamen[]> {
    const { data, error } = await this.sb.client.from('salud_examen').select(COLS_EXAMEN)
      .eq('trabajador_id', trabajadorId).order('fecha', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SaludExamen[];
  }

  async esMedico(): Promise<boolean> {
    const { data, error } = await this.sb.client.rpc('is_medico');
    return !error && data === true;
  }

  /** Guarda solo los campos no clínicos y devuelve el examen (con id). */
  async guardarExamen(trabajadorId: string, payload: NuevoExamen, id: string | null): Promise<SaludExamen> {
    const empresa_id = await this.empresaId();
    const q = id
      ? this.sb.client.from('salud_examen').update(payload).eq('id', id)
      : this.sb.client.from('salud_examen').insert({ ...payload, empresa_id, trabajador_id: trabajadorId });
    const { data, error } = await q.select(COLS_EXAMEN).single();
    if (error) throw error;
    return data as SaludExamen;
  }

  /** Para no-médicos RLS devuelve 0 filas: es null, no error. */
  async getClinico(examenId: string): Promise<SaludExamenClinico | null> {
    const { data, error } = await this.sb.client.from('salud_examen_clinico').select(COLS_CLINICO)
      .eq('examen_id', examenId).maybeSingle();
    if (error) throw error;
    return (data as SaludExamenClinico | null) ?? null;
  }

  /** Sube el PDF (si hay) a salud-conceptos, hace upsert y borra el archivo nuevo si la BD falla. */
  async guardarClinico(examenId: string, empresaId: string, observaciones: string | null, file?: File | null,
                       pathActual: string | null = null): Promise<void> {
    let nuevoPath: string | null = null;
    if (file) {
      const invalido = this.validarConcepto(file);
      if (invalido) throw new Error(invalido);
      nuevoPath = `${empresaId}/${examenId}_${Date.now()}.pdf`;
      const { error: upErr } = await this.sb.client.storage.from(this.BUCKET)
        .upload(nuevoPath, file, { contentType: 'application/pdf', upsert: false });
      if (upErr) throw upErr;
    }
    const { error } = await this.sb.client.from('salud_examen_clinico').upsert({
      examen_id: examenId, empresa_id: empresaId, concepto_path: nuevoPath ?? pathActual, observaciones,
    });
    if (error) {
      if (nuevoPath) await this.sb.client.storage.from(this.BUCKET).remove([nuevoPath]);
      throw error;
    }
    if (nuevoPath && pathActual) await this.sb.client.storage.from(this.BUCKET).remove([pathActual]);
  }

  /** El archivo de bóveda solo lo lee/borra el médico; si no lo es, se omite sin romper el borrado. */
  async eliminarExamen(id: string): Promise<void> {
    let path: string | null = null;
    try { path = (await this.getClinico(id))?.concepto_path ?? null; } catch { path = null; }
    const { error } = await this.sb.client.from('salud_examen').delete().eq('id', id);
    if (error) throw error;
    if (path) await this.sb.client.storage.from(this.BUCKET).remove([path]);
  }

  async urlConcepto(path: string): Promise<string> {
    const { data, error } = await this.sb.client.storage.from(this.BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  }

  async getRestricciones(examenId: string): Promise<SaludRestriccion[]> {
    const { data, error } = await this.sb.client.from('salud_restriccion').select(COLS_REST)
      .eq('examen_id', examenId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as SaludRestriccion[];
  }

  async crearRestriccion(examenId: string, payload: NuevaRestriccion): Promise<void> {
    const empresa_id = await this.empresaId();
    const { error } = await this.sb.client.from('salud_restriccion').insert({ ...payload, empresa_id, examen_id: examenId });
    if (error) throw error;
  }

  async actualizarRestriccion(id: string, cambios: Partial<NuevaRestriccion>): Promise<void> {
    const { error } = await this.sb.client.from('salud_restriccion').update(cambios).eq('id', id);
    if (error) throw error;
  }

  async eliminarRestriccion(id: string): Promise<void> {
    const { error } = await this.sb.client.from('salud_restriccion').delete().eq('id', id);
    if (error) throw error;
  }
}
