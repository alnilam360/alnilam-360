import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { PresupuestoCentroCosto, ResumenCentro } from '../models/presupuesto.model';

const COLS = 'id, empresa_id, nombre, codigo, activo';
const T = 'presupuesto_centro_costo';

export type CentroNuevo = Pick<PresupuestoCentroCosto, 'nombre' | 'codigo' | 'activo'>;

/** Centros de costo del Presupuesto + resumen por centro (RPC get_presupuesto_centros). */
@Injectable({ providedIn: 'root' })
export class PresupuestoCentroService {
  constructor(private sb: SupabaseClientService) {}

  async listarCentros(empresaId: string): Promise<PresupuestoCentroCosto[]> {
    const { data, error } = await this.sb.client
      .from(T).select(COLS).eq('empresa_id', empresaId).order('nombre');
    if (error) throw error;
    return (data ?? []) as PresupuestoCentroCosto[];
  }

  async crearCentro(empresaId: string, datos: CentroNuevo): Promise<PresupuestoCentroCosto> {
    const { data, error } = await this.sb.client
      .from(T).insert({ ...datos, empresa_id: empresaId }).select(COLS).single();
    if (error) throw error;
    return data as PresupuestoCentroCosto;
  }

  async actualizarCentro(id: string, cambios: Partial<CentroNuevo>): Promise<void> {
    const { error } = await this.sb.client.from(T).update(cambios).eq('id', id);
    if (error) throw error;
  }

  async eliminarCentro(id: string): Promise<void> {
    const { error } = await this.sb.client.from(T).delete().eq('id', id);
    if (error) throw error;
  }

  async getResumenCentros(periodoId: string): Promise<ResumenCentro[]> {
    const { data, error } = await this.sb.client.rpc('get_presupuesto_centros', { p_periodo_id: periodoId });
    if (error) throw error;
    return (data ?? []) as unknown as ResumenCentro[];
  }
}
