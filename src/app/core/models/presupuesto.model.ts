// Modelo de dominio: Presupuesto (COP). Contrato con 2026_11_13_01_presupuesto_nucleo.sql.
// Montos bigint => number; fechas ISO => string.

export type EstadoRecaudo = 'pendiente' | 'cobrado' | 'pago';

interface Auditable {
  created_at?: string;
  updated_at?: string;
}

export interface PresupuestoPeriodo extends Auditable {
  id: string;
  empresa_id: string;
  mes: string; // '2026-01'
  saldo_inicial: number;
  facturado: number;
  cerrado: boolean;
}

export interface PresupuestoRubro {
  codigo: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface PresupuestoSubrubro {
  codigo: number;
  rubro_codigo: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface PresupuestoMovimiento extends Auditable {
  id: string;
  empresa_id: string;
  periodo_id: string;
  subrubro_codigo: number;
  fecha: string | null;
  detalle: string;
  presupuestado: number;
  ejecutado: number;
  centro_costo_id: string | null;
}

export interface PresupuestoCentroCosto extends Auditable {
  id: string;
  empresa_id: string;
  nombre: string;
  codigo: string | null;
  activo: boolean;
}

export interface PresupuestoRecaudo extends Auditable {
  id: string;
  empresa_id: string;
  periodo_id: string;
  cliente_nombre: string;
  cliente_nit: string | null;
  valor: number;
  fecha_corte: string | null;
  fecha_entrega_cuenta_cobro: string | null;
  fecha_limite_pago: string | null;
  observaciones: string | null;
  estado: EstadoRecaudo;
}

export interface PresupuestoNomina extends Auditable {
  id: string;
  empresa_id: string;
  periodo_id: string;
  cargo: string | null;
  nombre_trabajador: string;
  cedula: string | null;
  sueldo_basico: number;
  dias_trabajados: number;
  dev_basico: number;
  dev_auxilio_transporte: number;
  dev_auxilio_comunicacion: number;
  dev_rodamiento: number;
  dev_bono_adicional: number;
  ded_salud: number;
  ded_pension: number;
  ded_otras: number;
  pago_nomina: number;
}

export interface PresupuestoCuentaPorPagar extends Auditable {
  id: string;
  empresa_id: string;
  periodo_id: string;
  fecha: string | null;
  detalle: string;
  por_pagar: number;
  presupuestado: number;
  ejecutado: number;
  centro_costo_id: string | null;
}

export interface PresupuestoSocio extends Auditable {
  id: string;
  empresa_id: string;
  nombre: string;
  porcentaje: number; // 0.2 = 20%
  activo: boolean;
}

export interface PresupuestoLiquidezSocioMes extends Auditable {
  id: string;
  empresa_id: string;
  socio_id: string;
  mes: string;
  dias_mes: number;
  ingreso: number;
  egreso: number;
  dias_apoyados: number;
  ajuste_manual: number | null;
}

export interface PresupuestoRepartoSocio extends Auditable {
  id: string;
  empresa_id: string;
  periodo_id: string;
  socio_id: string;
  ejecutado: number;
}

// ── RPC get_presupuesto_resumen ──────────────────────────────────────────────
export interface ResumenSubrubro {
  codigo: number;
  nombre: string;
  presupuestado: number;
  por_pagar: number;
  ejecutado: number;
}

export interface ResumenRubro extends ResumenSubrubro {
  subrubros: ResumenSubrubro[];
}

export interface PresupuestoResumen {
  periodo: { id: string; mes: string; saldo_inicial: number; facturado: number; cerrado: boolean };
  recaudo: number;
  recaudo_real: number;
  meta_porcentual: number | null;
  total_presupuestado: number;
  total_ejecutado: number;
  saldo_final: number;
  rubros: ResumenRubro[];
}

// ── RPC get_presupuesto_centros (2026_11_13_02) ──────────────────────────────
export interface ResumenCentro {
  centro_id: string | null; // null = "Sin centro"
  nombre: string;
  presupuestado: number;
  ejecutado: number;
}

// ── RPC get_presupuesto_tendencia (2026_11_14_01) ────────────────────────────
export interface TendenciaMes {
  mes: string;
  saldo_inicial: number;
  recaudo: number;
  total_ejecutado: number;
  saldo_final: number;
}

export function repartoPresupuestadoSocio(saldoFinal: number, porcentaje: number): number {
  return Math.round(saldoFinal * porcentaje);
}

export function sumaPorcentajes(socios: { porcentaje: number; activo: boolean }[]): number {
  return socios.filter((s) => s.activo).reduce((acc, s) => acc + s.porcentaje, 0);
}
