import { Component, OnInit } from '@angular/core';
import { PlanAnualService } from '../../../../../core/services/plan-anual.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  CatalogItem,
  KpiResumen,
  PlanTrabajoActividad,
  PlanTrabajoAnalisisTrimestral,
  PlanTrabajoAnual,
  MESES_LABELS,
  TRIMESTRES,
} from '../../../../../core/models/plan-anual.model';
import { Empresa } from '../../../../../core/models/models';
import * as ExcelJS from 'exceljs';

@Component({
  selector: 'app-plan-anual-dashboard',
  templateUrl: './plan-anual-dashboard.component.html',
  styleUrls: ['./plan-anual-dashboard.component.scss'],
  standalone: false,
})
export class PlanAnualDashboardComponent implements OnInit {

  // ─── Estado de carga ───────────────────────────────────────────────────────
  inicializando = true;
  loadingDatos = false;
  errorMsg: string | null = null;

  // ─── Empresa / contexto ────────────────────────────────────────────────────
  esAdmin = false;
  empresasDisponibles: Empresa[] = [];
  empresaSeleccionadaId: string | null = null;
  empresa: Empresa | null = null;
  anioSeleccionado: number = new Date().getFullYear();
  aniosDisponibles: number[] = [];

  // ─── Plan ──────────────────────────────────────────────────────────────────
  plan: PlanTrabajoAnual | null = null;
  editandoEncabezado = false;
  guardandoEncabezado = false;
  encabezadoForm = { objetivo: '', alcance: '', recursos: '', meta: '', meta_porcentaje: 90 };
  encabezadoExpandido = true;

  // ─── Catálogos ─────────────────────────────────────────────────────────────
  fases: CatalogItem[] = [];
  programas: CatalogItem[] = [];
  gruposObjetivo: CatalogItem[] = [];
  responsables: CatalogItem[] = [];
  sedes: { id: string; nombre: string; municipio: string }[] = [];

  // ─── Actividades ───────────────────────────────────────────────────────────
  actividades: PlanTrabajoActividad[] = [];
  actividadesFiltradas: PlanTrabajoActividad[] = [];
  filtroFase = '';
  filtroPrograma = '';
  filtroGrupo = '';

  // ─── Modal actividad ───────────────────────────────────────────────────────
  mostrarModalActividad = false;
  actividadEditar: PlanTrabajoActividad | null = null;
  guardandoActividad = false;

  // ─── KPI ───────────────────────────────────────────────────────────────────
  kpi: KpiResumen | null = null;
  mesesLabels = MESES_LABELS;

  // ─── Análisis trimestral ───────────────────────────────────────────────────
  analisisList: PlanTrabajoAnalisisTrimestral[] = [];
  trimestres = TRIMESTRES;
  guardandoTrimestre: number | null = null;

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  tabActivo: 'planeacion' | 'plan-accion' = 'planeacion';

  // ─── Export ────────────────────────────────────────────────────────────────
  exportandoExcel = false;

  constructor(
    private svc: PlanAnualService,
    private auth: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.aniosDisponibles = this.generarAnios();
    this.inicializando = true;
    try {
      await this.auth.waitForReady();
      await this.auth.waitForProfile();
      this.esAdmin = await this.svc.isAdmin();
      if (this.esAdmin) {
        this.empresasDisponibles = await this.svc.listarEmpresas();
      } else {
        const empresa = await this.svc.getEmpresaActual();
        this.empresa = empresa;
        this.empresaSeleccionadaId = empresa.id ?? null;
        await this.cargarCatalogos();
        await this.cargarPlanCompleto();
      }
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error inicializando el módulo.';
    } finally {
      this.inicializando = false;
    }
  }

