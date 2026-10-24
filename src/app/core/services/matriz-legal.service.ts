import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import {
  MatrizLegalRequisito,
  MatrizLegalComponente,
  MatrizLegalConfig,
  TipoNorma,
  FiltrosRequisito,
  EvaluacionCumplimiento,
  EstadoCumplimiento,
  ESTADO_LABEL,
  DOMINIO_LABEL,
  construirEvaluacion,
} from '../models/matriz-legal.model';

/**
 * Matriz Legal: identificación y evaluación de requisitos legales y de otra
 * índole (Dec. 1072/2015 Art. 2.2.4.6.2). Multi-tenant por empresa_id.
 *
 * Sigue la convención de MatrizAtCasoService/MatrizIndicadoresService: métodos
 * async tipados sobre `this.sb.client`, delegación tenant y agregación delegada
 * a las funciones puras del modelo (matriz-legal.model.ts).
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
      .or(`empresa_id.is.null,empresa_id.eq.${empresaId}`)
      .order('dominio')
      .order('orden');
    if (error) throw error;
    return (data ?? []) as MatrizLegalComponente[];
  }

  async crearComponente(c: Partial<MatrizLegalComponente>): Promise<MatrizLegalComponente> {
    const { data, error } = await this.sb.client
      .from('matriz_legal_componentes').insert(c).select().single();
    if (error) throw error;
    return data as MatrizLegalComponente;
  }

  async actualizarComponente(id: string, cambios: Partial<MatrizLegalComponente>): Promise<void> {
    const { error } = await this.sb.client
      .from('matriz_legal_componentes')
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async eliminarComponente(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('matriz_legal_componentes').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Catálogo: tipos de norma (global) ──────────────────────────────────────
  async getTiposNorma(): Promise<TipoNorma[]> {
    const { data, error } = await this.sb.client
      .from('catalogo_tipo_norma').select('*').eq('activo', true).order('jerarquia');
    if (error) throw error;
    return (data ?? []) as TipoNorma[];
  }

  async crearTipoNorma(t: Partial<TipoNorma>): Promise<TipoNorma> {
    const { data, error } = await this.sb.client
      .from('catalogo_tipo_norma').insert(t).select().single();
    if (error) throw error;
    return data as TipoNorma;
  }

  // ── Encabezado del formato (hoja MENU) ──────────────────────────────────────
  async getConfig(empresaId: string): Promise<MatrizLegalConfig | null> {
    const { data, error } = await this.sb.client
      .from('matriz_legal_config').select('*').eq('empresa_id', empresaId).maybeSingle();
    if (error) throw error;
    return (data as MatrizLegalConfig) ?? null;
  }

  async upsertConfig(config: MatrizLegalConfig): Promise<MatrizLegalConfig> {
    const { data, error } = await this.sb.client
      .from('matriz_legal_config')
      .upsert({ ...config, updated_at: new Date().toISOString() }, { onConflict: 'empresa_id' })
      .select().single();
    if (error) throw error;
    return data as MatrizLegalConfig;
  }

  // ── CRUD requisitos ─────────────────────────────────────────────────────────
  async listarRequisitos(empresaId: string, filtros: FiltrosRequisito = {}): Promise<MatrizLegalRequisito[]> {
    let q = this.sb.client
      .from('matriz_legal_requisitos')
      .select(`
        *,
        componente:matriz_legal_componentes(id, nombre, dominio),
        tipo_norma:catalogo_tipo_norma(id, nombre)
      `)
      .eq('empresa_id', empresaId);

    if (filtros.componenteId) q = q.eq('componente_id', filtros.componenteId);
    if (filtros.tipoNormaId) q = q.eq('tipo_norma_id', filtros.tipoNormaId);
    if (filtros.estado) q = q.eq('estado_cumplimiento', filtros.estado);
    if (filtros.vigente != null) q = q.eq('vigente', filtros.vigente);
    if (filtros.esOtraIndole != null) q = q.eq('es_otra_indole', filtros.esOtraIndole);

    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;

    let reqs = (data ?? []) as MatrizLegalRequisito[];

    // Normalizar relaciones 1:1 (Supabase a veces devuelve array).
    for (const r of reqs) {
      const c = r.componente as any;
      r.componente = Array.isArray(c) ? (c[0] ?? null) : c;
      const t = r.tipo_norma as any;
      r.tipo_norma = Array.isArray(t) ? (t[0] ?? null) : t;
    }

    // Filtros que no se resuelven en SQL (dominio depende del join; texto libre).
    if (filtros.dominio) reqs = reqs.filter(r => r.componente?.dominio === filtros.dominio);
    if (filtros.texto) {
      const q2 = filtros.texto.trim().toLowerCase();
      reqs = reqs.filter(r =>
        (r.descripcion_requisito ?? '').toLowerCase().includes(q2) ||
        (r.numero ?? '').toLowerCase().includes(q2) ||
        (r.entidad_emisora ?? '').toLowerCase().includes(q2) ||
        (r.articulos_aplicables ?? '').toLowerCase().includes(q2) ||
        (r.responsable ?? '').toLowerCase().includes(q2) ||
        (r.tipo_norma?.nombre ?? '').toLowerCase().includes(q2));
    }
    return reqs;
  }

  async crearRequisito(req: MatrizLegalRequisito): Promise<MatrizLegalRequisito> {
    this.validarRequisito(req);
    const perfil = await this.tenant.getPerfilSeguro();
    const { componente, tipo_norma, ...payload } = req as any;
    const { data, error } = await this.sb.client
      .from('matriz_legal_requisitos')
      .insert({ ...payload, created_by: perfil?.id })
      .select().single();
    if (error) throw error;
    return data as MatrizLegalRequisito;
  }

  async actualizarRequisito(id: string, cambios: Partial<MatrizLegalRequisito>): Promise<void> {
    const { componente, tipo_norma, ...limpio } = cambios as any;
    const { error } = await this.sb.client
      .from('matriz_legal_requisitos')
      .update({ ...limpio, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async eliminarRequisito(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('matriz_legal_requisitos').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Evaluación de cumplimiento (hoja EVALUACION) ────────────────────────────
  /** Carga requisitos + componentes y delega el cálculo a la función pura. */
  async obtenerEvaluacion(empresaId: string): Promise<EvaluacionCumplimiento> {
    const [reqs, componentes] = await Promise.all([
      this.listarRequisitos(empresaId, {}),
      this.getComponentes(empresaId),
    ]);
    return construirEvaluacion(reqs, componentes);
  }

  // ── Validación mínima ─────────────────────────────────────────────────────
  validarRequisito(req: MatrizLegalRequisito): void {
    const faltantes: string[] = [];
    if (!req.componente_id) faltantes.push('componente');
    if (!req.descripcion_requisito?.trim()) faltantes.push('descripción del requisito');
    if (!req.estado_cumplimiento) faltantes.push('estado de cumplimiento');
    if (faltantes.length) {
      throw new Error(`Faltan campos obligatorios: ${faltantes.join(', ')}.`);
    }
    if (req.anio != null && (req.anio < 1900 || req.anio > 2100)) {
      throw new Error('El año de la norma no es válido.');
    }
  }

  // ── Exportación a Excel (patrón IndicadoresExcelService) ────────────────────
  async exportarRequisitosExcel(
    reqs: MatrizLegalRequisito[],
    empresaNombre: string,
  ): Promise<void> {
    if (!reqs || reqs.length === 0) {
      alert('No hay requisitos para exportar con los filtros actuales.');
      return;
    }
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'Alnilam 360 · SG-SST';
    wb.created = new Date();
    const empresa = empresaNombre || 'Empresa';
    const NOW = new Date();

    const ws = wb.addWorksheet('Matriz Legal', {
      properties: { tabColor: { argb: 'FF1E40AF' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      views: [{ state: 'frozen', xSplit: 3, ySplit: 5 }],
    });

    const C = {
      h1: 'FF0F2942', h2: 'FF1E40AF', h3: 'FF1E293B',
      headerFill: 'FF1E3A8A', headerText: 'FFFFFFFF', altRow: 'FFF8FAFC', border: 'FFCBD5E1',
    };
    const bdr = {
      top: { style: 'thin' as const, color: { argb: C.border } },
      bottom: { style: 'thin' as const, color: { argb: C.border } },
      left: { style: 'thin' as const, color: { argb: C.border } },
      right: { style: 'thin' as const, color: { argb: C.border } },
    };
    const TOTAL_COLS = 14;

    ws.mergeCells(1, 1, 1, TOTAL_COLS);
    const f1 = ws.getCell(1, 1);
    f1.value = 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO · ALNILAM 360';
    f1.font = { name: 'Calibri', size: 9, color: { argb: 'FF93C5FD' }, bold: true };
    f1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h1 } };
    f1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 20;

    ws.mergeCells(2, 1, 2, TOTAL_COLS);
    const f2 = ws.getCell(2, 1);
    f2.value = 'MATRIZ DE IDENTIFICACIÓN Y EVALUACIÓN DE REQUISITOS LEGALES Y DE OTRA ÍNDOLE';
    f2.font = { name: 'Calibri', size: 13, color: { argb: 'FFFFFFFF' }, bold: true };
    f2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h2 } };
    f2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 34;

    ws.mergeCells(3, 1, 3, TOTAL_COLS);
    const f3 = ws.getCell(3, 1);
    f3.value = `Empresa: ${empresa}  ·  Total Requisitos: ${reqs.length}  ·  Generado: ${NOW.toLocaleDateString('es-CO')}  ·  Normativa: Dec. 1072/2015 Art. 2.2.4.6.2`;
    f3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
    f3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h3 } };
    f3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(3).height = 22;
    ws.getRow(4).height = 6;

    const headers = [
      { h: 'N°', w: 6 }, { h: 'Dominio', w: 16 }, { h: 'Componente', w: 20 },
      { h: 'Tipo Norma', w: 16 }, { h: 'Número', w: 12 }, { h: 'Año', w: 8 },
      { h: 'Entidad Emisora', w: 20 }, { h: 'Artículos', w: 18 },
      { h: 'Descripción del Requisito', w: 40 }, { h: 'Aplicación en la Empresa', w: 30 },
      { h: 'Estado', w: 14 }, { h: 'Evidencia', w: 24 }, { h: 'Responsable', w: 20 },
      { h: 'Observaciones', w: 28 },
    ];
    ws.columns = headers.map(x => ({ width: x.w }));
    const hr = ws.getRow(5);
    headers.forEach((x, i) => {
      const cell = hr.getCell(i + 1);
      cell.value = x.h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerFill } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = bdr;
    });
    hr.height = 28;

    reqs.forEach((r, idx) => {
      const row = ws.getRow(6 + idx);
      row.values = [
        idx + 1,
        r.componente ? DOMINIO_LABEL[r.componente.dominio] : '—',
        r.componente?.nombre ?? '—',
        r.tipo_norma?.nombre ?? '—',
        r.numero ?? '—',
        r.anio ?? '—',
        r.entidad_emisora ?? '—',
        r.articulos_aplicables ?? '—',
        r.descripcion_requisito ?? '—',
        r.aplicacion_empresa ?? '—',
        ESTADO_LABEL[r.estado_cumplimiento],
        r.evidencia_cumplimiento ?? '—',
        r.responsable ?? '—',
        r.observaciones ?? '—',
      ];
      row.height = 20;
      for (let col = 1; col <= TOTAL_COLS; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = bdr;
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
        cell.alignment = { horizontal: [1, 6, 11].includes(col) ? 'center' : 'left', vertical: 'middle', wrapText: true };
      }
      // Semáforo de estado
      const sc = row.getCell(11);
      const mapa: Record<EstadoCumplimiento, [string, string]> = {
        CUMPLE: ['FFD1FAE5', 'FF065F46'],
        EN_PROCESO: ['FFFEF3C7', 'FF92400E'],
        NO_CUMPLE: ['FFFEE2E2', 'FF991B1B'],
        NO_APLICA: ['FFE2E8F0', 'FF475569'],
      };
      const [bg, tx] = mapa[r.estado_cumplimiento];
      sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      sc.font = { name: 'Calibri', size: 9, bold: true, color: { argb: tx } };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matriz_Legal_${empresa.replace(/\s+/g, '_')}_${NOW.toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
