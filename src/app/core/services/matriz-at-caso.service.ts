import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import {
  MatrizAtCaso,
  MatrizAtInvestigacion,
  MatrizAtAccion,
  FiltrosCaso,
  Gravedad,
  EstadoReporteArl,
  EstadoInvestigacion,
  EstadoAccionCalc,
  CatalogoItemAt,
  SedeLite,
  ParametrosMensuales,
  DIAS_CARGADOS_MUERTE,
} from '../models/matriz-at.model';

/**
 * Registro de casos de accidentes/incidentes de trabajo, su investigación y
 * acciones correctivas, más las reglas de negocio de plazos legales:
 *  - Reporte a la ARL: inmediato si grave/mortal, 2 días hábiles en los demás
 *    casos (Res. 156/2005).
 *  - Investigación: 15 días calendario desde el evento (Res. 1401/2007).
 *
 * Sigue la convención de PlanAnualService/IpercService: métodos async tipados
 * sobre `this.sb.client` y funciones de negocio puras y testeables.
 */
@Injectable({ providedIn: 'root' })
export class MatrizAtCasoService {

  /**
   * Festivos nacionales (ISO 'YYYY-MM-DD') para el cálculo de días hábiles.
   * Se deja vacío deliberadamente: los festivos colombianos (Ley Emiliani) no
   * se codifican aquí para no fijar fechas sin fuente verificada. Aliméntalo
   * desde un catálogo/servicio de festivos cuando esté disponible.
   */
  private festivos = new Set<string>();

  constructor(
    private sb: SupabaseClientService,
    private tenant: TenantService,
  ) {}

  setFestivos(fechasIso: string[]): void {
    this.festivos = new Set(fechasIso);
  }

  // ── Tenant (delegación) ────────────────────────────────────────────────────
  isAdministrador() { return this.tenant.isAdministrador(); }
  listarEmpresasDisponibles() { return this.tenant.listarEmpresasDisponibles(); }
  getEmpresaTenantId() { return this.tenant.getEmpresaTenantId(); }
  getEmpresaPorId(id: string) { return this.tenant.getEmpresaPorId(id); }

  // ── Catálogos ─────────────────────────────────────────────────────────────
  private async catalogo(tabla: string): Promise<CatalogoItemAt[]> {
    const { data, error } = await this.sb.client
      .from(tabla).select('id, nombre, codigo').eq('activo', true).order('orden');
    if (error) throw error;
    return (data ?? []) as CatalogoItemAt[];
  }
  getAgentes() { return this.catalogo('catalogo_agente_accidente'); }
  getMecanismos() { return this.catalogo('catalogo_mecanismo_lesion'); }
  getPartesCuerpo() { return this.catalogo('catalogo_parte_cuerpo'); }
  getTiposLesion() { return this.catalogo('catalogo_tipo_lesion'); }
  getSitios() { return this.catalogo('catalogo_sitio_ocurrencia'); }

  async getPeligros(): Promise<CatalogoItemAt[]> {
    const { data, error } = await this.sb.client
      .from('sst_peligros_catalogo').select('id, clasificacion, descripcion')
      .eq('activo', true).order('clasificacion');
    if (error) throw error;
    return (data ?? []).map((p: any) => ({ id: p.id, nombre: `${p.clasificacion} — ${p.descripcion}` }));
  }

  async getResponsables(): Promise<CatalogoItemAt[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_responsable_plan').select('id, nombre').eq('activo', true).order('orden');
    if (error) throw error;
    return (data ?? []) as CatalogoItemAt[];
  }

  // ── Parámetros mensuales ────────────────────────────────────────────────────
  async getParametros(empresaId: string, anio: number): Promise<ParametrosMensuales[]> {
    const { data, error } = await this.sb.client
      .from('matriz_at_parametros_mensuales')
      .select('*').eq('empresa_id', empresaId).eq('anio', anio).order('mes');
    if (error) throw error;
    return (data ?? []) as ParametrosMensuales[];
  }

  async upsertParametro(p: ParametrosMensuales): Promise<void> {
    const { error } = await this.sb.client
      .from('matriz_at_parametros_mensuales')
      .upsert(p, { onConflict: 'empresa_id,anio,mes' });
    if (error) throw error;
  }

  async getSedes(empresaId: string): Promise<SedeLite[]> {
    const { data, error } = await this.sb.client
      .from('sedes').select('id, nombre, municipio').eq('empresa_id', empresaId).order('nombre');
    if (error) throw error;
    return (data ?? []) as SedeLite[];
  }

  // ── Evidencia fotográfica (Storage) ─────────────────────────────────────────
  private readonly BUCKET = 'matriz-at-evidencias';

