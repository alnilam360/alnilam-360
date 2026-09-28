import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export type TipoIndicador = 'AT' | 'EL' | 'AUSENTISMO' | 'EPR';
export type EstadoPlanAccion = 'Pendiente' | 'En Ejecución' | 'Completado' | 'Cancelado';

export interface IndicadorPlanAccion {
  id?: string;
  empresa_id: string;
  tipo_indicador: TipoIndicador;
  anio: number;
  periodo: string;
  analisis_texto?: string | null;
  actividad: string;
  responsable: string;
  area_responsable: string;
  fecha_programada?: string | null;
  fecha_ejecucion?: string | null;
  estado: EstadoPlanAccion;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IndicadoresPlanesService {
  private sb = inject(SupabaseClientService);

  readonly planes = signal<IndicadorPlanAccion[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async listar(empresaId: string, tipo: TipoIndicador, anio: number): Promise<IndicadorPlanAccion[]> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.sb.client
        .from('indicadores_analisis_planes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('tipo_indicador', tipo)
        .eq('anio', anio)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = (data as IndicadorPlanAccion[]) || [];
      this.planes.set(list);
      return list;
    } catch (err: any) {
      this.error.set(err.message || 'Error cargando planes de acción');
      return [];
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(plan: Partial<IndicadorPlanAccion>): Promise<IndicadorPlanAccion> {
    const { data, error } = await this.sb.client
      .from('indicadores_analisis_planes')
      .insert([plan])
      .select()
      .single();

    if (error) throw error;
    const creado = data as IndicadorPlanAccion;
    this.planes.update(items => [creado, ...items]);
    return creado;
  }

  async actualizar(id: string, cambios: Partial<IndicadorPlanAccion>): Promise<IndicadorPlanAccion> {
    const { data, error } = await this.sb.client
      .from('indicadores_analisis_planes')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const actualizado = data as IndicadorPlanAccion;
    this.planes.update(items => items.map(p => p.id === id ? { ...p, ...actualizado } : p));
    return actualizado;
  }

  async eliminar(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('indicadores_analisis_planes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this.planes.update(items => items.filter(p => p.id !== id));
  }
}
