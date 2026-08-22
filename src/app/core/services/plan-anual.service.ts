import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import {
  CatalogItem,
  PlanTrabajoAnual,
  PlanTrabajoActividad,
  PlanTrabajoActividadMes,
  PlanTrabajoAnalisisTrimestral,
  KpiResumen,
  KpiMes,
  MESES_LABELS,
} from '../models/plan-anual.model';

@Injectable({ providedIn: 'root' })
export class PlanAnualService {

  constructor(
    private sb: SupabaseClientService,
    private tenant: TenantService,
  ) {}

  // ─── EMPRESA / TENANT ──────────────────────────────────────────────────────

  async getEmpresaActual(empresaId?: string) {
    return empresaId
      ? this.tenant.getEmpresaPorId(empresaId)
      : this.tenant.getEmpresaPorId((await this.tenant.getEmpresaTenantId())!);
  }

  async isAdmin(): Promise<boolean> {
    return this.tenant.isAdministrador();
  }

  async listarEmpresas() {
    return this.tenant.listarEmpresasDisponibles();
  }

  // ─── CATÁLOGOS ─────────────────────────────────────────────────────────────

  async getFases(): Promise<CatalogItem[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_fase_phva').select('*').order('orden');
    if (error) throw error;
    return data as CatalogItem[];
  }

  async getProgramas(): Promise<CatalogItem[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_programa_sst').select('*').eq('activo', true).order('orden');
    if (error) throw error;
    return data as CatalogItem[];
  }

  async getGruposObjetivo(): Promise<CatalogItem[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_grupo_objetivo').select('*').eq('activo', true).order('orden');
    if (error) throw error;
    return data as CatalogItem[];
  }

  async getResponsables(): Promise<CatalogItem[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_responsable_plan').select('*').eq('activo', true).order('orden');
    if (error) throw error;
    return data as CatalogItem[];
  }

  async getSedes(empresaId: string): Promise<{ id: string; nombre: string; municipio: string }[]> {
    const { data, error } = await this.sb.client
      .from('sedes').select('id, nombre, municipio').eq('empresa_id', empresaId);
    if (error) throw error;
    return (data ?? []) as any[];
  }

  // ─── PLAN ENCABEZADO ───────────────────────────────────────────────────────

