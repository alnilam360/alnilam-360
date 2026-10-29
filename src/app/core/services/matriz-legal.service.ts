import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import {
  MatrizLegalComponente,
  MatrizLegalEvaluacionRow,
  MatrizLegalResumen,
  ResumenDominio,
  ConteoUpsert,
  Dominio,
  DOMINIO_LABEL,
  ESTADO_LABEL,
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

  // ── Exportación a Excel de la matriz de evaluación (patrón del proyecto) ─────
  async exportarMatrizExcel(resumen: MatrizLegalResumen, empresaNombre: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'Alnilam 360 · SG-SST';
    wb.created = new Date();
    const empresa = empresaNombre || 'Empresa';
    const NOW = new Date();
    const ws = wb.addWorksheet('Evaluación Cumplimiento', {
      properties: { tabColor: { argb: 'FF1E40AF' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const C = { h2: 'FF1E40AF', headerFill: 'FF1E3A8A', headerText: 'FFFFFFFF', border: 'FFCBD5E1' };
    const bdr = {
      top: { style: 'thin' as const, color: { argb: C.border } },
      bottom: { style: 'thin' as const, color: { argb: C.border } },
      left: { style: 'thin' as const, color: { argb: C.border } },
      right: { style: 'thin' as const, color: { argb: C.border } },
    };

    let row = 1;
    ws.mergeCells(row, 1, row, 6);
    const title = ws.getCell(row, 1);
    title.value = `EVALUACIÓN DE CUMPLIMIENTO DE REQUISITOS LEGALES · ${empresa} · ${resumen.periodo}`;
    title.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h2 } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(row).height = 30;
    row += 2;

    const bloques: { dominio: Dominio; data: ResumenDominio }[] = [
      { dominio: 'SG_SST', data: resumen.sgSst },
      { dominio: 'AMBIENTAL', data: resumen.ambiental },
    ];

    for (const { dominio, data } of bloques) {
      ws.mergeCells(row, 1, row, 6);
      const sub = ws.getCell(row, 1);
      sub.value = DOMINIO_LABEL[dominio];
      sub.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      row++;

      const head = ['Componente', ESTADO_LABEL.CUMPLE, ESTADO_LABEL.EN_PROCESO, ESTADO_LABEL.NO_CUMPLE, 'Total', '% Cumplimiento'];
      const hr = ws.getRow(row);
      head.forEach((h, i) => {
        const cell = hr.getCell(i + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerFill } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = bdr;
      });
      row++;

      for (const c of data.componentes) {
        const r = ws.getRow(row);
        r.values = [c.nombre, c.cumple, c.enProceso, c.noCumple, c.total, ''];
        for (let col = 1; col <= 6; col++) {
          const cell = r.getCell(col);
          cell.font = { name: 'Calibri', size: 9 };
          cell.border = bdr;
          cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
        }
        row++;
      }

      const tr = ws.getRow(row);
      const total = data.totalDominio;
      const sumC = data.componentes.reduce((s, c) => s + c.cumple, 0);
      const sumE = data.componentes.reduce((s, c) => s + c.enProceso, 0);
      const sumN = data.componentes.reduce((s, c) => s + c.noCumple, 0);
      tr.values = ['TOTAL', sumC, sumE, sumN, total, data.pctCumple];
      for (let col = 1; col <= 6; col++) {
        const cell = tr.getCell(col);
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.border = bdr;
        cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
      }
      tr.getCell(6).numFmt = '0.0%';
      row += 2;
    }

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
