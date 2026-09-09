import { Injectable, Signal, computed, signal } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import {
  MatrizAtCaso,
  ParametrosMensuales,
  IndicadoresMes,
  IndicadoresPeriodo,
  ValorIndicador,
  DiasSinAccidentes,
  TrianguloBird,
  CumplimientoAcciones,
  AgrupacionesViz,
  ConteoEtiqueta,
  SerieMensual,
  AccionVencida,
  MESES_LABELS,
  K_GTC_3701,
} from '../models/matriz-at.model';

type CasoConCatalogos = MatrizAtCaso & {
  parte_cuerpo?: { id: string; nombre: string } | null;
  agente?: { id: string; nombre: string } | null;
  mecanismo?: { id: string; nombre: string } | null;
};

const TRIMESTRES: { periodo: (a: number) => string; meses: number[] }[] = [
  { periodo: (a) => `Q1 ${a}`, meses: [1, 2, 3] },
  { periodo: (a) => `Q2 ${a}`, meses: [4, 5, 6] },
  { periodo: (a) => `Q3 ${a}`, meses: [7, 8, 9] },
  { periodo: (a) => `Q4 ${a}`, meses: [10, 11, 12] },
];

/**
 * Motor de indicadores de accidentalidad. Estado reactivo con Signals y
 * derivados con computed(); el cálculo numérico vive en funciones puras
 * (calcularIndicadoresMes / calcularPeriodo) para poder testearse aislado.
 *
 * Convenciones normativas:
 *  - Res. 0312/2019 Art. 30: Frecuencia/Severidad/Tasa = razón × 100 sobre
 *    el N.º de trabajadores del periodo. NO usa constante K.
 *  - GTC 3701: Índice de Frecuencia/Severidad = razón × K sobre horas-hombre.
 *    K = 200.000 (Norma OSHA), configurable vía constanteK.
 *  - Agregación trimestral/anual: recálculo desde los conteos base (no
 *    promedio de promedios).
 */
@Injectable({ providedIn: 'root' })
export class MatrizAtIndicadoresService {

  // ── Estado (signals) ────────────────────────────────────────────────────────
  readonly empresaId = signal<string | null>(null);
  readonly anio = signal<number>(new Date().getFullYear());
  readonly constanteK = signal<number>(K_GTC_3701);
  readonly cargando = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Datos base
  private readonly _casos = signal<CasoConCatalogos[]>([]);        // casos del año
  private readonly _atFechasHist = signal<string[]>([]);          // fechas de todos los AT (histórico)
  private readonly _parametros = signal<ParametrosMensuales[]>([]);