  async subirEvidencia(empresaId: string, casoId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${empresaId}/${casoId}/${Date.now()}.${ext}`;
    const { error } = await this.sb.client.storage.from(this.BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  }

  async urlFirmadaEvidencia(path: string): Promise<string | null> {
    const { data, error } = await this.sb.client.storage.from(this.BUCKET)
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  // ── CRUD casos ──────────────────────────────────────────────────────────────
  async listarCasos(empresaId: string, filtros: FiltrosCaso = {}): Promise<MatrizAtCaso[]> {
    let q = this.sb.client
      .from('matriz_at_casos')
      .select(`
        *,
        tipo_lesion:catalogo_tipo_lesion(nombre,codigo),
        investigacion:matriz_at_investigacion(*),
        acciones:matriz_at_acciones(*)
      `)
      .eq('empresa_id', empresaId);

    if (filtros.sedeId) q = q.eq('sede_id', filtros.sedeId);
    if (filtros.tipoEvento) q = q.eq('tipo_evento', filtros.tipoEvento);
    if (filtros.gravedad) q = q.eq('clasificacion_gravedad', filtros.gravedad);
    if (filtros.areaProceso) q = q.eq('area_proceso', filtros.areaProceso);
    if (filtros.estado) q = q.eq('estado_caso', filtros.estado);
    if (filtros.parteCuerpoIds?.length) q = q.in('parte_cuerpo_id', filtros.parteCuerpoIds);
    if (filtros.desde) q = q.gte('fecha_hora_evento', filtros.desde);
    if (filtros.hasta) q = q.lte('fecha_hora_evento', filtros.hasta);

    const { data, error } = await q.order('fecha_hora_evento', { ascending: false });
    if (error) throw error;

    const casos = (data ?? []) as MatrizAtCaso[];
    for (const c of casos) {
      // Supabase devuelve la relación 1:1 como array; normalizar a objeto.
      const inv = c.investigacion as unknown as MatrizAtInvestigacion[] | MatrizAtInvestigacion | null;
      c.investigacion = Array.isArray(inv) ? (inv[0] ?? null) : inv;
      for (const a of c.acciones ?? []) a.estadoCalculado = this.marcarEstadoAccion(a);
    }
    return casos;
  }

  async getCaso(id: string): Promise<MatrizAtCaso> {
    const { data, error } = await this.sb.client
      .from('matriz_at_casos')
      .select(`*, tipo_lesion:catalogo_tipo_lesion(nombre,codigo), investigacion:matriz_at_investigacion(*), acciones:matriz_at_acciones(*)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    const caso = data as MatrizAtCaso;
    const inv = caso.investigacion as unknown as MatrizAtInvestigacion[] | MatrizAtInvestigacion | null;
    caso.investigacion = Array.isArray(inv) ? (inv[0] ?? null) : inv;
    for (const a of caso.acciones ?? []) a.estadoCalculado = this.marcarEstadoAccion(a);
    return caso;
  }

  async crearCaso(caso: MatrizAtCaso): Promise<MatrizAtCaso> {
    this.validarCaso(caso);
    const payload = { ...caso };

    // Mortal: días de incapacidad no aplica; se usan los días cargados oficiales.
    if (payload.clasificacion_gravedad === 'mortal') {
      payload.dias_incapacidad = null;
      payload.dias_cargados = DIAS_CARGADOS_MUERTE;
      payload.dias_cargados_id = await this.getDiasCargadosMuerteId();
    }

    const perfil = await this.tenant.getPerfilSeguro();
    const { data, error } = await this.sb.client
      .from('matriz_at_casos')
      .insert({ ...payload, created_by: perfil?.id })
      .select()
      .single();
    if (error) throw error;
    return data as MatrizAtCaso;
  }

  async actualizarCaso(id: string, cambios: Partial<MatrizAtCaso>): Promise<void> {
    if (cambios.clasificacion_gravedad === 'mortal') {
      cambios.dias_incapacidad = null;
      cambios.dias_cargados = DIAS_CARGADOS_MUERTE;
      cambios.dias_cargados_id = await this.getDiasCargadosMuerteId();
    }
    const { investigacion, acciones, ...limpio } = cambios as any;
    const { error } = await this.sb.client
      .from('matriz_at_casos')
      .update(limpio)
      .eq('id', id);
    if (error) throw error;
  }

