import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import { Empresa } from '../models/models';
import {
  PresupuestoCuentaPorPagar,
  PresupuestoMovimiento,
  PresupuestoNomina,
  PresupuestoRecaudo,
  PresupuestoPeriodo,
  PresupuestoResumen,
  PresupuestoRubro,
  PresupuestoSocio,
  PresupuestoSubrubro,
  TendenciaMes,
} from '../models/presupuesto.model';

const COLS_PERIODO = 'id, empresa_id, mes, saldo_inicial, facturado, cerrado';
const COLS_SOCIO = 'id, empresa_id, nombre, porcentaje, activo';

const T_MOV = 'presupuesto_movimiento';
const T_REC = 'presupuesto_recaudo';
const T_NOM = 'presupuesto_nomina';
const T_CXP = 'presupuesto_cuenta_por_pagar';
const COLS_MOV = 'id, empresa_id, periodo_id, subrubro_codigo, fecha, detalle, presupuestado, ejecutado, centro_costo_id';
const COLS_REC = 'id, empresa_id, periodo_id, cliente_nombre, cliente_nit, valor, fecha_corte, '
  + 'fecha_entrega_cuenta_cobro, fecha_limite_pago, observaciones, estado';
const COLS_NOM = 'id, empresa_id, periodo_id, cargo, nombre_trabajador, cedula, sueldo_basico, dias_trabajados, '
  + 'dev_basico, dev_auxilio_transporte, dev_auxilio_comunicacion, dev_rodamiento, dev_bono_adicional, '
  + 'ded_salud, ded_pension, ded_otras, pago_nomina';
const COLS_CXP = 'id, empresa_id, periodo_id, fecha, detalle, por_pagar, presupuestado, ejecutado, centro_costo_id';

type SinClave<T> = Omit<T, 'id' | 'empresa_id' | 'periodo_id' | 'created_at' | 'updated_at'>;
export type MovimientoNuevo = SinClave<PresupuestoMovimiento>;
export type RecaudoNuevo = SinClave<PresupuestoRecaudo>;
export type NominaNueva = SinClave<PresupuestoNomina>;
export type CuentaPorPagarNueva = SinClave<PresupuestoCuentaPorPagar>;
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

  async getTendencia(empresaId: string, nMeses = 6): Promise<TendenciaMes[]> {
    const { data, error } = await this.sb.client.rpc('get_presupuesto_tendencia', { p_empresa_id: empresaId, p_n_meses: nMeses });
    if (error) throw error;
    return (data as unknown as TendenciaMes[] | null) ?? [];
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

  // ── Capturas por periodo (movimiento, recaudo, nómina, cuentas por pagar) ─
  listarMovimientos(e: string, p: string) { return this.listarDePeriodo<PresupuestoMovimiento>(T_MOV, COLS_MOV, e, p, 'fecha'); }
  crearMovimiento(e: string, p: string, d: MovimientoNuevo) { return this.crearDePeriodo<PresupuestoMovimiento>(T_MOV, COLS_MOV, e, p, d); }
  actualizarMovimiento(id: string, c: Partial<MovimientoNuevo>) { return this.actualizarFila(T_MOV, id, c); }
  eliminarMovimiento(id: string) { return this.eliminarFila(T_MOV, id); }

  listarRecaudos(e: string, p: string) { return this.listarDePeriodo<PresupuestoRecaudo>(T_REC, COLS_REC, e, p, 'cliente_nombre'); }
  crearRecaudo(e: string, p: string, d: RecaudoNuevo) { return this.crearDePeriodo<PresupuestoRecaudo>(T_REC, COLS_REC, e, p, d); }
  actualizarRecaudo(id: string, c: Partial<RecaudoNuevo>) { return this.actualizarFila(T_REC, id, c); }
  eliminarRecaudo(id: string) { return this.eliminarFila(T_REC, id); }

  listarNominas(e: string, p: string) { return this.listarDePeriodo<PresupuestoNomina>(T_NOM, COLS_NOM, e, p, 'nombre_trabajador'); }
  crearNomina(e: string, p: string, d: NominaNueva) { return this.crearDePeriodo<PresupuestoNomina>(T_NOM, COLS_NOM, e, p, d); }
  actualizarNomina(id: string, c: Partial<NominaNueva>) { return this.actualizarFila(T_NOM, id, c); }
  eliminarNomina(id: string) { return this.eliminarFila(T_NOM, id); }

  listarCuentasPorPagar(e: string, p: string) { return this.listarDePeriodo<PresupuestoCuentaPorPagar>(T_CXP, COLS_CXP, e, p, 'fecha'); }
  crearCuentaPorPagar(e: string, p: string, d: CuentaPorPagarNueva) { return this.crearDePeriodo<PresupuestoCuentaPorPagar>(T_CXP, COLS_CXP, e, p, d); }
  actualizarCuentaPorPagar(id: string, c: Partial<CuentaPorPagarNueva>) { return this.actualizarFila(T_CXP, id, c); }
  eliminarCuentaPorPagar(id: string) { return this.eliminarFila(T_CXP, id); }

  private async listarDePeriodo<T>(tabla: string, cols: string, empresaId: string, periodoId: string, orden: string): Promise<T[]> {
    const { data, error } = await this.sb.client.from(tabla).select(cols)
      .eq('empresa_id', empresaId).eq('periodo_id', periodoId).order(orden);
    if (error) throw error;
    return (data ?? []) as unknown as T[];
  }

  private async crearDePeriodo<T>(tabla: string, cols: string, empresaId: string, periodoId: string, datos: object): Promise<T> {
    const { data, error } = await this.sb.client.from(tabla)
      .insert({ ...datos, empresa_id: empresaId, periodo_id: periodoId }).select(cols).single();
    if (error) throw error;
    return data as unknown as T;
  }

  private async actualizarFila(tabla: string, id: string, cambios: object): Promise<void> {
    const { error } = await this.sb.client.from(tabla).update(cambios).eq('id', id);
    if (error) throw error;
  }

  private async eliminarFila(tabla: string, id: string): Promise<void> {
    const { error } = await this.sb.client.from(tabla).delete().eq('id', id);
    if (error) throw error;
  }
}
