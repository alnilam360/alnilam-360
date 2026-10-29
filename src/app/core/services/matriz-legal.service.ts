import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import {
  MatrizLegalComponente,
  MatrizLegalEvaluacionRow,
  MatrizLegalResumen,
  ResumenDominio,
  ConteoUpsert,
  periodoActual,
} from '../models/matriz-legal.model';

/**
 * Matriz Legal — Evaluación de Cumplimiento (rehecho).
 *
 * Captura directa de conteos (CUMPLE / EN PROCESO / NO CUMPLE) por componente y
 * periodo; el resumen (totales y %) lo entrega el RPC get_matriz_legal_resumen.
 * Multi-tenant por empresa_id (RLS en servidor). Sigue la convención de los
 * demás servicios: métodos async tipados sobre `this.sb.client`.
 */
@Injectable({ providedIn: 'root' })
export class MatrizLegalService {

  constructor(
    private sb: SupabaseClientService,
    private tenant: TenantService,
  ) {}

  // ── Tenant (delegación) ──────────────────────────────────────────────────
  isAdministrador() { return this.tenant.isAdministrador(); }
  listarEmpresasDisponibles() { return this.tenant.listarEmpresasDisponibles(); }
  getEmpresaTenantId() { return this.tenant.getEmpresaTenantId(); }
  getEmpresaPorId(id: string) { return this.tenant.getEmpresaPorId(id); }

