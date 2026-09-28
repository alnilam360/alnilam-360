import { Injectable, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { CatalogoCie10 } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class Cie10Service {

  private _frecuentes = signal<CatalogoCie10[]>([]);
  readonly frecuentes = this._frecuentes.asReadonly();
  private cacheCargado = false;

  constructor(private sb: SupabaseClientService) {}

  /**
   * Obtiene los diagnósticos frecuentes en SST y accidentes de trabajo
   * (Decreto 1477/2014 e incidentes osteomusculares/trauma).
   */
  async getFrecuentes(): Promise<CatalogoCie10[]> {
    if (this.cacheCargado && this._frecuentes().length > 0) {
      return this._frecuentes();
    }

    try {
      const { data, error } = await this.sb.client
        .from('catalogo_cie10')
        .select('*')
        .eq('es_frecuente', true)
        .eq('activo', true)
        .order('codigo');

      if (error) throw error;
      const list = (data as CatalogoCie10[]) || [];
      this._frecuentes.set(list);
      this.cacheCargado = true;
      return list;
    } catch (err) {
      console.error('Error cargando CIE-10 frecuentes:', err);
      return [];
    }
  }

  /**
   * Búsqueda ágil por código CIE-10 o por descripción diagnóstica (insensible a mayúsculas/minúsculas).
   */
  async buscar(query: string, limite = 25): Promise<CatalogoCie10[]> {
    const q = query?.trim();
    if (!q || q.length < 2) {
      return this.getFrecuentes();
    }

    const clean = q.toUpperCase();

    try {
      const { data, error } = await this.sb.client
        .from('catalogo_cie10')
        .select('*')
        .eq('activo', true)
        .or(`codigo.ilike.${clean}%,descripcion.ilike.%${clean}%`)
        .order('es_frecuente', { ascending: false })
        .order('codigo')
        .limit(limite);

      if (error) throw error;
      return (data as CatalogoCie10[]) || [];
    } catch (err) {
      console.error('Error buscando en catálogo CIE-10:', err);
      return [];
    }
  }

  /**
   * Busca un código específico exacto.
   */
  async getByCodigo(codigo: string): Promise<CatalogoCie10 | null> {
    if (!codigo?.trim()) return null;
    try {
      const { data, error } = await this.sb.client
        .from('catalogo_cie10')
        .select('*')
        .eq('codigo', codigo.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      return (data as CatalogoCie10) || null;
    } catch (err) {
      console.error('Error obteniendo código CIE-10:', err);
      return null;
    }
  }
}