  generarAnios(): number[] {
    const hoy = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => hoy + 1 - i);
  }

  async onSeleccionEmpresa(id: string | null): Promise<void> {
    this.empresaSeleccionadaId = id;
    if (!id) { this.empresa = null; this.plan = null; this.actividades = []; return; }
    this.empresa = await this.svc.getEmpresaActual(id);
    await this.cargarCatalogos();
    await this.cargarPlanCompleto();
  }

  async onSeleccionAnio(anio: number): Promise<void> {
    this.anioSeleccionado = anio;
    await this.cargarPlanCompleto();
  }

  async cargarCatalogos(): Promise<void> {
    if (!this.empresaSeleccionadaId) return;
    [this.fases, this.programas, this.gruposObjetivo, this.responsables, this.sedes] = await Promise.all([
      this.svc.getFases(),
      this.svc.getProgramas(),
      this.svc.getGruposObjetivo(),
      this.svc.getResponsables(),
      this.svc.getSedes(this.empresaSeleccionadaId),
    ]);
  }

  async cargarPlanCompleto(): Promise<void> {
    if (!this.empresaSeleccionadaId) return;
    this.loadingDatos = true;
    this.errorMsg = null;
    try {
      this.plan = await this.svc.getPlanPorEmpresaAnio(this.empresaSeleccionadaId, this.anioSeleccionado);
      if (this.plan) {
        this.sincronizarEncabezadoForm();
        await this.cargarActividades();
        await this.cargarAnalisis();
      } else {
        this.actividades = [];
        this.actividadesFiltradas = [];
        this.kpi = null;
        this.analisisList = [];
      }
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error cargando el plan.';
    } finally {
      this.loadingDatos = false;
    }
  }

  private sincronizarEncabezadoForm(): void {
    if (!this.plan) return;
    this.encabezadoForm = {
      objetivo: this.plan.objetivo ?? '',
      alcance: this.plan.alcance ?? '',
      recursos: this.plan.recursos ?? '',
      meta: this.plan.meta ?? '',
      meta_porcentaje: this.plan.meta_porcentaje ?? 90,
    };
  }

  private async cargarActividades(): Promise<void> {
    if (!this.plan?.id) return;
    this.actividades = await this.svc.listarActividades(this.plan.id);
    this.aplicarFiltros();
    this.kpi = this.svc.calcularKpi(this.actividades, this.plan?.meta_porcentaje ?? 90);
  }

  private async cargarAnalisis(): Promise<void> {
    if (!this.plan?.id) return;
    this.analisisList = await this.svc.listarAnalisis(this.plan.id);
  }

  aplicarFiltros(): void {
    this.actividadesFiltradas = this.actividades.filter(a => {
      const okFase = !this.filtroFase || a.fases.includes(this.filtroFase);
      const okProg = !this.filtroPrograma || a.programa_id === this.filtroPrograma;
      const okGrupo = !this.filtroGrupo || a.grupo_objetivo_id === this.filtroGrupo;
      return okFase && okProg && okGrupo;
    });
  }

  // ─── PLAN: crear / guardar ─────────────────────────────────────────────────

  async crearNuevoPlan(): Promise<void> {
    if (!this.empresaSeleccionadaId) return;
    this.guardandoEncabezado = true;
    try {
      this.plan = await this.svc.crearPlan({
        empresa_id: this.empresaSeleccionadaId,
        anio: this.anioSeleccionado,
        estado: 'Borrador',
        meta_porcentaje: 90,
      });
      this.sincronizarEncabezadoForm();
      this.actividades = [];
      this.actividadesFiltradas = [];
      this.analisisList = [];
      this.kpi = this.svc.calcularKpi([], 90);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'No se pudo crear el plan.';
    } finally {
      this.guardandoEncabezado = false;
    }
  }

  async guardarEncabezado(): Promise<void> {
    if (!this.plan?.id) return;
    this.guardandoEncabezado = true;
    try {
      await this.svc.actualizarPlan(this.plan.id, this.encabezadoForm);
      this.plan = { ...this.plan, ...this.encabezadoForm };
      this.kpi = this.svc.calcularKpi(this.actividades, this.plan.meta_porcentaje);
      this.editandoEncabezado = false;
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'No se pudo guardar el encabezado.';
    } finally {
      this.guardandoEncabezado = false;
    }
  }

  cancelarEdicionEncabezado(): void {
    this.sincronizarEncabezadoForm();
    this.editandoEncabezado = false;
  }

  // ─── ACTIVIDADES ───────────────────────────────────────────────────────────

  abrirNuevaActividad(): void {
    this.actividadEditar = null;
    this.mostrarModalActividad = true;
  }

  abrirEditarActividad(act: PlanTrabajoActividad): void {
    this.actividadEditar = { ...act, meses: act.meses ? [...act.meses] : [] };
    this.mostrarModalActividad = true;
  }

  async onActividadGuardada(): Promise<void> {
    this.mostrarModalActividad = false;
    await this.cargarActividades();
  }

  cerrarModalActividad(): void {
    this.mostrarModalActividad = false;
  }

  async eliminarActividad(act: PlanTrabajoActividad): Promise<void> {
    if (!confirm(`¿Eliminar la actividad "${act.actividad}"?`)) return;
    try {
      await this.svc.eliminarActividad(act.id!);
      await this.cargarActividades();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'No se pudo eliminar la actividad.';
    }
  }

  async toggleMes(act: PlanTrabajoActividad, mes: number, campo: 'programado' | 'ejecutado'): Promise<void> {
    const mesData = act.meses?.find(m => m.mes === mes);
    if (!mesData) return;
    const nuevoValor = !mesData[campo];
    mesData[campo] = nuevoValor;
    try {
      await this.svc.actualizarMes(act.id!, mes, { [campo]: nuevoValor });
      this.kpi = this.svc.calcularKpi(this.actividades, this.plan?.meta_porcentaje ?? 90);
    } catch (e: any) {
      mesData[campo] = !nuevoValor; // revertir
      this.errorMsg = e?.message ?? 'Error actualizando el mes.';
    }
  }

  // ─── ANÁLISIS TRIMESTRAL ───────────────────────────────────────────────────

  getAnalisisPeriodo(periodo: number): PlanTrabajoAnalisisTrimestral {
    return this.analisisList.find(a => a.periodo === periodo) ?? {
      plan_id: this.plan?.id ?? '',
      periodo: periodo as 1 | 2 | 3 | 4,
    };
  }

  async guardarAnalisis(periodo: number, datos: Partial<PlanTrabajoAnalisisTrimestral>): Promise<void> {
    if (!this.plan?.id) return;
    this.guardandoTrimestre = periodo;
    try {
      await this.svc.upsertAnalisis({
        plan_id: this.plan.id,
        periodo: periodo as 1 | 2 | 3 | 4,
        ...datos,
      });
      await this.cargarAnalisis();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'No se pudo guardar el análisis.';
    } finally {
      this.guardandoTrimestre = null;
    }
  }

  // ─── KPI helpers ───────────────────────────────────────────────────────────

  semaforoKpi(porcentaje: number | null, meta: number): string {
    if (porcentaje === null) return 'text-slate-400';
    if (porcentaje >= meta) return 'text-emerald-400';
    if (porcentaje >= meta * 0.8) return 'text-amber-400';
    return 'text-red-400';
  }

  badgeSemaforo(porcentaje: number | null, meta: number): string {
    if (porcentaje === null) return 'bg-slate-700 text-slate-300';
    if (porcentaje >= meta) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (porcentaje >= meta * 0.8) return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    return 'bg-red-500/20 text-red-300 border border-red-500/30';
  }

  // ─── Helpers UI ────────────────────────────────────────────────────────────

  get encabezadoSst(): { uen: string; localizacion: string; elaboradoPor: string; autorizado: string } {
    const e = this.empresa;
    if (!e) return { uen: '—', localizacion: '—', elaboradoPor: '—', autorizado: '—' };
    return {
      uen: e.nombre ?? '—',
      localizacion: e.municipio || (this.sedes.map(s => s.municipio).filter(Boolean).join(', ') || '—'),
      elaboradoPor: e.encargado_sst?.nombre ?? '—',
      autorizado: e.representante_legal?.nombre ?? '—',
    };
  }

  get gruposObjetivoConEmpresa(): CatalogItem[] {
    if (!this.empresa) return this.gruposObjetivo;
    const dinamico: CatalogItem = { id: '__empresa__', nombre: this.empresa.nombre, orden: 0, activo: true };
    return [dinamico, ...this.gruposObjetivo];
  }

  porcentajeActividadCumplimiento(act: PlanTrabajoActividad): number {
    const prog = act.meses?.filter(m => m.programado).length ?? 0;
    const ejec = act.meses?.filter(m => m.ejecutado).length ?? 0;
    return prog > 0 ? Math.round((ejec / prog) * 100) : 0;
  }

  programaNombre(act: PlanTrabajoActividad): string {
    return act.programa?.nombre ?? this.programas.find(p => p.id === act.programa_id)?.nombre ?? '—';
  }

  grupoNombre(act: PlanTrabajoActividad): string {
    if (act.grupo_objetivo_custom) return act.grupo_objetivo_custom;
    return act.grupo_objetivo?.nombre ?? this.gruposObjetivo.find(g => g.id === act.grupo_objetivo_id)?.nombre ?? '—';
  }

  responsableNombre(act: PlanTrabajoActividad): string {
    return act.responsable?.nombre ?? this.responsables.find(r => r.id === act.responsable_id)?.nombre ?? '—';
  }

  getMes(act: PlanTrabajoActividad, mes: number): { programado: boolean; ejecutado: boolean } {
    return act.meses?.find(m => m.mes === mes) ?? { programado: false, ejecutado: false };
  }

  trimestreActual(): number {
    const m = new Date().getMonth() + 1;
    return Math.ceil(m / 3);
  }

  porcentajeTrimestre(periodo: number): number | null {
    if (!this.kpi) return null;
    const t = TRIMESTRES.find(t => t.periodo === periodo);
    if (!t) return null;
    return this.svc.calcularPorcentajeTrimestre(this.kpi, t.meses);
  }

  // ─── Chart data for SVG ────────────────────────────────────────────────────
  get cumplimientoChart(): {
    metaY: number; meta: number;
    bars: { label: string; pct: number | null; pctTxt: string; bh: number; bx: number; bw: number; by: number; lblY: number; axX: number; axY: number; color: string }[];
  } | null {
    if (!this.kpi) return null;
    const H = 170, TOP = 28, LEFT = 20, TOTAL_W = 548;
    const slotW = TOTAL_W / 12;
    const barW = Math.max(16, slotW * 0.5);
    const meta = this.plan?.meta_porcentaje ?? 90;
    const metaY = TOP + (1 - meta / 100) * H;
    return {
      metaY,
      meta,
      bars: this.kpi.meses.map((m, i) => {
        const pct = m.porcentaje ?? 0;
        const bh = (pct / 100) * H;
        const bx = LEFT + i * slotW + (slotW - barW) / 2;
        const cumple = m.porcentaje !== null && m.porcentaje >= meta;
        return {
          label: m.label,
          pct: m.porcentaje,
          pctTxt: m.porcentaje !== null ? `${m.porcentaje}%` : '0%',
          bh,
          bx,
          bw: barW,
          by: TOP + H - bh,
          lblY: TOP + H - bh - 4,
          axX: LEFT + i * slotW + slotW / 2,
          axY: TOP + H + 16,
          color: m.porcentaje === null ? '#6b7280' : cumple ? '#86efac' : '#fca5a5',
        };
      }),
    };
  }

  // ─── Excel Export ──────────────────────────────────────────────────────────
  async exportarExcel(): Promise<void> {
    if (!this.plan) return;
    this.exportandoExcel = true;
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'ALNILAM 360 – SG-SST';
      wb.created = new Date();

      const ws = wb.addWorksheet('Plan Anual', {
        views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      });

      const NCOLS = 20;
      ws.columns = [
        { width: 11 }, { width: 23 }, { width: 32 }, { width: 13 }, { width: 19 },
        { width: 21 }, { width: 14 },
        { width: 5.5 }, { width: 5.5 }, { width: 5.5 }, { width: 5.5 }, { width: 5.5 }, { width: 5.5 },
        { width: 5.5 }, { width: 5.5 }, { width: 5.5 }, { width: 5.5 }, { width: 5.5 }, { width: 5.5 },
        { width: 20 },
      ];

      const c = (row: number, col: number) => ws.getCell(row, col);
      const merge = (r1: number, c1: number, r2: number, c2: number) => {
        try { ws.mergeCells(r1, c1, r2, c2); } catch (_) {}
      };
      const THIN = { style: 'thin' as ExcelJS.BorderStyle };
      const borders: Partial<ExcelJS.Borders> = { top: THIN, bottom: THIN, left: THIN, right: THIN };

      const hdrStyle = (argb = '1F4E79'): Partial<ExcelJS.Style> => ({
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb } } as ExcelJS.Fill,
        font: { bold: true, size: 9, color: { argb: 'FFFFFFFF' }, name: 'Calibri' },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: borders,
      });
      const cellStyle = (bold = false, center = false, bgArgb?: string): Partial<ExcelJS.Style> => ({
        font: { size: 9, name: 'Calibri', bold },
        alignment: { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: true },
        border: borders,
        ...(bgArgb ? { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } } as ExcelJS.Fill } : {}),
      });

      let r = 1;

      // ── ROW 1: TITLE ───────────────────────────────────────────────────────
      ws.getRow(r).height = 40;
      merge(r, 1, r, NCOLS);
      c(r, 1).value = 'PLAN DE TRABAJO ANUAL DEL SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO (SG-SST)';
      c(r, 1).style = { ...hdrStyle('1F3864'), font: { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Calibri' } };
      r++;

      // ── ROW 2: IDENTITY ────────────────────────────────────────────────────
      const enc = this.encabezadoSst;
      ws.getRow(r).height = 22;
      const lblStyle = hdrStyle('2E75B6');
      [
        [1, 2, 'UEN / Empresa', enc.uen, 3, 4],
        [5, 5, 'Localización', enc.localizacion, 6, 7],
        [8, 8, 'AÑO', String(this.anioSeleccionado), 9, 9],
        [10, 12, 'Elaborado y Revisado', enc.elaboradoPor, 13, 15],
        [16, 17, 'Autorizado', enc.autorizado, 18, NCOLS],
      ].forEach(([lc1, lc2, lbl, val, vc1, vc2]) => {
        if (lc1 !== lc2) merge(r, lc1 as number, r, lc2 as number);
        c(r, lc1 as number).value = lbl as string;
        c(r, lc1 as number).style = lblStyle;
        if (vc1 !== vc2) merge(r, vc1 as number, r, vc2 as number);
        c(r, vc1 as number).value = val as string;
        c(r, vc1 as number).style = cellStyle(true);
      });
      r++;

      // ── SECTIONS 1-4 ───────────────────────────────────────────────────────
      const addSection = (titulo: string, texto: string, height = 34) => {
        ws.getRow(r).height = 16;
        merge(r, 1, r, NCOLS);
        c(r, 1).value = titulo; c(r, 1).style = hdrStyle();
        r++;
        ws.getRow(r).height = height;
        merge(r, 1, r, NCOLS);
        c(r, 1).value = texto || '—';
        c(r, 1).style = cellStyle(false, false);
        r++;
      };
      addSection('1. OBJETIVO DEL PLAN', this.plan!.objetivo ?? '', 40);
      addSection('2. ALCANCE', this.plan!.alcance ?? '', 50);
      addSection('3. RECURSOS', this.plan!.recursos ?? '');
      addSection('4. META', this.plan!.meta ?? '');

      // ── PLANEACIÓN HEADER ──────────────────────────────────────────────────
      ws.getRow(r).height = 18;
      merge(r, 1, r, NCOLS);
      c(r, 1).value = 'PLANEACIÓN'; c(r, 1).style = hdrStyle('2E4057');
      r++;

      // ── COLUMN HEADERS ─────────────────────────────────────────────────────
      ws.getRow(r).height = 28;
      ['FASE','PROGRAMA','ACTIVIDAD','CIUDAD','GRUPO OBJETIVO','RESPONSABLE','ESTADO',
        'Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','EVIDENCIA'
      ].forEach((h, i) => { c(r, i + 1).value = h; c(r, i + 1).style = hdrStyle(); });
      r++;

      // ── ACTIVIDADES ────────────────────────────────────────────────────────
      for (const act of this.actividades) {
        const rowP = r, rowE = r + 1;
        ws.getRow(rowP).height = 16; ws.getRow(rowE).height = 14;

        [
          [1, act.fases.join(' / ')],
          [2, this.programaNombre(act)],
          [3, act.actividad],
          [4, act.ciudad ?? '—'],
          [5, this.grupoNombre(act)],
          [6, this.responsableNombre(act)],
          [20, act.evidencia ?? ''],
        ].forEach(([col, val]) => {
          merge(rowP, col as number, rowE, col as number);
          c(rowP, col as number).value = val as string;
          c(rowP, col as number).style = cellStyle(false, false);
        });

        c(rowP, 7).value = 'Programado'; c(rowP, 7).style = cellStyle(false, true, 'DDEBF7');
        c(rowE, 7).value = 'Ejecutado';  c(rowE, 7).style = cellStyle(false, true, 'E2EFDA');

        for (let m = 0; m < 12; m++) {
          const mesData = act.meses?.find(x => x.mes === m + 1);
          c(rowP, 8 + m).value = mesData?.programado ? 'P' : '';
          c(rowP, 8 + m).style = cellStyle(true, true, mesData?.programado ? 'BDD7EE' : undefined);
          c(rowE, 8 + m).value = mesData?.ejecutado ? 'E' : '';
          c(rowE, 8 + m).style = cellStyle(true, true, mesData?.ejecutado ? 'C6EFCE' : undefined);
        }
        r += 2;
      }

      // ── MEDICIÓN Y SEGUIMIENTO ─────────────────────────────────────────────
      ws.getRow(r).height = 16;
      merge(r, 1, r, NCOLS); c(r, 1).value = 'MEDICIÓN Y SEGUIMIENTO'; c(r, 1).style = hdrStyle();
      r++;

      if (this.kpi) {
        const kpiStart = r;
        merge(kpiStart, 1, kpiStart + 3, 2);
        c(kpiStart, 1).value = 'CUMPLIMIENTO TOTAL';
        c(kpiStart, 1).style = cellStyle(true, true);

        merge(kpiStart, 3, kpiStart + 3, 4);
        c(kpiStart, 3).value = this.kpi.cumplimientoAnual !== null ? `${this.kpi.cumplimientoAnual}%` : '—';
        c(kpiStart, 3).style = { ...cellStyle(true, true), font: { bold: true, size: 22, name: 'Calibri', color: { argb: '1F4E79' } } };

        const indRows = [
          { lbl: 'ACTIVIDADES PROGRAMADAS', vals: this.kpi.meses.map(m => m.programadas || 0), total: this.kpi.totalProgramadas, bg: 'D9E1F2' },
          { lbl: 'ACTIVIDADES EJECUTADAS',  vals: this.kpi.meses.map(m => m.ejecutadas || 0),  total: this.kpi.totalEjecutadas,  bg: 'E2EFDA' },
          { lbl: '% CUMPLIMIENTO', vals: this.kpi.meses.map(m => m.porcentaje !== null ? `${m.porcentaje}%` : '0%'), total: this.kpi.cumplimientoAnual !== null ? `${this.kpi.cumplimientoAnual}%` : '—', bg: 'FFF2CC' },
          { lbl: 'META', vals: this.kpi.meses.map(_ => `${this.kpi!.metaPorcentaje}%`), total: `${this.kpi.metaPorcentaje}%`, bg: 'FCE4D6' },
        ];
        for (const row of indRows) {
          ws.getRow(r).height = 15;
          merge(r, 5, r, 7); c(r, 5).value = row.lbl; c(r, 5).style = cellStyle(true);
          row.vals.forEach((v, i) => { c(r, 8 + i).value = v; c(r, 8 + i).style = cellStyle(false, true, row.bg); });
          c(r, NCOLS).value = row.total; c(r, NCOLS).style = cellStyle(true, true);
          r++;
        }
      }

      // ── ANÁLISIS Y PLAN DE ACCIÓN ──────────────────────────────────────────
      ws.getRow(r).height = 16;
      merge(r, 1, r, NCOLS); c(r, 1).value = 'ANÁLISIS Y PLAN DE ACCIÓN'; c(r, 1).style = hdrStyle();
      r++;

      ws.getRow(r).height = 22;
      [
        { c1: 1, c2: 2, v: 'PERIODO' }, { c1: 3, c2: 3, v: 'RESULTADO' },
        { c1: 4, c2: 8, v: 'ANÁLISIS' }, { c1: 9, c2: 14, v: 'PLAN DE ACCIÓN' },
        { c1: 15, c2: 16, v: 'FECHA' }, { c1: 17, c2: NCOLS, v: 'ESPONSABLE' },
      ].forEach(({ c1, c2, v }) => {
        if (c1 !== c2) merge(r, c1, r, c2);
        c(r, c1).value = v; c(r, c1).style = hdrStyle();
      });
      r++;

      const periodoNames = ['ENERO - MARZO','ABRIL - JUNIO','JULIO - SEPTIEMBRE','OCTUBRE - DICIEMBRE'];
      for (let i = 0; i < 4; i++) {
        ws.getRow(r).height = 55;
        const anal = this.getAnalisisPeriodo((i + 1) as 1 | 2 | 3 | 4);
        const pct = this.porcentajeTrimestre(i + 1);
        const respN = anal.responsable?.nombre ?? this.responsables.find(x => x.id === anal.responsable_id)?.nombre ?? '';

        merge(r, 1, r, 2); c(r, 1).value = periodoNames[i]; c(r, 1).style = cellStyle(true);
        c(r, 3).value = pct !== null ? `${pct}%` : '—'; c(r, 3).style = cellStyle(true, true);
        merge(r, 4, r, 8); c(r, 4).value = anal.analisis ?? ''; c(r, 4).style = cellStyle(false);
        merge(r, 9, r, 14); c(r, 9).value = anal.plan_accion ?? ''; c(r, 9).style = cellStyle(false);
        merge(r, 15, r, 16); c(r, 15).value = anal.fecha ?? ''; c(r, 15).style = cellStyle(false, true);
        merge(r, 17, r, NCOLS); c(r, 17).value = respN; c(r, 17).style = cellStyle(false);
        r++;
      }

      // ── BORDERS (all edge cells) ────────────────────────────────────────────
      const THINB = { style: 'thin' as const };
      const ALLBORDER = { top: THINB, bottom: THINB, left: THINB, right: THINB };
      for (let row = 1; row < r; row++) {
        for (let col = 1; col <= NCOLS; col++) {
          ws.getCell(row, col).border = ALLBORDER;
        }
      }

      // ── DOWNLOAD ───────────────────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plan_Anual_SST_${this.empresa?.nombre ?? 'Empresa'}_${this.anioSeleccionado}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error al exportar Excel.';
    } finally {
      this.exportandoExcel = false;
    }
  }
}
