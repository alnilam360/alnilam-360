import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import {
  CATALOGO_MATRIZ_INDICADORES,
  FilaMatrizIndicador,
  IndicadorDefinicion,
  MatrizIndicadorRegistroDB,
  ResumenCumplimientoMatriz,
  TipoIndicadorMatriz,
  calcularCumplimientoMatriz,
  getTipoCorto,
  normalizarTipoIndicador
} from '../models/matriz-indicadores.model';

@Injectable({
  providedIn: 'root'
})
export class MatrizIndicadoresService {
  private sb = inject(SupabaseClientService);

  /**
   * Carga los registros de la matriz de indicadores desde la base de datos Supabase.
   * Filtra por empresa, año, mes y sede si están especificados.
   */
  async obtenerRegistrosMatriz(
    empresaId: string,
    anio: number,
    sedeId?: string | null,
    mes?: number | null
  ): Promise<{ filas: FilaMatrizIndicador[]; resumen: ResumenCumplimientoMatriz }> {
    if (!empresaId) {
      return { filas: [], resumen: { total: 0, cumplen: 0, noCumplen: 0, porcentajeCumplimiento: 0 } };
    }

    try {
      let query = this.sb.client
        .from('matriz_indicadores_registros')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('anio', anio)
        .order('created_at', { ascending: true });

      if (sedeId) {
        query = query.eq('sede_id', sedeId);
      }

      if (mes !== undefined && mes !== null) {
        query = query.eq('mes', mes);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error cargando registros de matriz_indicadores_registros:', error);
        throw error;
      }

      const registros = (data as MatrizIndicadorRegistroDB[]) || [];

      // Mapear a FilaMatrizIndicador con contratos actualizados
      const filas: FilaMatrizIndicador[] = registros.map(r => {
        const resultadoNum = Number(r.resultado) || 0;
        const metaNum = Number(r.meta) || 0;
        const cumplimiento = calcularCumplimientoMatriz(resultadoNum, metaNum);
        const tipoNormalizado = normalizarTipoIndicador(r.tipo);

        return {
          id: r.id!,
          empresaId: r.empresa_id,
          sedeId: r.sede_id,
          anio: r.anio,
          mes: r.mes,
          tipo: tipoNormalizado,
          tipoCorto: getTipoCorto(tipoNormalizado),
          codigoIndicador: r.codigo_indicador || undefined,
          nombre: r.nombre,
          formula: r.formula,
          meta: metaNum,
          responsable: r.responsable || 'Responsable SST',
          frecuencia: r.frecuencia === 'Anual' ? 'Anual' : 'Mensual',
          resultado: resultadoNum,
          cumplimiento,
          personalConocimiento: r.personal_conocimiento || 'Gerencia y trabajadores',
          moduloRuta: this.obtenerRutaModuloPorTipo(tipoNormalizado, r.codigo_indicador)
        };
      });

      const cumplen = filas.filter(f => f.cumplimiento === 'CUMPLE').length;
      const noCumplen = filas.length - cumplen;
      const pct = filas.length > 0 ? Number(((cumplen / filas.length) * 100).toFixed(1)) : 0;

      return {
        filas,
        resumen: {
          total: filas.length,
          cumplen,
          noCumplen,
          porcentajeCumplimiento: pct
        }
      };
    } catch (e) {
      console.error('Error inesperado obteniendo registros de matriz:', e);
      return { filas: [], resumen: { total: 0, cumplen: 0, noCumplen: 0, porcentajeCumplimiento: 0 } };
    }
  }