  // ── Derivados (computed) ──────────────────────────────────────────────────────
  readonly indicadoresMensuales: Signal<IndicadoresMes[]> = computed(() => {
    const casos = this._casos();
    const params = this._parametros();
    const anio = this.anio();
    const k = this.constanteK();
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const casosMes = casos.filter((c) => this.mesDe(c.fecha_hora_evento) === mes);
      const param = params.find((p) => p.mes === mes) ?? null;
      return this.calcularIndicadoresMes(casosMes, param, k, anio, mes);
    });
  });

  readonly indicadoresTrimestrales: Signal<IndicadoresPeriodo[]> = computed(() => {
    const base = this.indicadoresMensuales();
    const anio = this.anio();
    return TRIMESTRES.map((t) =>
      this.calcularPeriodo(base, t.periodo(anio), t.meses, this.constanteK()));
  });

  readonly indicadorAnual: Signal<IndicadoresPeriodo> = computed(() =>
    this.calcularPeriodo(this.indicadoresMensuales(), `${this.anio()}`,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], this.constanteK()));

  readonly diasSinAccidentes: Signal<DiasSinAccidentes> = computed(() =>
    this.calcularDiasSinAccidentes(this._atFechasHist()));

  // Período que controla los agregados del tablero (Bird, Pareto, área, cuerpo).
  readonly periodoTipo = signal<'mes' | 'trim' | 'anio'>('anio');
  readonly periodoMes = signal<number>(new Date().getMonth() + 1);
  readonly periodoTrim = signal<number>(0);

  private readonly casosPeriodo = computed<CasoConCatalogos[]>(() => {
    const t = this.periodoTipo();
    if (t === 'anio') return this._casos();
    const meses = t === 'mes'
      ? [this.periodoMes()]
      : [this.periodoTrim() * 3 + 1, this.periodoTrim() * 3 + 2, this.periodoTrim() * 3 + 3];
    return this._casos().filter((c) => meses.includes(this.mesDe(c.fecha_hora_evento)));
  });

  readonly trianguloBird: Signal<TrianguloBird> = computed(() =>
    this.calcularTriangulo(this.casosPeriodo()));

  readonly cumplimientoAcciones: Signal<CumplimientoAcciones> = computed(() =>
    this.calcularCumplimiento(this._casos()));

  /** Acciones vencidas (compromiso pasado, sin cierre) para el bloque de foco SST. */
  readonly accionesVencidas: Signal<AccionVencida[]> = computed(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const out: AccionVencida[] = [];
    for (const c of this._casos()) {
      for (const a of c.acciones ?? []) {
        if (a.estado !== 'cerrada' && a.fecha_compromiso && hoy > a.fecha_compromiso) {
          out.push({
            casoId: c.id!,
            descripcion: a.descripcion_accion,
            responsable: a.responsable_texto ?? '—',
            fechaCompromiso: a.fecha_compromiso,
            diasVencido: this.diffDias(new Date(a.fecha_compromiso), new Date(hoy)),
          });
        }
      }
    }
    return out.sort((x, y) => y.diasVencido - x.diasVencido);
  });

  readonly agrupaciones: Signal<AgrupacionesViz> = computed(() =>
    this.calcularAgrupaciones(this.casosPeriodo()));

  readonly serieFrecuencia: Signal<SerieMensual> = computed(() => ({
    label: 'Frecuencia de accidentalidad',
    puntos: this.indicadoresMensuales().map((m) => m.frecuenciaAccidentalidad.valor),
  }));
  readonly serieSeveridad: Signal<SerieMensual> = computed(() => ({
    label: 'Severidad de accidentalidad',
    puntos: this.indicadoresMensuales().map((m) => m.severidadAccidentalidad.valor),
  }));
  readonly serieTasa: Signal<SerieMensual> = computed(() => ({
    label: 'Tasa de accidentalidad',
    puntos: this.indicadoresMensuales().map((m) => m.tasaAccidentalidad.valor),
  }));
  readonly serieAtVsIncidentes: Signal<{ at: (number | null)[]; incidentes: (number | null)[] }> =
    computed(() => ({
      at: this.indicadoresMensuales().map((m) => m.numAt),
      incidentes: this.indicadoresMensuales().map((m) => m.numIncidentes),
    }));

  constructor(private sb: SupabaseClientService) {}

  // ── Control ──────────────────────────────────────────────────────────────────
  setEmpresa(id: string): void { this.empresaId.set(id); }
  setAnio(a: number): void { this.anio.set(a); }
  setConstanteK(k: number): void { this.constanteK.set(k); }
  setPeriodo(tipo: 'mes' | 'trim' | 'anio', mes: number, trim: number): void {
    this.periodoTipo.set(tipo);
    this.periodoMes.set(mes);
    this.periodoTrim.set(trim);
  }

  async cargar(empresaId: string, anio: number): Promise<void> {
    this.empresaId.set(empresaId);
    this.anio.set(anio);
    this.cargando.set(true);
    this.error.set(null);
    try {
      const desde = `${anio}-01-01`;
      const hasta = `${anio}-12-31T23:59:59`;

      const [casosRes, histRes, paramRes] = await Promise.all([
        this.sb.client
          .from('matriz_at_casos')
          .select(`
            *,
            acciones:matriz_at_acciones(*),
            investigacion:matriz_at_investigacion(id),
            parte_cuerpo:catalogo_parte_cuerpo(id,nombre),
            agente:catalogo_agente_accidente(id,nombre),
            mecanismo:catalogo_mecanismo_lesion(id,nombre)
          `)
          .eq('empresa_id', empresaId)
          .gte('fecha_hora_evento', desde)
          .lte('fecha_hora_evento', hasta),
        this.sb.client
          .from('matriz_at_casos')
          .select('fecha_hora_evento')
          .eq('empresa_id', empresaId)
          .eq('tipo_evento', 'accidente_trabajo')
          .order('fecha_hora_evento', { ascending: true }),
        this.sb.client
          .from('matriz_at_parametros_mensuales')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('anio', anio),
      ]);

      if (casosRes.error) throw casosRes.error;
      if (histRes.error) throw histRes.error;
      if (paramRes.error) throw paramRes.error;

      const casos = (casosRes.data ?? []) as CasoConCatalogos[];
      for (const c of casos) {
        const inv = c.investigacion as unknown as any[] | null;
        c.investigacion = Array.isArray(inv) ? (inv[0] ?? null) : inv;
      }
      this._casos.set(casos);
      this._atFechasHist.set((histRes.data ?? []).map((r: any) => r.fecha_hora_evento));
      this._parametros.set((paramRes.data ?? []) as ParametrosMensuales[]);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error cargando indicadores.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ══ Cálculo puro ═══════════════════════════════════════════════════════════════

  calcularIndicadoresMes(
    casosMes: MatrizAtCaso[],
    param: ParametrosMensuales | null,
    k: number,
    anio: number,
    mes: number,
  ): IndicadoresMes {
    const at = casosMes.filter((c) => c.tipo_evento === 'accidente_trabajo');
    const numAt = at.length;
    const numAtMortales = at.filter((c) => c.clasificacion_gravedad === 'mortal').length;
    const numIncidentes = casosMes.filter((c) => c.tipo_evento === 'incidente_casi_accidente').length;
    const diasIncapacidad = at.reduce((s, c) => s + (c.dias_incapacidad ?? 0), 0);
    const diasCargados = at.reduce((s, c) => s + (c.dias_cargados ?? 0), 0);
    const numTrab = param ? param.numero_trabajadores : null;
    const hh = param?.horas_hombre ?? null;

    return {
      anio, mes, label: MESES_LABELS[mes - 1],
      numAt, numAtMortales, numIncidentes, diasIncapacidad, diasCargados,
      numTrabajadores: numTrab, horasHombre: hh,
      frecuenciaAccidentalidad: this.razonPor100(numAt, numTrab, param?.meta_tasa_accidentalidad ?? null, !param),
      severidadAccidentalidad: this.razonPor100(diasIncapacidad + diasCargados, numTrab, param?.meta_severidad ?? null, !param),
      tasaAccidentalidad: this.razonPor100(numAt, numTrab, param?.meta_tasa_accidentalidad ?? null, !param),
      indiceFrecuencia: this.razonPorK(numAt, hh, k, param?.meta_if ?? null, !param),
      indiceSeveridad: this.razonPorK(diasIncapacidad + diasCargados, hh, k, param?.meta_is ?? null, !param),
      indiceLesionIncapacitante: this.ili(numAt, diasIncapacidad + diasCargados, hh, k, !param),
    };
  }

  calcularPeriodo(base: IndicadoresMes[], periodo: string, meses: number[], k: number): IndicadoresPeriodo {
    const sel = base.filter((m) => meses.includes(m.mes));
    const numAt = sum(sel.map((m) => m.numAt));
    const numAtMortales = sum(sel.map((m) => m.numAtMortales));
    const numIncidentes = sum(sel.map((m) => m.numIncidentes));
    const diasIncapacidad = sum(sel.map((m) => m.diasIncapacidad));
    const diasCargados = sum(sel.map((m) => m.diasCargados));

    const conParam = sel.filter((m) => m.numTrabajadores != null);
    const faltanParam = conParam.length === 0;
    const trabajadoresProm = faltanParam
      ? null
      : Math.round(sum(conParam.map((m) => m.numTrabajadores!)) / conParam.length);

    const conHh = sel.filter((m) => m.horasHombre != null);
    const hhTotal = conHh.length === 0 ? null : sum(conHh.map((m) => m.horasHombre!));

    const mortal: ValorIndicador = numAt > 0
      ? { valor: round2((numAtMortales / numAt) * 100), estado: 'ok', meta: null, cumpleMeta: null }
      : { valor: null, estado: 'sin_datos', meta: null, cumpleMeta: null };

    return {
      periodo, meses,
      numAt, numAtMortales, numIncidentes, diasIncapacidad, diasCargados,
      trabajadoresProm, horasHombreTotal: hhTotal,
      frecuenciaAccidentalidad: this.razonPor100(numAt, trabajadoresProm, null, faltanParam),
      severidadAccidentalidad: this.razonPor100(diasIncapacidad + diasCargados, trabajadoresProm, null, faltanParam),
      tasaAccidentalidad: this.razonPor100(numAt, trabajadoresProm, null, faltanParam),
      indiceFrecuencia: this.razonPorK(numAt, hhTotal, k, null, hhTotal == null),
      indiceSeveridad: this.razonPorK(diasIncapacidad + diasCargados, hhTotal, k, null, hhTotal == null),
      indiceLesionIncapacitante: this.ili(numAt, diasIncapacidad + diasCargados, hhTotal, k, hhTotal == null),
      proporcionMortalidad: mortal,
    };
  }

  calcularDiasSinAccidentes(fechasAt: string[]): DiasSinAccidentes {
    if (fechasAt.length === 0) {
      return { dias: null, fechaUltimoAt: null, record: null };
    }
    const fechas = [...fechasAt].sort();
    const ultimo = fechas[fechas.length - 1];
    const hoy = new Date();
    const dias = Math.max(0, this.diffDias(new Date(ultimo), hoy));

    // Récord: mayor separación entre AT consecutivos, y racha actual hasta hoy.
    let record = dias;
    for (let i = 1; i < fechas.length; i++) {
      const gap = this.diffDias(new Date(fechas[i - 1]), new Date(fechas[i]));
      if (gap > record) record = gap;
    }
    return { dias, fechaUltimoAt: ultimo, record };
  }

  calcularTriangulo(casos: MatrizAtCaso[]): TrianguloBird {
    const at = casos.filter((c) => c.tipo_evento === 'accidente_trabajo');
    const mortal = at.filter((c) => c.clasificacion_gravedad === 'mortal').length;
    const grave = at.filter((c) => c.clasificacion_gravedad === 'grave').length;
    const leve = at.filter((c) => c.clasificacion_gravedad === 'leve').length;
    const casiAccidente = casos.filter((c) => c.tipo_evento === 'incidente_casi_accidente').length;

    let ratio = `${mortal} : ${grave} : ${leve} : ${casiAccidente}`;
    if (mortal > 0) {
      const n = (x: number) => Math.round((x / mortal) * 10) / 10;
      ratio = `1 : ${n(grave)} : ${n(leve)} : ${n(casiAccidente)}`;
    }
    return { mortal, grave, leve, casiAccidente, ratio };
  }

  calcularCumplimiento(casos: MatrizAtCaso[]): CumplimientoAcciones {
    const acciones = casos.reduce<NonNullable<MatrizAtCaso['acciones']>>(
      (acc, c) => acc.concat(c.acciones ?? []), []);
    const hoy = new Date().toISOString().slice(0, 10);
    let cerradasATiempo = 0, cerradasTarde = 0, vencidas = 0, pendientes = 0, enProgreso = 0;

    for (const a of acciones) {
      if (a.estado === 'cerrada') {
        const aTiempo = !a.fecha_compromiso || !a.fecha_cierre || a.fecha_cierre <= a.fecha_compromiso;
        aTiempo ? cerradasATiempo++ : cerradasTarde++;
      } else if (a.fecha_compromiso && hoy > a.fecha_compromiso) {
        vencidas++;
      } else if (a.estado === 'en_progreso') {
        enProgreso++;
      } else {
        pendientes++;
      }
    }
    const total = acciones.length;
    const cerradas = cerradasATiempo + cerradasTarde;
    return {
      total, cerradasATiempo, cerradasTarde, vencidas, pendientes, enProgreso,
      pctCerradasATiempo: cerradas > 0 ? Math.round((cerradasATiempo / cerradas) * 100) : null,
    };
  }

  calcularAgrupaciones(casos: CasoConCatalogos[]): AgrupacionesViz {
    return {
      porParteCuerpo: this.agrupar(casos, (c) => c.parte_cuerpo?.id ?? null, (c) => c.parte_cuerpo?.nombre ?? 'Sin especificar'),
      porAgente: this.agrupar(casos, (c) => c.agente?.id ?? null, (c) => c.agente?.nombre ?? 'Sin especificar'),
      porMecanismo: this.agrupar(casos, (c) => c.mecanismo?.id ?? null, (c) => c.mecanismo?.nombre ?? 'Sin especificar'),
      porAreaProceso: this.agrupar(casos, (c) => c.area_proceso ?? null, (c) => c.area_proceso ?? 'Sin especificar'),
    };
  }

  // ── Helpers de cálculo ────────────────────────────────────────────────────────

  /** razón × 100 (Res. 0312). `faltaParam` marca pendiente de parámetros. */
  private razonPor100(num: number, den: number | null, meta: number | null, faltaParam: boolean): ValorIndicador {
    if (faltaParam || den == null) return { valor: null, estado: 'pendiente_parametros', meta, cumpleMeta: null };
    if (den === 0) return { valor: null, estado: 'sin_datos', meta, cumpleMeta: null };
    const valor = round2((num / den) * 100);
    return { valor, estado: 'ok', meta, cumpleMeta: meta != null ? valor <= meta : null };
  }

  /** razón × K (GTC 3701, horas-hombre). */
  private razonPorK(num: number, hh: number | null, k: number, meta: number | null, faltaParam: boolean): ValorIndicador {
    if (faltaParam || hh == null) return { valor: null, estado: 'pendiente_parametros', meta, cumpleMeta: null };
    if (hh === 0) return { valor: null, estado: 'sin_datos', meta, cumpleMeta: null };
    const valor = round2((num / hh) * k);
    return { valor, estado: 'ok', meta, cumpleMeta: meta != null ? valor <= meta : null };
  }

  /** Índice de Lesión Incapacitante = IF × IS / 1000 (GTC 3701 §6.4). */
  private ili(numAt: number, dias: number, hh: number | null, k: number, faltaParam: boolean): ValorIndicador {
    if (faltaParam || hh == null) return { valor: null, estado: 'pendiente_parametros', meta: null, cumpleMeta: null };
    if (hh === 0) return { valor: null, estado: 'sin_datos', meta: null, cumpleMeta: null };
    const iff = (numAt / hh) * k;
    const is = (dias / hh) * k;
    return { valor: round2((iff * is) / 1000), estado: 'ok', meta: null, cumpleMeta: null };
  }

  private agrupar(
    casos: CasoConCatalogos[],
    id: (c: CasoConCatalogos) => string | null,
    label: (c: CasoConCatalogos) => string,
  ): ConteoEtiqueta[] {
    const map = new Map<string, ConteoEtiqueta>();
    for (const c of casos) {
      const key = id(c) ?? '__null__';
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { id: id(c), label: label(c), count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }

  private mesDe(iso: string): number { return new Date(iso).getMonth() + 1; }

  private diffDias(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / 86_400_000);
  }
}

// ── Utilidades locales ──────────────────────────────────────────────────────
function sum(xs: number[]): number { return xs.reduce((s, x) => s + x, 0); }
function round2(x: number): number { return Math.round(x * 100) / 100; }
