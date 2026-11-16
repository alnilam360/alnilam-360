import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';
import { CatalogItem } from '../../../../core/models/plan-anual.model';
import { TenantService } from '../../../../core/services/tenant.service';
import { CapAsistencia, CapSesion, EficaciaSesion, CapTema, NecesidadIperc } from '../../../../core/models/capacitacion.model';

const COLS_TEMA = 'id, empresa_id, nombre, descripcion, grupo_objetivo_id, iperc_id, fuente, obligatorio, horas_min, activo, created_at';
const COLS_SESION = 'id, empresa_id, tema_id, fecha, facilitador, modalidad, horas, area_trabajo, sede_id, evidencia_url, estado, created_at';
const COLS_ASIST = 'id, empresa_id, sesion_id, trabajador_id, asistio, nota_evaluacion, aprobado, created_at';

export type NuevoTema = Omit<CapTema, 'id' | 'created_at' | 'empresa_id'>;
export type NuevaSesion = Omit<CapSesion, 'id' | 'created_at' | 'empresa_id'>;

@Injectable()
export class CapacitacionService {
  private sb = inject(SupabaseClientService);
  private tenant = inject(TenantService);

  async getTemas(): Promise<CapTema[]> {
    const empresaId = await this.tenant.getEmpresaTenantId();
    if (!empresaId) return [];
    const { data, error } = await this.sb.client
      .from('cap_tema').select(COLS_TEMA)
      .eq('empresa_id', empresaId).eq('activo', true).order('nombre');
    if (error) throw error;
    return (data ?? []) as CapTema[];
  }

  async getSesiones(anio: number): Promise<CapSesion[]> {
    const empresaId = await this.tenant.getEmpresaTenantId();
    if (!empresaId) return [];
    const { data, error } = await this.sb.client
      .from('cap_sesion').select(COLS_SESION)
      .eq('empresa_id', empresaId)
      .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
      .order('fecha');
    if (error) throw error;
    return (data ?? []) as CapSesion[];
  }

  async getNecesidadesIperc(anio: number | null = null): Promise<NecesidadIperc[]> {
    const { data, error } = await this.sb.client.rpc('cap_necesidades_desde_iperc', { p_anio: anio });
    if (error) throw error;
    return (data ?? []) as NecesidadIperc[];
  }

  async getEficaciaTema(temaId: string, ventanaDias = 90): Promise<EficaciaSesion[]> {
    const { data, error } = await this.sb.client.rpc('cap_eficacia_tema', { p_tema_id: temaId, p_ventana_dias: ventanaDias });
    if (error) throw error;
    return (data ?? []) as EficaciaSesion[];
  }

  private async empresaId(): Promise<string> {
    const id = await this.tenant.getEmpresaTenantId();
    if (!id) throw new Error('No hay empresa activa.');
    return id;
  }

  async getGruposObjetivo(): Promise<CatalogItem[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_grupo_objetivo').select('id, nombre, orden, activo')
      .eq('activo', true).order('orden');
    if (error) throw error;
    return (data ?? []) as CatalogItem[];
  }

  async crearTema(payload: NuevoTema): Promise<void> {
    const empresa_id = await this.empresaId();
    const { error } = await this.sb.client.from('cap_tema').insert({ ...payload, empresa_id });
    if (error) throw error;
  }

  async actualizarTema(id: string, cambios: Partial<NuevoTema>): Promise<void> {
    const { error } = await this.sb.client.from('cap_tema').update(cambios).eq('id', id);
    if (error) throw error;
  }

  async eliminarTema(id: string): Promise<void> {
    const { error } = await this.sb.client.from('cap_tema').delete().eq('id', id);
    if (error) throw error;
  }

  async crearSesion(payload: NuevaSesion): Promise<void> {
    const empresa_id = await this.empresaId();
    const { error } = await this.sb.client.from('cap_sesion').insert({ ...payload, empresa_id });
    if (error) throw error;
  }

  async actualizarSesion(id: string, cambios: Partial<NuevaSesion>): Promise<void> {
    const { error } = await this.sb.client.from('cap_sesion').update(cambios).eq('id', id);
    if (error) throw error;
  }

  async eliminarSesion(id: string): Promise<void> {
    const { error } = await this.sb.client.from('cap_sesion').delete().eq('id', id);
    if (error) throw error;
  }

  async getAsistencia(sesionId: string): Promise<CapAsistencia[]> {
    const { data, error } = await this.sb.client
      .from('cap_asistencia').select(COLS_ASIST).eq('sesion_id', sesionId);
    if (error) throw error;
    return (data ?? []) as CapAsistencia[];
  }

  async guardarAsistencia(sesionId: string, filas: CapAsistencia[]): Promise<void> {
    const empresa_id = await this.empresaId();
    const rows = filas.map(f => ({
      sesion_id: sesionId, trabajador_id: f.trabajador_id, empresa_id,
      asistio: f.asistio ?? false, nota_evaluacion: f.nota_evaluacion ?? null, aprobado: f.aprobado ?? false,
    }));
    const { error } = await this.sb.client
      .from('cap_asistencia').upsert(rows, { onConflict: 'sesion_id,trabajador_id' });
    if (error) throw error;
  }
}