  async listarPlanes(empresaId: string): Promise<PlanTrabajoAnual[]> {
    const { data, error } = await this.sb.client
      .from('plan_trabajo_anual')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('anio', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PlanTrabajoAnual[];
  }

  async getPlan(planId: string): Promise<PlanTrabajoAnual> {
    const { data, error } = await this.sb.client
      .from('plan_trabajo_anual').select('*').eq('id', planId).single();
    if (error) throw error;
    return data as PlanTrabajoAnual;
  }

  async getPlanPorEmpresaAnio(empresaId: string, anio: number): Promise<PlanTrabajoAnual | null> {
    const { data, error } = await this.sb.client
      .from('plan_trabajo_anual').select('*')
      .eq('empresa_id', empresaId).eq('anio', anio).maybeSingle();
    if (error) throw error;
    return data as PlanTrabajoAnual | null;
  }

  async crearPlan(plan: Omit<PlanTrabajoAnual, 'id' | 'created_at' | 'updated_at'>): Promise<PlanTrabajoAnual> {
    const perfil = await this.tenant.getPerfilSeguro();
    const { data, error } = await this.sb.client
      .from('plan_trabajo_anual')
      .insert({ ...plan, created_by: perfil?.id })
      .select().single();
    if (error) throw error;
    return data as PlanTrabajoAnual;
  }

  async actualizarPlan(planId: string, cambios: Partial<PlanTrabajoAnual>): Promise<void> {
    const { error } = await this.sb.client
      .from('plan_trabajo_anual')
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq('id', planId);
    if (error) throw error;
  }

  async eliminarPlan(planId: string): Promise<void> {
    const { error } = await this.sb.client
      .from('plan_trabajo_anual').delete().eq('id', planId);
    if (error) throw error;
  }

  // ─── ACTIVIDADES ───────────────────────────────────────────────────────────

  async listarActividades(planId: string): Promise<PlanTrabajoActividad[]> {
    const { data, error } = await this.sb.client
      .from('plan_trabajo_actividad')
      .select(`
        *,
        programa:catalogo_programa_sst(id,nombre,orden,activo),
        grupo_objetivo:catalogo_grupo_objetivo(id,nombre,orden,activo),
        responsable:catalogo_responsable_plan(id,nombre,orden,activo),
        meses:plan_trabajo_actividad_mes(*)
      `)
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as PlanTrabajoActividad[];
  }

  async crearActividad(
    actividad: Omit<PlanTrabajoActividad, 'id' | 'created_at' | 'updated_at' | 'programa' | 'grupo_objetivo' | 'responsable' | 'meses'>
  ): Promise<PlanTrabajoActividad> {
    const { data, error } = await this.sb.client
      .from('plan_trabajo_actividad').insert(actividad).select().single();
    if (error) throw error;
    const creada = data as PlanTrabajoActividad;
    // Sembrar 12 filas de meses
    const meses = Array.from({ length: 12 }, (_, i) => ({
      actividad_id: creada.id!,
      mes: i + 1,
      programado: false,
      ejecutado: false,
    }));
    const { error: mesErr } = await this.sb.client
      .from('plan_trabajo_actividad_mes').insert(meses);
    if (mesErr) throw mesErr;
    return creada;
  }

  async actualizarActividad(
    actividadId: string,
    cambios: Partial<Omit<PlanTrabajoActividad, 'meses' | 'programa' | 'grupo_objetivo' | 'responsable'>>
  ): Promise<void> {
    const { error } = await this.sb.client
      .from('plan_trabajo_actividad')
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq('id', actividadId);
    if (error) throw error;
  }

  async eliminarActividad(actividadId: string): Promise<void> {
    const { error } = await this.sb.client
      .from('plan_trabajo_actividad').delete().eq('id', actividadId);
    if (error) throw error;
  }

  async actualizarMes(
    actividadId: string,
    mes: number,
    cambios: { programado?: boolean; ejecutado?: boolean }
  ): Promise<void> {
    const { error } = await this.sb.client
      .from('plan_trabajo_actividad_mes')
      .update(cambios)
      .eq('actividad_id', actividadId)
      .eq('mes', mes);
    if (error) throw error;
  }

  // ─── KPI ───────────────────────────────────────────────────────────────────

  calcularKpi(actividades: PlanTrabajoActividad[], metaPorcentaje: number): KpiResumen {
    const meses: KpiMes[] = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      label: MESES_LABELS[i],
      programadas: 0,
      ejecutadas: 0,
      porcentaje: null,
    }));

    for (const act of actividades) {
      for (const m of act.meses ?? []) {
        const idx = m.mes - 1;
        if (m.programado) meses[idx].programadas++;
        if (m.ejecutado) meses[idx].ejecutadas++;
      }
    }

    for (const m of meses) {
      m.porcentaje = m.programadas > 0
        ? Math.round((m.ejecutadas / m.programadas) * 100)
        : null;
    }

    const mesesConDatos = meses.filter(m => m.programadas > 0);
    const totalProgramadas = meses.reduce((s, m) => s + m.programadas, 0);
    const totalEjecutadas = meses.reduce((s, m) => s + m.ejecutadas, 0);
    const cumplimientoAnual = mesesConDatos.length > 0
      ? Math.round(mesesConDatos.reduce((s, m) => s + (m.porcentaje ?? 0), 0) / mesesConDatos.length)
      : null;

    return { meses, totalProgramadas, totalEjecutadas, cumplimientoAnual, metaPorcentaje };
  }

  calcularPorcentajeTrimestre(kpi: KpiResumen, mesesTrimestre: number[]): number | null {
    const prog = mesesTrimestre.reduce((s, m) => s + (kpi.meses[m - 1]?.programadas ?? 0), 0);
    const ejec = mesesTrimestre.reduce((s, m) => s + (kpi.meses[m - 1]?.ejecutadas ?? 0), 0);
    return prog > 0 ? Math.round((ejec / prog) * 100) : null;
  }

  // ─── ANÁLISIS TRIMESTRAL ───────────────────────────────────────────────────

  async listarAnalisis(planId: string): Promise<PlanTrabajoAnalisisTrimestral[]> {
    const { data, error } = await this.sb.client
      .from('plan_trabajo_analisis_trimestral')
      .select('*, responsable:catalogo_responsable_plan(id,nombre,orden,activo)')
      .eq('plan_id', planId)
      .order('periodo');
    if (error) throw error;
    return (data ?? []) as PlanTrabajoAnalisisTrimestral[];
  }

  async upsertAnalisis(
    analisis: Omit<PlanTrabajoAnalisisTrimestral, 'id' | 'created_at' | 'updated_at' | 'responsable'>
  ): Promise<void> {
    const { error } = await this.sb.client
      .from('plan_trabajo_analisis_trimestral')
      .upsert({ ...analisis, updated_at: new Date().toISOString() }, { onConflict: 'plan_id,periodo' });
    if (error) throw error;
  }
}