  async eliminarCaso(id: string): Promise<void> {
    const { error } = await this.sb.client.from('matriz_at_casos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Investigación (1:1) ──────────────────────────────────────────────────────
  async upsertInvestigacion(inv: MatrizAtInvestigacion): Promise<void> {
    const { error } = await this.sb.client
      .from('matriz_at_investigacion')
      .upsert(inv, { onConflict: 'caso_id' });
    if (error) throw error;
  }

  // ── Acciones ──────────────────────────────────────────────────────────────────
  async crearAccion(accion: MatrizAtAccion): Promise<MatrizAtAccion> {
    const { estadoCalculado, ...payload } = accion;
    const { data, error } = await this.sb.client
      .from('matriz_at_acciones').insert(payload).select().single();
    if (error) throw error;
    return data as MatrizAtAccion;
  }

  async actualizarAccion(id: string, cambios: Partial<MatrizAtAccion>): Promise<void> {
    const { estadoCalculado, ...limpio } = cambios;
    const { error } = await this.sb.client
      .from('matriz_at_acciones').update(limpio).eq('id', id);
    if (error) throw error;
  }

  async eliminarAccion(id: string): Promise<void> {
    const { error } = await this.sb.client.from('matriz_at_acciones').delete().eq('id', id);
    if (error) throw error;
  }

  // ══ Reglas de negocio (puras) ═════════════════════════════════════════════════

  /** Validación mínima antes de guardar. */
  validarCaso(caso: MatrizAtCaso): void {
    const faltantes: string[] = [];
    if (!caso.tipo_evento) faltantes.push('tipo de evento');
    if (!caso.fecha_hora_evento) faltantes.push('fecha y hora del evento');
    if (!caso.clasificacion_gravedad) faltantes.push('clasificación de gravedad');
    if (faltantes.length) {
      throw new Error(`Faltan campos obligatorios: ${faltantes.join(', ')}.`);
    }
    if (caso.dias_incapacidad != null && caso.dias_incapacidad < 0) {
      throw new Error('Los días de incapacidad no pueden ser negativos.');
    }
  }

  /** Grave o mortal ⇒ reporte inmediato a la ARL (Res. 156/2005). */
  esReporteInmediatoArl(g: Gravedad | null): boolean {
    return g === 'grave' || g === 'mortal';
  }

  /** Fecha límite de reporte a la ARL: 2 días hábiles desde el evento. */
  fechaLimiteReporteArl(fechaEvento: string): string {
    return this.agregarDiasHabiles(fechaEvento, 2);
  }

  estadoReporteArl(caso: MatrizAtCaso): EstadoReporteArl {
    if (this.esReporteInmediatoArl(caso.clasificacion_gravedad)) {
      return {
        modo: 'inmediato',
        limite: null,
        vencido: !caso.reportado_arl,   // inmediato: cualquier demora es incumplimiento
      };
    }
    const limite = this.fechaLimiteReporteArl(caso.fecha_hora_evento);
    const vencido = !caso.reportado_arl && this.hoyIso() > limite;
    return { modo: '2_dias', limite, vencido };
  }

  /** Fecha límite de investigación: 15 días calendario (Res. 1401/2007). */
  fechaLimiteInvestigacion(fechaEvento: string): string {
    const d = new Date(fechaEvento);
    d.setDate(d.getDate() + 15);
    return this.toIsoDate(d);
  }

  estadoInvestigacion(caso: MatrizAtCaso): EstadoInvestigacion {
    if (caso.tipo_evento !== 'accidente_trabajo') return 'no_aplica';
    if (caso.investigacion) return 'completa';
    const limite = this.fechaLimiteInvestigacion(caso.fecha_hora_evento);
    return this.hoyIso() > limite ? 'fuera_de_plazo' : 'en_plazo';
  }

  /** Estado calculado de una acción: 'vencida' si venció el compromiso sin cierre. */
  marcarEstadoAccion(a: MatrizAtAccion): EstadoAccionCalc {
    if (a.estado === 'cerrada') return 'cerrada';
    if (a.fecha_compromiso && this.hoyIso() > a.fecha_compromiso) return 'vencida';
    return a.estado;
  }

  async getDiasCargadosMuerteId(): Promise<string | null> {
    const { data, error } = await this.sb.client
      .from('catalogo_dias_cargados')
      .select('id')
      .eq('categoria', 'muerte')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data?.id as string) ?? null;
  }

  // ── Utilidades de fecha ────────────────────────────────────────────────────
  private hoyIso(): string {
    return this.toIsoDate(new Date());
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Suma `n` días hábiles a una fecha, saltando sábados, domingos y los
   * festivos cargados vía setFestivos(). Devuelve fecha ISO 'YYYY-MM-DD'.
   */
  private agregarDiasHabiles(fechaIso: string, n: number): string {
    const d = new Date(fechaIso);
    let restantes = n;
    while (restantes > 0) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();               // 0 = domingo, 6 = sábado
      const iso = this.toIsoDate(d);
      if (dow !== 0 && dow !== 6 && !this.festivos.has(iso)) restantes--;
    }
    return this.toIsoDate(d);
  }
}