  /**
   * Guarda o actualiza un registro individual de indicador en la base de datos Supabase
   * Valida estrictamente que NO existan dos indicadores con el mismo nombre por empresa y periodo.
   */
  async guardarRegistro(registro: Partial<MatrizIndicadorRegistroDB>): Promise<MatrizIndicadorRegistroDB> {
    if (!registro.empresa_id) throw new Error('empresa_id es requerido');
    if (!registro.nombre?.trim()) throw new Error('El nombre del indicador es obligatorio');

    const nombreLimpio = registro.nombre.trim();
    const metaNum = Number(registro.meta) || 0;
    const resultadoNum = Number(registro.resultado) || 0;
    const cumplimiento = calcularCumplimientoMatriz(resultadoNum, metaNum);
    const tipoNormalizado = normalizarTipoIndicador(registro.tipo || '');
    const frecuenciaNormalizada = registro.frecuencia === 'Anual' ? 'Anual' : 'Mensual';

    // 1. VALIDACIÓN DE UNICIDAD POR EMPRESA Y PERIODO
    let checkQuery = this.sb.client
      .from('matriz_indicadores_registros')
      .select('id, nombre')
      .eq('empresa_id', registro.empresa_id)
      .eq('anio', registro.anio ?? new Date().getFullYear())
      .eq('mes', registro.mes ?? 0)
      .ilike('nombre', nombreLimpio);

    if (registro.id) {
      checkQuery = checkQuery.neq('id', registro.id);
    }

    const { data: duplicados, error: checkErr } = await checkQuery;
    if (checkErr) {
      console.warn('Error verificando unicidad de nombre de indicador:', checkErr);
    } else if (duplicados && duplicados.length > 0) {
      throw new Error(`Ya existe un indicador con el nombre "${nombreLimpio}" registrado para esta empresa.`);
    }

    const payload: Partial<MatrizIndicadorRegistroDB> = {
      empresa_id: registro.empresa_id,
      sede_id: registro.sede_id || null,
      anio: registro.anio,
      mes: registro.mes ?? 0,
      tipo: tipoNormalizado,
      codigo_indicador: registro.codigo_indicador || null,
      nombre: nombreLimpio,
      formula: (registro.formula || '').trim(),
      meta: metaNum,
      meta_texto: `${metaNum}%`,
      responsable: (registro.responsable || 'Responsable SST').trim(),
      frecuencia: frecuenciaNormalizada,
      resultado: resultadoNum,
      resultado_texto: `${resultadoNum}%`,
      cumplimiento,
      personal_conocimiento: (registro.personal_conocimiento || 'Gerencia y trabajadores').trim(),
      updated_at: new Date().toISOString()
    };

    if (registro.id) {
      // Actualizar registro existente
      const { data, error } = await this.sb.client
        .from('matriz_indicadores_registros')
        .update(payload)
        .eq('id', registro.id)
        .select()
        .single();

      if (error) throw error;
      return data as MatrizIndicadorRegistroDB;
    } else {
      // Crear nuevo registro
      const { data, error } = await this.sb.client
        .from('matriz_indicadores_registros')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as MatrizIndicadorRegistroDB;
    }
  }

