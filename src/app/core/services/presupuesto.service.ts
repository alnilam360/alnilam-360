import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import { Empresa } from '../models/models';
import {
  PresupuestoPeriodo,
  PresupuestoResumen,
  PresupuestoRubro,
  PresupuestoSocio,
  PresupuestoSubrubro,
} from '../models/presupuesto.model';

const COLS_PERIODO = 'id, empresa_id, mes, saldo_inicial, facturado, cerrado';
const COLS_SOCIO = 'id, empresa_id, nombre, porcentaje, activo';

export type PeriodoNuevo = Pick<PresupuestoPeriodo, 'mes' | 'saldo_inicial' | 'facturado'>;
export type SocioNuevo = Pick<PresupuestoSocio, 'nombre' | 'porcentaje' | 'activo'>;

/** Presupuesto (núcleo): periodos, catálogo, socios y resumen (RPC get_presupuesto_resumen). */
@Injectable({ providedIn: 'root' })
export class PresupuestoService {
  constructor(
    private sb: SupabaseClientService,
    private tenant: TenantService,
  ) {}

  // ── Tenant (delegación) ──────────────────────────────────────────────────
  isAdministrador() { return this.tenant.isAdministrador(); }
  listarEmpresasDisponibles() { return this.tenant.listarEmpresasDisponibles(); }
  getEmpresaTenantId() { return this.tenant.getEmpresaTenantId(); }
  getEmpresaPorId(id: string) { return this.tenant.getEmpresaPorId(id); }

  /** Contexto de empresa para las páginas: admin ve selector; el resto su empresa. */
  async resolverContextoEmpresa(): Promise<{ esAdmin: boolean; empresas: Empresa[]; empresaId: string }> {
    const esAdmin = await this.isAdministrador();
    const empresas = await this.listarEmpresasDisponibles();
    const empresaId = (await this.getEmpresaTenantId()) || empresas[0]?.id || '';
    return { esAdmin, empresas, empresaId };
  }

  // ── Periodos ─────────────────────────────────────────────────────────────
  async listarPeriodos(empresaId: string): Promise<PresupuestoPeriodo[]> {
    const { data, error } = await this.sb.client
      .from('presupuesto_periodo').select(COLS_PERIODO)
      .eq('empresa_id', empresaId).order('mes', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PresupuestoPeriodo[];
  }

  async getPeriodo(id: string): Promise<PresupuestoPeriodo | null> {
    const { data, error } = await this.sb.client
      .from('presupuesto_periodo').select(COLS_PERIODO).eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as PresupuestoPeriodo | null) ?? null;
  }

  async crearPeriodo(empresaId: string, p: PeriodoNuevo): Promise<PresupuestoPeriodo> {
    const { data, error } = await this.sb.client
      .from('presupuesto_periodo').insert({ ...p, empresa_id: empresaId })
      .select(COLS_PERIODO).single();
    if (error) throw error;
    return data as PresupuestoPeriodo;
  }

  async actualizarPeriodo(id: string, cambios: Partial<PeriodoNuevo>): Promise<void> {
    const { error } = await this.sb.client.from('presupuesto_periodo').update(cambios).eq('id', id);
    if (error) throw error;
  }

  // ── Resumen (RPC) ────────────────────────────────────────────────────────
  async getResumen(periodoId: string): Promise<PresupuestoResumen | null> {
    const { data, error } = await this.sb.client.rpc('get_presupuesto_resumen', { p_periodo_id: periodoId });
    if (error) throw error;
    return (data as unknown as PresupuestoResumen | null) ?? null;
  }

  // ── Catálogo global ──────────────────────────────────────────────────────
  async getRubros(): Promise<PresupuestoRubro[]> {
    const { data, error } = await this.sb.client
      .from('presupuesto_rubro').select('codigo, nombre, orden, activo')
      .eq('activo', true).order('orden');
    if (error) throw error;
    return (data ?? []) as PresupuestoRubro[];
  }

  async getSubrubros(): Promise<PresupuestoSubrubro[]> {
    const { data, error } = await this.sb.client
      .from('presupuesto_subrubro').select('codigo, rubro_codigo, nombre, orden, activo')
      .eq('activo', true).order('orden');
    if (error) throw error;
    return (data ?? []) as PresupuestoSubrubro[];
  }

  // ── Socios ───────────────────────────────────────────────────────────────
  async listarSocios(empresaId: string): Promise<PresupuestoSocio[]> {
    const { data, error } = await this.sb.client
      .from('presupuesto_socio').select(COLS_SOCIO)
      .eq('empresa_id', empresaId).order('nombre');
    if (error) throw error;
    return (data ?? []) as PresupuestoSocio[];
  }

  async crearSocio(empresaId: string, s: SocioNuevo): Promise<PresupuestoSocio> {
    const { data, error } = await this.sb.client
      .from('presupuesto_socio').insert({ ...s, empresa_id: empresaId })
      .select(COLS_SOCIO).single();
    if (error) throw error;
    return data as PresupuestoSocio;
  }

  async actualizarSocio(id: string, cambios: Partial<SocioNuevo>): Promise<void> {
    const { error } = await this.sb.client.from('presupuesto_socio').update(cambios).eq('id', id);
    if (error) throw error;
  }

  async eliminarSocio(id: string): Promise<void> {
    const { error } = await this.sb.client.from('presupuesto_socio').delete().eq('id', id);
    if (error) throw error;
  }
}