  // ── Catálogo: componentes (globales + propios de la empresa) ──────────────
  async getComponentes(empresaId: string): Promise<MatrizLegalComponente[]> {
    const { data, error } = await this.sb.client
      .from('matriz_legal_componentes')
      .select('*')
      .eq('activo', true)
      .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`)
      .order('dominio')
      .order('orden');
    if (error) throw error;
    return (data ?? []) as MatrizLegalComponente[];
  }

  // ── Resumen para tabla + gráfica (RPC: cálculo autoritativo con guarda /0) ──
  async getResumen(periodo: number = periodoActual()): Promise<MatrizLegalResumen> {
    const { data, error } = await this.sb.client
      .rpc('get_matriz_legal_resumen', { p_periodo: periodo });
    if (error) throw error;
    return data as unknown as MatrizLegalResumen;
  }

  // ── Conteos crudos del periodo (para edición en la tabla) ───────────────────
  async getConteos(empresaId: string, periodo: number): Promise<MatrizLegalEvaluacionRow[]> {
    const { data, error } = await this.sb.client
      .from('matriz_legal_evaluacion')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('periodo', periodo);
    if (error) throw error;
    return (data ?? []) as MatrizLegalEvaluacionRow[];
  }

  // ── Periodos con datos registrados (para el selector de año) ────────────────
  async getPeriodos(empresaId: string): Promise<number[]> {
    const { data, error } = await this.sb.client
      .from('matriz_legal_evaluacion')
      .select('periodo')
      .eq('empresa_id', empresaId);
    if (error) throw error;
    const set = new Set<number>((data ?? []).map(r => (r as { periodo: number }).periodo));
    set.add(periodoActual());
    return [...set].sort((a, b) => b - a);
  }

  // ── Guardar conteos (upsert por empresa × componente × periodo) ─────────────
  async guardarConteos(
    empresaId: string,
    periodo: number,
    filas: ConteoUpsert[],
  ): Promise<void> {
    this.validarConteos(filas);
    const perfil = await this.tenant.getPerfilSeguro();
    const payload = filas.map(f => ({
      empresa_id: empresaId,
      componente_id: f.componente_id,
      periodo,
      cumple: f.cumple,
      en_proceso: f.en_proceso,
      no_cumple: f.no_cumple,
      updated_by: perfil?.id ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await this.sb.client
      .from('matriz_legal_evaluacion')
      .upsert(payload, { onConflict: 'empresa_id,componente_id,periodo' });
    if (error) throw error;
  }

  // ── Validación ───────────────────────────────────────────────────────────
  validarConteos(filas: ConteoUpsert[]): void {
    for (const f of filas) {
      if (!f.componente_id) throw new Error('Falta el componente en una fila de conteos.');
      for (const v of [f.cumple, f.en_proceso, f.no_cumple]) {
        if (!Number.isInteger(v) || v < 0) {
          throw new Error('Los conteos deben ser enteros mayores o iguales a cero.');
        }
      }
    }
  }

  // ── Exportación a Excel: réplica del formato de la hoja EVALUACIÓN CUMPLIMIENTO
  //    (componentes en columnas, estados en filas, grupos SG-SST y Ambiental). ──
  async exportarMatrizExcel(resumen: MatrizLegalResumen, empresaNombre: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'Alnilam 360 · SG-SST';
    wb.created = new Date();
    const empresa = empresaNombre || 'Empresa';

    const sst: ResumenDominio = resumen.sgSst;
    const amb: ResumenDominio = resumen.ambiental;
    const nSst = sst.componentes.length;
    const nAmb = amb.componentes.length;

    // Índices de columna (1-based).
    const colEstado = 1;
    const sstStart = 2;
    const sstEnd = 1 + nSst;
    const colPctSst = nSst + 2;
    const ambStart = nSst + 3;
    const ambEnd = nSst + 2 + nAmb;
    const colPctAmb = nSst + nAmb + 3;
    const totalCols = colPctAmb;

    const ws = wb.addWorksheet('Evaluación Cumplimiento', {
      properties: { tabColor: { argb: 'FF1F3864' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // Paleta (colores del formato original).
    const NAVY = 'FF1F3864', HEADER = 'FF1F4E79', WHITE = 'FFFFFFFF', BLACK = 'FF000000';
    const GREEN = 'FF00B050', YELLOW = 'FFFFFF00', RED = 'FFFF0000', GRAY = 'FFBFBFBF';
    const BRD = 'FF4472C4';
    const bdr = {
      top: { style: 'thin' as const, color: { argb: BRD } },
      bottom: { style: 'thin' as const, color: { argb: BRD } },
      left: { style: 'thin' as const, color: { argb: BRD } },
      right: { style: 'thin' as const, color: { argb: BRD } },
    };
    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

    // Anchos.
    ws.getColumn(colEstado).width = 16;
    for (let c = sstStart; c <= sstEnd; c++) ws.getColumn(c).width = 10;
    ws.getColumn(colPctSst).width = 15;
    for (let c = ambStart; c <= ambEnd; c++) ws.getColumn(c).width = 10;
    ws.getColumn(colPctAmb).width = 15;

    // Fila 1: título.
    ws.mergeCells(1, 1, 1, totalCols);
    const title = ws.getCell(1, 1);
    title.value = 'EVALUACIÓN DE CUMPLIMIENTO DE REQUISITOS LEGALES';
    title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: BLACK } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    // Fila 2: grupos.
    ws.getCell(2, colEstado).value = 'COMPONENTE';
    ws.mergeCells(2, sstStart, 2, colPctSst);
    ws.getCell(2, sstStart).value = 'NORMATIVIDAD SG-SST';
    ws.mergeCells(2, ambStart, 2, colPctAmb);
    ws.getCell(2, ambStart).value = 'NORMATIVIDAD AMBIENTAL';

    // Fila 3: ESTADO + nombres de componente + encabezados de %.
    ws.getCell(3, colEstado).value = 'ESTADO';
    sst.componentes.forEach((c, i) => { ws.getCell(3, sstStart + i).value = c.nombre.toUpperCase(); });
    ws.getCell(3, colPctSst).value = '% CUMPLIMIENTO SG-SST -LABORAL';
    amb.componentes.forEach((c, i) => { ws.getCell(3, ambStart + i).value = c.nombre.toUpperCase(); });
    ws.getCell(3, colPctAmb).value = '% CUMPLIMIENTO AMBIENTAL';

    // Estilo de encabezados (filas 2 y 3).
    for (const r of [2, 3]) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = ws.getCell(r, c);
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } };
        cell.fill = fill(HEADER);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = bdr;
      }
      ws.getRow(r).height = r === 3 ? 34 : 18;
    }

    // Filas de estado (4-6).
    type Fila = { label: string; field: 'cumple' | 'enProceso' | 'noCumple'; pct: 'pctCumple' | 'pctEnProceso' | 'pctNoCumple'; fillArgb: string; txt: string; fmt: string };
    const filas: Fila[] = [
      { label: 'CUMPLE',     field: 'cumple',    pct: 'pctCumple',    fillArgb: GREEN,  txt: WHITE, fmt: '0.0%' },
      { label: 'EN PROCESO', field: 'enProceso', pct: 'pctEnProceso', fillArgb: YELLOW, txt: BLACK, fmt: '0.0%' },
      { label: 'NO CUMPLE',  field: 'noCumple',  pct: 'pctNoCumple',  fillArgb: RED,    txt: WHITE, fmt: '0.00%' },
    ];

    let row = 4;
    for (const f of filas) {
      const r = ws.getRow(row);
      // Etiqueta de estado (coloreada).
      const lab = r.getCell(colEstado);
      lab.value = f.label;
      lab.font = { name: 'Calibri', size: 9, bold: true, color: { argb: f.txt } };
      lab.fill = fill(f.fillArgb);
      lab.alignment = { horizontal: 'left', vertical: 'middle' };
      lab.border = bdr;
      // Componentes SG-SST.
      sst.componentes.forEach((c, i) => {
        const cell = r.getCell(sstStart + i);
        cell.value = c[f.field];
        cell.font = { name: 'Calibri', size: 9, color: { argb: BLACK } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = bdr;
      });
      // % SG-SST (coloreado).
      const pSst = r.getCell(colPctSst);
      pSst.value = sst[f.pct];
      pSst.numFmt = f.fmt;
      pSst.font = { name: 'Calibri', size: 9, bold: true, color: { argb: f.txt } };
      pSst.fill = fill(f.fillArgb);
      pSst.alignment = { horizontal: 'center', vertical: 'middle' };
      pSst.border = bdr;
      // Componentes Ambiental.
      amb.componentes.forEach((c, i) => {
        const cell = r.getCell(ambStart + i);
        cell.value = c[f.field];
        cell.font = { name: 'Calibri', size: 9, color: { argb: BLACK } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = bdr;
      });
      // % Ambiental (coloreado).
      const pAmb = r.getCell(colPctAmb);
      pAmb.value = amb[f.pct];
      pAmb.numFmt = f.fmt;
      pAmb.font = { name: 'Calibri', size: 9, bold: true, color: { argb: f.txt } };
      pAmb.fill = fill(f.fillArgb);
      pAmb.alignment = { horizontal: 'center', vertical: 'middle' };
      pAmb.border = bdr;
      row++;
    }

    // Fila TOTAL (7).
    const tr = ws.getRow(row);
    const tLab = tr.getCell(colEstado);
    tLab.value = 'TOTAL';
    tLab.font = { name: 'Calibri', size: 9, bold: true, color: { argb: BLACK } };
    tLab.fill = fill(GRAY);
    tLab.alignment = { horizontal: 'left', vertical: 'middle' };
    tLab.border = bdr;
    sst.componentes.forEach((c, i) => {
      const cell = tr.getCell(sstStart + i);
      cell.value = c.total;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: BLACK } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = bdr;
    });
    const tPctSst = tr.getCell(colPctSst);
    tPctSst.value = sst.pctCumple; tPctSst.numFmt = '0%';
    tPctSst.font = { name: 'Calibri', size: 9, bold: true, color: { argb: BLACK } };
    tPctSst.alignment = { horizontal: 'center', vertical: 'middle' };
    tPctSst.border = bdr;
    amb.componentes.forEach((c, i) => {
      const cell = tr.getCell(ambStart + i);
      cell.value = c.total;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: BLACK } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = bdr;
    });
    const tPctAmb = tr.getCell(colPctAmb);
    tPctAmb.value = amb.pctCumple; tPctAmb.numFmt = '0%';
    tPctAmb.font = { name: 'Calibri', size: 9, bold: true, color: { argb: BLACK } };
    tPctAmb.alignment = { horizontal: 'center', vertical: 'middle' };
    tPctAmb.border = bdr;
    row++;

    // Fila 8: grandes totales por dominio (barras).
    const gr = ws.getRow(row);
    ws.mergeCells(row, sstStart, row, colPctSst);
    const gSst = gr.getCell(sstStart);
    gSst.value = sst.totalDominio;
    gSst.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
    gSst.fill = fill(NAVY);
    gSst.alignment = { horizontal: 'center', vertical: 'middle' };
    gSst.border = bdr;
    ws.mergeCells(row, ambStart, row, colPctAmb);
    const gAmb = gr.getCell(ambStart);
    gAmb.value = amb.totalDominio;
    gAmb.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
    gAmb.fill = fill(NAVY);
    gAmb.alignment = { horizontal: 'center', vertical: 'middle' };
    gAmb.border = bdr;
    gr.getCell(colEstado).fill = fill(GRAY);
    gr.getCell(colEstado).border = bdr;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Evaluacion_Cumplimiento_${empresa.replace(/\s+/g, '_')}_${resumen.periodo}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