  /**
   * Elimina un registro de indicador de la base de datos
   */
  async eliminarRegistro(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('matriz_indicadores_registros')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Inicializa la matriz con las 9 fichas normativas estándar del SG-SST
   * Insertando registros reales y editables en la base de datos Supabase,
   * omitiendo aquellos indicadores que ya se encuentren registrados.
   */
  async inicializarPlantillaEstandar(
    empresaId: string,
    anio: number,
    sedeId?: string | null,
    mes: number = 0
  ): Promise<number> {
    // 1. Consultar indicadores ya existentes para evitar colisiones
    const { data: existentes } = await this.sb.client
      .from('matriz_indicadores_registros')
      .select('nombre')
      .eq('empresa_id', empresaId)
      .eq('anio', anio)
      .eq('mes', mes);

    const nombresExistentes = new Set(
      ((existentes as { nombre: string }[]) || []).map(e => e.nombre.trim().toLowerCase())
    );

    // 2. Filtrar catálogo para no insertar duplicados
    const filasParaInsertar: Partial<MatrizIndicadorRegistroDB>[] = [];

    for (const cat of CATALOGO_MATRIZ_INDICADORES) {
      if (nombresExistentes.has(cat.nombre.trim().toLowerCase())) {
        continue;
      }

      const meta = cat.metaDefault;
      const resNum = 0;
      const cumplimiento = calcularCumplimientoMatriz(resNum, meta);

      filasParaInsertar.push({
        empresa_id: empresaId,
        sede_id: sedeId || null,
        anio,
        mes,
        tipo: cat.tipo,
        codigo_indicador: cat.id,
        nombre: cat.nombre,
        formula: cat.formula,
        meta,
        meta_texto: `${meta}%`,
        responsable: cat.responsableDefault,
        frecuencia: cat.frecuencia,
        resultado: resNum,
        resultado_texto: `${resNum}%`,
        cumplimiento,
        personal_conocimiento: cat.personalConocimiento
      });
    }

    if (filasParaInsertar.length === 0) {
      return 0;
    }

    const { data, error } = await this.sb.client
      .from('matriz_indicadores_registros')
      .insert(filasParaInsertar)
      .select();

    if (error) {
      console.error('Error insertando plantilla estándar:', error);
      throw error;
    }

    return (data || []).length;
  }

  /**
   * Determina la ruta interna según el tipo de indicador
   */
  private obtenerRutaModuloPorTipo(tipo: string, _codigo?: string | null): string | undefined {
    const norm = normalizarTipoIndicador(tipo);
    switch (norm) {
      case 'Accidente de Trabajo (AT)':
        return '/indicadores/accidentalidad';
      case 'Enfermedad Laboral (EL)':
        return '/indicadores/enfermedad-laboral';
      case 'Ausentismo':
        return '/indicadores/ausentismo';
      case 'Estructura - proceso - Resultado (E-P-R) del SG-SST':
        return '/indicadores/sg-sst';
      default:
        return undefined;
    }
  }

  /**
   * Exporta la matriz oficial a formato Excel (.xlsx) con estilos profesionales
   */
  async exportarMatrizExcel(
    filas: FilaMatrizIndicador[],
    empresaNombre: string,
    anio: number,
    mesNombre?: string
  ): Promise<void> {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Alnilam 360 - SG-SST';
    wb.created = new Date();

    const ws = wb.addWorksheet('Matriz de Indicadores', {
      views: [{ showGridLines: true }]
    });

    // 1. TÍTULO Y METADATOS
    const periodoStr = mesNombre ? `${mesNombre} ${anio}` : `Consolidado Anual ${anio}`;
    ws.mergeCells('A1:H1');
    const cellTitulo = ws.getCell('A1');
    cellTitulo.value = 'MATRIZ OFICIAL DE INDICADORES DEL SG-SST';
    cellTitulo.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0C3B52' } };
    cellTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
    cellTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F4FB' } };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:H2');
    const cellSub = ws.getCell('A2');
    cellSub.value = `Empresa: ${empresaNombre}  |  Periodo: ${periodoStr}  |  Res. 0312/2019 · Dec. 1072/2015`;
    cellSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
    cellSub.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 18;

    ws.addRow([]); // Fila vacía

    // 2. ENCABEZADOS DE COLUMNA (según imagen sin fórmula)
    const headers = [
      'Tipo',
      'Nombre del Indicador',
      'Meta o límite del indicador',
      'Responsable',
      'Frecuencia de Medición',
      'Resultado',
      'Cumplimiento',
      'Personal que debe conocer el resultado'
    ];

    const headerRow = ws.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB8E2F2' } };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0B3B53' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9DCBE0' } },
        bottom: { style: 'medium', color: { argb: 'FF0B3B53' } },
        left: { style: 'thin', color: { argb: 'FF9DCBE0' } },
        right: { style: 'thin', color: { argb: 'FF9DCBE0' } }
      };
    });

    // 3. FILAS DE DATOS
    filas.forEach(fila => {
      const row = ws.addRow([
        fila.tipo,
        fila.nombre,
        `${fila.meta}%`,
        fila.responsable,
        fila.frecuencia,
        `${fila.resultado}%`,
        fila.cumplimiento,
        fila.personalConocimiento
      ]);
      row.height = 22;

      row.getCell(1).alignment = { vertical: 'middle', wrapText: true };
      row.getCell(2).alignment = { vertical: 'middle', wrapText: true };
      row.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1A4968' } };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).font = { name: 'Calibri', size: 10, bold: true };

      const cellCump = row.getCell(7);
      cellCump.alignment = { horizontal: 'center', vertical: 'middle' };
      if (fila.cumplimiento === 'CUMPLE') {
        cellCump.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70C040' } };
        cellCump.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0D2904' } };
      } else {
        cellCump.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
        cellCump.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      }

      row.getCell(8).alignment = { vertical: 'middle', wrapText: true };

      for (let col = 1; col <= 8; col++) {
        row.getCell(col).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }
    });

    ws.columns = [
      { width: 24 }, // Tipo
      { width: 32 }, // Nombre
      { width: 16 }, // Meta
      { width: 18 }, // Responsable
      { width: 16 }, // Frecuencia
      { width: 14 }, // Resultado
      { width: 16 }, // Cumplimiento
      { width: 30 }  // Personal
    ];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matriz_Indicadores_SST_${empresaNombre}_${anio}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
