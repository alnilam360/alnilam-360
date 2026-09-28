import { Injectable } from '@angular/core';
import {
  MatrizAtCaso,
  IndicadoresMes,
  IndicadoresPeriodo,
  AgrupacionesViz,
  DiasSinAccidentes,
  SedeLite
} from '../models/matriz-at.model';

@Injectable({
  providedIn: 'root'
})
export class IndicadoresExcelService {

  // ==========================================================================
  // EXPORTAR MATRIZ DE CASOS AT (ACCIDENTALIDAD E INCIDENTES)
  // ==========================================================================
  async exportarMatrizCasos(
    casos: MatrizAtCaso[],
    sedes: SedeLite[],
    empresaNombre: string,
    anio: number
  ): Promise<void> {
    if (!casos || casos.length === 0) {
      alert('No hay casos registrados para exportar con los filtros actuales.');
      return;
    }

    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'Alnilam 360 · SG-SST';
    wb.created = new Date();

    const empresa = empresaNombre || 'Empresa';
    const NOW = new Date();
    const sedesMap = new Map<string, string>(sedes.map(s => [s.id, s.nombre]));

    const ws = wb.addWorksheet('Matriz de Casos AT', {
      properties: { tabColor: { argb: 'FF1E40AF' } },
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      },
      views: [{ state: 'frozen', xSplit: 5, ySplit: 5 }]
    });

    // Colores corporativos
    const C = {
      h1: 'FF0F2942',        // Encabezado institucional oscuro
      h2: 'FF1E40AF',        // Azul corporativo
      h3: 'FF1E293B',        // Gris pizarra oscuro
      headerFill: 'FF1E3A8A',// Azul marino cabecera
      headerText: 'FFFFFFFF',// Blanco
      altRow: 'FFF8FAFC',    // Fila alterna
      border: 'FFCBD5E1',    // Borde suave
      // Semáforos gravedad
      leveBg: 'FFFEF3C7', leveTx: 'FF92400E',
      graveBg: 'FFFFEDD5', graveTx: 'FFC2410C',
      mortalBg: 'FFFEE2E2', mortalTx: 'FF991B1B',
      incidenteBg: 'FFCFFAFE', incidenteTx: 'FF155E75'
    };

    const bdrThin = {
      top: { style: 'thin' as const, color: { argb: C.border } },
      bottom: { style: 'thin' as const, color: { argb: C.border } },
      left: { style: 'thin' as const, color: { argb: C.border } },
      right: { style: 'thin' as const, color: { argb: C.border } }
    };

    const TOTAL_COLS = 26;

    // Fila 1: Título superior institucional
    ws.mergeCells(1, 1, 1, TOTAL_COLS);
    const f1 = ws.getCell(1, 1);
    f1.value = 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO · SG-SST  |  ALNILAM 360';
    f1.font = { name: 'Calibri', size: 9, color: { argb: 'FF93C5FD' }, bold: true };
    f1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h1 } };
    f1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 20;

    // Fila 2: Título del reporte
    ws.mergeCells(2, 1, 2, TOTAL_COLS);
    const f2 = ws.getCell(2, 1);
    f2.value = 'MATRIZ DE REGISTRO E INVESTIGACIÓN DE ACCIDENTES E INCIDENTES DE TRABAJO (AT)';
    f2.font = { name: 'Calibri', size: 14, color: { argb: 'FFFFFFFF' }, bold: true };
    f2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h2 } };
    f2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 36;

    // Fila 3: Parámetros del reporte
    ws.mergeCells(3, 1, 3, TOTAL_COLS);
    const f3 = ws.getCell(3, 1);
    const fechaEmision = NOW.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    f3.value = `Empresa: ${empresa}  ·  Año: ${anio}  ·  Total Casos Exportados: ${casos.length}  ·  Fecha de Generación: ${fechaEmision}  ·  Normativa: Res. 0312/2019, Res. 1401/2007, Res. 156/2005`;
    f3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
    f3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h3 } };
    f3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(3).height = 22;

    // Fila 4: Espacio separador
    ws.getRow(4).height = 6;

    // Fila 5: Cabecera de columnas
    const headers = [
      { header: 'N°', key: 'num', width: 6 },
      { header: 'Fecha y Hora', key: 'fecha_hora', width: 17 },
      { header: 'Tipo Evento', key: 'tipo_evento', width: 16 },
      { header: 'Doc. Trabajador', key: 'documento', width: 15 },
      { header: 'Nombre Trabajador', key: 'nombre', width: 26 },
      { header: 'Cargo', key: 'cargo', width: 20 },
      { header: 'Vinculación', key: 'vinculacion', width: 14 },
      { header: 'Sede', key: 'sede', width: 16 },
      { header: 'Área / Proceso', key: 'area', width: 18 },
      { header: 'Actividad al Momento', key: 'actividad', width: 22 },
      { header: 'Gravedad', key: 'gravedad', width: 13 },
      { header: 'Tipo Accidente', key: 'tipo_accidente', width: 18 },
      { header: 'Lugar Ocurrencia', key: 'lugar', width: 15 },
      { header: 'Días Incap.', key: 'dias_incap', width: 12 },
      { header: 'Días Carg.', key: 'dias_carg', width: 12 },
      { header: 'Días Perdidos', key: 'dias_totales', width: 14 },
      { header: 'Reporte ARL', key: 'reporte_arl', width: 13 },
      { header: 'Fecha Rep. ARL', key: 'fecha_arl', width: 15 },
      { header: 'Radicado FURAT', key: 'furat', width: 16 },
      { header: 'Estado Caso', key: 'estado', width: 15 },
      { header: 'Metodología Inv.', key: 'metodologia', width: 17 },
      { header: 'Fecha Inv.', key: 'fecha_inv', width: 13 },
      { header: 'Inv. a Tiempo', key: 'a_tiempo', width: 13 },
      { header: 'Conclusiones Investigación', key: 'conclusiones', width: 30 },
      { header: 'Acciones Def.', key: 'num_acciones', width: 13 },
      { header: 'Descripción del Evento', key: 'descripcion', width: 35 }
    ];

    ws.columns = headers.map(h => ({ key: h.key, width: h.width }));

    const headerRow = ws.getRow(5);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h.header;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerFill } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = bdrThin;
    });
    headerRow.height = 28;

    // Filas de datos
    casos.forEach((c, index) => {
      const rowIdx = 6 + index;
      const r = ws.getRow(rowIdx);

      const fechaFmt = c.fecha_hora_evento ? c.fecha_hora_evento.replace('T', ' ').slice(0, 16) : '—';
      const esIncidente = c.tipo_evento === 'incidente_casi_accidente';
      const tipoEventoStr = esIncidente ? 'Incidente' : 'Accidente de Trabajo';
      const sedeNombre = c.sede_id ? (sedesMap.get(c.sede_id) || '—') : '—';
      const gravedadStr = esIncidente ? 'Incidente' : (c.clasificacion_gravedad ? c.clasificacion_gravedad.toUpperCase() : 'LEVE');
      const diasIncap = c.dias_incapacidad || 0;
      const diasCarg = c.dias_cargados || 0;
      const diasTot = diasIncap + diasCarg;
      const reporteArlStr = c.reportado_arl ? 'SÍ' : 'NO';
      const estadoStr = c.estado_caso === 'cerrado' ? 'Cerrado' : c.estado_caso === 'en_investigacion' ? 'En Investigación' : 'Reportado';
      const inv = c.investigacion;
      const fechaInv = inv?.fecha_investigacion ? inv.fecha_investigacion.slice(0, 10) : '—';
      const invATiempo = inv ? (inv.fuera_de_plazo ? 'Fuera de Plazo' : 'A Tiempo') : 'Pendiente';
      const numAcciones = c.acciones?.length || 0;

      r.values = [
        index + 1,
        fechaFmt,
        tipoEventoStr,
        c.trabajador_documento || '—',
        c.trabajador_nombre || '—',
        c.trabajador_cargo || '—',
        c.trabajador_vinculacion || 'Directo',
        sedeNombre,
        c.area_proceso || '—',
        c.actividad_al_momento || '—',
        gravedadStr,
        c.tipo_accidente || 'Propios del trabajo',
        c.lugar_ocurrencia || 'Dentro de instalaciones',
        diasIncap,
        diasCarg,
        diasTot,
        reporteArlStr,
        c.fecha_reporte_arl ? c.fecha_reporte_arl.slice(0, 10) : '—',
        c.furat_radicado || '—',
        estadoStr,
        inv?.metodologia || '—',
        fechaInv,
        invATiempo,
        inv?.conclusiones || '—',
        numAcciones,
        c.descripcion_evento || '—'
      ];

      r.height = 20;

      // Estilo de celdas
      for (let col = 1; col <= TOTAL_COLS; col++) {
        const cell = r.getCell(col);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = bdrThin;

        // Fila alterna
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
        }

        // Alineación según tipo
        if ([1, 14, 15, 16, 25].includes(col)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if ([2, 11, 17, 18, 20, 22, 23].includes(col)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }

      // Semáforo en columna Gravedad (Columna 11)
      const gravCell = r.getCell(11);
      if (esIncidente) {
        gravCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.incidenteBg } };
        gravCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: C.incidenteTx } };
      } else if (c.clasificacion_gravedad === 'mortal') {
        gravCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.mortalBg } };
        gravCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: C.mortalTx } };
      } else if (c.clasificacion_gravedad === 'grave') {
        gravCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.graveBg } };
        gravCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: C.graveTx } };
      } else {
        gravCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.leveBg } };
        gravCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: C.leveTx } };
      }
    });

    // Guardar y descargar
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matriz_Casos_AT_${empresa.replace(/\s+/g, '_')}_${anio}_${NOW.toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // EXPORTAR INDICADORES DE ACCIDENTALIDAD (TABLERO Y ESTADÍSTICAS)
  // ==========================================================================
  async exportarIndicadoresAt(datos: {
    empresaNombre: string;
    anio: number;
    mensuales: IndicadoresMes[];
    anual: IndicadoresPeriodo;
    agrupaciones: AgrupacionesViz;
    diasSinAt: DiasSinAccidentes;
    constanteK: number;
  }): Promise<void> {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'Alnilam 360 · SG-SST';
    wb.created = new Date();

    const empresa = datos.empresaNombre || 'Empresa';
    const anio = datos.anio;
    const NOW = new Date();

    // ──────────────────────────────────────────────────────────────────────────
    // HOJA 1: TABLA MENSUAL Y ANUAL DE INDICADORES
    // ──────────────────────────────────────────────────────────────────────────
    const ws1 = wb.addWorksheet('Indicadores Mensuales', {
      properties: { tabColor: { argb: 'FF10B981' } },
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      },
      views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }]
    });

    const C = {
      h1: 'FF0F2942',
      h2: 'FF047857',        // Esmeralda SG-SST
      h3: 'FF1E293B',
      headerFill: 'FF065F46',
      totalRowFill: 'FFD1FAE5',
      totalRowText: 'FF064E3B',
      border: 'FFCBD5E1',
      altRow: 'FFF8FAFC'
    };

    const bdrThin = {
      top: { style: 'thin' as const, color: { argb: C.border } },
      bottom: { style: 'thin' as const, color: { argb: C.border } },
      left: { style: 'thin' as const, color: { argb: C.border } },
      right: { style: 'thin' as const, color: { argb: C.border } }
    };

    const TOTAL_COLS_K = 15;

    // Fila 1: Institucional
    ws1.mergeCells(1, 1, 1, TOTAL_COLS_K);
    const f1 = ws1.getCell(1, 1);
    f1.value = 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO · ALNILAM 360';
    f1.font = { name: 'Calibri', size: 9, color: { argb: 'FFA7F3D0' }, bold: true };
    f1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h1 } };
    f1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws1.getRow(1).height = 20;

    // Fila 2: Título
    ws1.mergeCells(2, 1, 2, TOTAL_COLS_K);
    const f2 = ws1.getCell(2, 1);
    f2.value = 'TABLERO DE INDICADORES DE ACCIDENTALIDAD LABORAL (AT) — RESOLUCIÓN 0312/2019 Y GTC 3701';
    f2.font = { name: 'Calibri', size: 13, color: { argb: 'FFFFFFFF' }, bold: true };
    f2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h2 } };
    f2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(2).height = 36;

    // Fila 3: Metadatos y Días sin Accidentes
    ws1.mergeCells(3, 1, 3, TOTAL_COLS_K);
    const f3 = ws1.getCell(3, 1);
    const diasSinAccidenteStr = datos.diasSinAt ? `${datos.diasSinAt.dias} días sin accidentes` : '—';
    f3.value = `Empresa: ${empresa}  ·  Año Evaluado: ${anio}  ·  Constante K: ${datos.constanteK.toLocaleString()}  ·  Récord Actual: ${diasSinAccidenteStr}  ·  Fecha de Reporte: ${NOW.toLocaleDateString('es-CO')}`;
    f3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
    f3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h3 } };
    f3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws1.getRow(3).height = 22;

    // Fila 4: Espacio
    ws1.getRow(4).height = 6;

    // Fila 5: Encabezados
    const headersInd = [
      { header: 'Mes', width: 12 },
      { header: 'N° Trab.', width: 12 },
      { header: 'HHT (Horas)', width: 15 },
      { header: 'N° AT', width: 10 },
      { header: 'AT Mortal', width: 11 },
      { header: 'Incidentes', width: 12 },
      { header: 'Días Incap.', width: 13 },
      { header: 'Días Carg.', width: 12 },
      { header: 'Días Totales', width: 14 },
      { header: 'Frecuencia (IF) Res. 0312', width: 18 },
      { header: 'Severidad (IS) Res. 0312', width: 18 },
      { header: 'Proporción Mortal (%)', width: 18 },
      { header: 'IF (GTC 3701)', width: 15 },
      { header: 'IS (GTC 3701)', width: 15 },
      { header: 'ILI (GTC 3701)', width: 15 }
    ];

    ws1.columns = headersInd.map(h => ({ width: h.width }));
    const rowHeader = ws1.getRow(5);
    headersInd.forEach((h, idx) => {
      const cell = rowHeader.getCell(idx + 1);
      cell.value = h.header;
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerFill } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = bdrThin;
    });
    rowHeader.height = 32;

    // Filas de los 12 meses
    datos.mensuales.forEach((m, idx) => {
      const rowIdx = 6 + idx;
      const r = ws1.getRow(rowIdx);

      r.values = [
        m.label,
        m.numTrabajadores || 0,
        m.horasHombre || 0,
        m.numAt || 0,
        m.numAtMortales || 0,
        m.numIncidentes || 0,
        m.diasIncapacidad || 0,
        m.diasCargados || 0,
        (m.diasIncapacidad || 0) + (m.diasCargados || 0),
        m.frecuenciaAccidentalidad?.valor != null ? +m.frecuenciaAccidentalidad.valor.toFixed(2) : 0,
        m.severidadAccidentalidad?.valor != null ? +m.severidadAccidentalidad.valor.toFixed(2) : 0,
        m.tasaAccidentalidad?.valor != null ? +m.tasaAccidentalidad.valor.toFixed(2) : 0,
        m.indiceFrecuencia?.valor != null ? +m.indiceFrecuencia.valor.toFixed(2) : 0,
        m.indiceSeveridad?.valor != null ? +m.indiceSeveridad.valor.toFixed(2) : 0,
        m.indiceLesionIncapacitante?.valor != null ? +m.indiceLesionIncapacitante.valor.toFixed(2) : 0
      ];

      r.height = 20;

      for (let col = 1; col <= TOTAL_COLS_K; col++) {
        const cell = r.getCell(col);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = bdrThin;
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
        }
        cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
      }
    });

    // Fila 18: CONSOLIDADO ANUAL
    const rowTot = ws1.getRow(18);
    const resumen = datos.anual;
    rowTot.values = [
      'TOTAL AÑO',
      resumen?.trabajadoresProm != null ? +resumen.trabajadoresProm.toFixed(1) : 0,
      resumen?.horasHombreTotal || 0,
      resumen?.numAt || 0,
      resumen?.numAtMortales || 0,
      resumen?.numIncidentes || 0,
      resumen?.diasIncapacidad || 0,
      resumen?.diasCargados || 0,
      (resumen?.diasIncapacidad || 0) + (resumen?.diasCargados || 0),
      resumen?.frecuenciaAccidentalidad?.valor != null ? +resumen.frecuenciaAccidentalidad.valor.toFixed(2) : 0,
      resumen?.severidadAccidentalidad?.valor != null ? +resumen.severidadAccidentalidad.valor.toFixed(2) : 0,
      resumen?.tasaAccidentalidad?.valor != null ? +resumen.tasaAccidentalidad.valor.toFixed(2) : 0,
      resumen?.indiceFrecuencia?.valor != null ? +resumen.indiceFrecuencia.valor.toFixed(2) : 0,
      resumen?.indiceSeveridad?.valor != null ? +resumen.indiceSeveridad.valor.toFixed(2) : 0,
      resumen?.indiceLesionIncapacitante?.valor != null ? +resumen.indiceLesionIncapacitante.valor.toFixed(2) : 0
    ];
    rowTot.height = 24;

    for (let col = 1; col <= TOTAL_COLS_K; col++) {
      const cell = rowTot.getCell(col);
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C.totalRowText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.totalRowFill } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF059669' } },
        bottom: { style: 'double', color: { argb: 'FF059669' } },
        left: { style: 'thin', color: { argb: C.border } },
        right: { style: 'thin', color: { argb: C.border } }
      };
      cell.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // HOJA 2: ANÁLISIS POR AGENTE, MECANISMO Y PIRÁMIDE DE BIRD
    // ──────────────────────────────────────────────────────────────────────────
    const ws2 = wb.addWorksheet('Análisis Pareto y Causal', {
      properties: { tabColor: { argb: 'FF3B82F6' } },
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    ws2.columns = [
      { width: 35 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 8 },
      { width: 35 }, { width: 14 }, { width: 14 }, { width: 16 }
    ];

    // Encabezado Hoja 2
    ws2.mergeCells('A1:I1');
    const f21 = ws2.getCell('A1');
    f21.value = `DISTRIBUCIÓN CAUSAL Y ANÁLISIS DE PARETO · ACCIDENTALIDAD ${anio} — ${empresa}`;
    f21.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    f21.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    f21.alignment = { horizontal: 'center', vertical: 'middle' };
    ws2.getRow(1).height = 30;

    // Sub-encabezados de las 2 tablas en paralelo: Agente (A3:D3) y Mecanismo (F3:I3)
    ws2.getCell('A3').value = 'Agente de la Lesión';
    ws2.getCell('B3').value = 'Casos';
    ws2.getCell('C3').value = '% Part.';
    ws2.getCell('D3').value = '% Acumulado';

    ws2.getCell('F3').value = 'Mecanismo del Accidente';
    ws2.getCell('G3').value = 'Casos';
    ws2.getCell('H3').value = '% Part.';
    ws2.getCell('I3').value = '% Acumulado';

    ['A3', 'B3', 'C3', 'D3', 'F3', 'G3', 'H3', 'I3'].forEach(cRef => {
      const cell = ws2.getCell(cRef);
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = bdrThin;
    });
    ws2.getRow(3).height = 24;

    const agentes = datos.agrupaciones?.porAgente || [];
    const mecanismos = datos.agrupaciones?.porMecanismo || [];
    const totalAgentes = agentes.reduce((sum, item) => sum + (item.count || 0), 0) || 1;
    const totalMecanismos = mecanismos.reduce((sum, item) => sum + (item.count || 0), 0) || 1;
    let acumAgente = 0;
    let acumMec = 0;

    const maxRows = Math.max(agentes.length, mecanismos.length, 1);

    for (let i = 0; i < maxRows; i++) {
      const rowIdx = 4 + i;
      const r = ws2.getRow(rowIdx);
      r.height = 19;

      // Agente
      if (i < agentes.length) {
        const ag = agentes[i];
        const pct = (ag.count / totalAgentes) * 100;
        acumAgente += pct;
        r.getCell(1).value = ag.label;
        r.getCell(2).value = ag.count;
        r.getCell(3).value = +pct.toFixed(1) + '%';
        r.getCell(4).value = +acumAgente.toFixed(1) + '%';
      }

      // Mecanismo
      if (i < mecanismos.length) {
        const mec = mecanismos[i];
        const pctMec = (mec.count / totalMecanismos) * 100;
        acumMec += pctMec;
        r.getCell(6).value = mec.label;
        r.getCell(7).value = mec.count;
        r.getCell(8).value = +pctMec.toFixed(1) + '%';
        r.getCell(9).value = +acumMec.toFixed(1) + '%';
      }

      [1, 2, 3, 4, 6, 7, 8, 9].forEach(col => {
        const cell = r.getCell(col);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = bdrThin;
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
        }
        if ([2, 3, 4, 7, 8, 9].includes(col)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    }

    // Descargar
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = `Indicadores_Accidentalidad_AT_${empresa.replace(/\s+/g, '_')}_${anio}_${NOW.toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // EXPORTAR MATRIZ DE AUSENTISMO (REGISTRO DE INCAPACIDADES)
  // ==========================================================================
  async exportarIncapacidadesAusentismo(
    incapacidades: any[],
    empresaNombre: string,
    anio: number
  ): Promise<void> {
    if (!incapacidades || incapacidades.length === 0) {
      alert('No hay registros de incapacidades para exportar.');
      return;
    }

    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'Alnilam 360 · SG-SST';
    wb.created = new Date();

    const empresa = empresaNombre || 'Empresa';
    const NOW = new Date();

    const ws = wb.addWorksheet('Matriz de Incapacidades', {
      properties: { tabColor: { argb: 'FFF59E0B' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      views: [{ state: 'frozen', xSplit: 4, ySplit: 5 }]
    });

    const C = {
      h1: 'FF0F2942',
      h2: 'FFB45309',        // Ámbar ausentismo
      h3: 'FF1E293B',
      headerFill: 'FF92400E',
      headerText: 'FFFFFFFF',
      altRow: 'FFF8FAFC',
      border: 'FFCBD5E1'
    };

    const bdrThin = {
      top: { style: 'thin' as const, color: { argb: C.border } },
      bottom: { style: 'thin' as const, color: { argb: C.border } },
      left: { style: 'thin' as const, color: { argb: C.border } },
      right: { style: 'thin' as const, color: { argb: C.border } }
    };

    const TOTAL_COLS = 19;

    ws.mergeCells(1, 1, 1, TOTAL_COLS);
    const f1 = ws.getCell(1, 1);
    f1.value = 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO · ALNILAM 360';
    f1.font = { name: 'Calibri', size: 9, color: { argb: 'FFFDE68A' }, bold: true };
    f1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h1 } };
    f1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 20;

    ws.mergeCells(2, 1, 2, TOTAL_COLS);
    const f2 = ws.getCell(2, 1);
    f2.value = 'REGISTRO Y CONTROL DE INCAPACIDADES LABORALES Y COMUNES (AUSENTISMO)';
    f2.font = { name: 'Calibri', size: 13, color: { argb: 'FFFFFFFF' }, bold: true };
    f2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h2 } };
    f2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 36;

    const totalDias = incapacidades.reduce((acc, cur) => acc + (cur.dias_incapacidad || 0), 0);
    ws.mergeCells(3, 1, 3, TOTAL_COLS);
    const f3 = ws.getCell(3, 1);
    f3.value = `Empresa: ${empresa}  ·  Año: ${anio}  ·  Total Registros: ${incapacidades.length}  ·  Total Días Incapacidad: ${totalDias}  ·  Generado: ${NOW.toLocaleDateString('es-CO')}`;
    f3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
    f3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h3 } };
    f3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(3).height = 22;

    ws.getRow(4).height = 6;

    const headers = [
      { header: 'N°', width: 6 },
      { header: 'Mes', width: 8 },
      { header: 'Cédula', width: 15 },
      { header: 'Nombre del Trabajador', width: 26 },
      { header: 'Cargo', width: 20 },
      { header: 'Tipo Trabajador', width: 16 },
      { header: 'Sede', width: 16 },
      { header: 'Área / Proceso', width: 18 },
      { header: 'Tipo Evento', width: 14 },
      { header: 'Fecha Inicio', width: 14 },
      { header: 'Fecha Fin', width: 14 },
      { header: 'Días Incap.', width: 13 },
      { header: 'Días Mes Real', width: 14 },
      { header: 'Días Mes Sig.', width: 14 },
      { header: 'Cód. CIE-10', width: 14 },
      { header: 'Diagnóstico Médico', width: 32 },
      { header: 'Salario Base', width: 15 },
      { header: 'Costo Empresa', width: 15 },
      { header: 'Costo EPS / ARL', width: 16 }
    ];

    ws.columns = headers.map(h => ({ width: h.width }));
    const headerRow = ws.getRow(5);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h.header;
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerFill } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = bdrThin;
    });
    headerRow.height = 30;

    incapacidades.forEach((inc, idx) => {
      const r = ws.getRow(6 + idx);
      const sedeStr = inc.sede?.nombre || '—';
      const costoEmpresa = inc.costos_asumidos_empresa || 0;
      const costoAseg = (inc.costos_asegurados_eps || 0) + (inc.costos_asegurados_arl || 0);

      r.values = [
        idx + 1,
        inc.mes,
        inc.trabajador_documento || '—',
        inc.trabajador_nombre || '—',
        inc.cargo || '—',
        inc.tipo_trabajador || 'Directo',
        sedeStr,
        inc.area_proceso || '—',
        inc.tipo_evento,
        inc.fecha_inicial ? inc.fecha_inicial.slice(0, 10) : '—',
        inc.fecha_final ? inc.fecha_final.slice(0, 10) : '—',
        inc.dias_incapacidad || 0,
        inc.dias_mes_real || 0,
        inc.dias_mes_siguiente || 0,
        inc.codigo_cie10 || '—',
        inc.diagnostico || '—',
        inc.salario_base || 0,
        costoEmpresa,
        costoAseg
      ];

      r.height = 20;

      for (let col = 1; col <= TOTAL_COLS; col++) {
        const cell = r.getCell(col);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = bdrThin;
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };

        if ([1, 2, 9, 10, 11, 12, 13, 14, 15].includes(col)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if ([17, 18, 19].includes(col)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matriz_Incapacidades_Ausentismo_${empresa.replace(/\s+/g, '_')}_${anio}_${NOW.toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // EXPORTAR MATRIZ DE CASOS DE ENFERMEDAD LABORAL (EL)
  // ==========================================================================
  async exportarCasosEnfermedadLaboral(
    casos: any[],
    empresaNombre: string,
    anio: number
  ): Promise<void> {
    if (!casos || casos.length === 0) {
      alert('No hay casos de Enfermedad Laboral para exportar.');
      return;
    }

    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'Alnilam 360 · SG-SST';
    wb.created = new Date();

    const empresa = empresaNombre || 'Empresa';
    const NOW = new Date();

    const ws = wb.addWorksheet('Casos Enfermedad Laboral', {
      properties: { tabColor: { argb: 'FFE11D48' } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      views: [{ state: 'frozen', xSplit: 4, ySplit: 5 }]
    });

    const C = {
      h1: 'FF0F2942',
      h2: 'FFE11D48',        // Rosa/Carmesí EL
      h3: 'FF1E293B',
      headerFill: 'FF9F1239',
      headerText: 'FFFFFFFF',
      altRow: 'FFF8FAFC',
      border: 'FFCBD5E1'
    };

    const bdrThin = {
      top: { style: 'thin' as const, color: { argb: C.border } },
      bottom: { style: 'thin' as const, color: { argb: C.border } },
      left: { style: 'thin' as const, color: { argb: C.border } },
      right: { style: 'thin' as const, color: { argb: C.border } }
    };

    const TOTAL_COLS = 18;

    ws.mergeCells(1, 1, 1, TOTAL_COLS);
    const f1 = ws.getCell(1, 1);
    f1.value = 'SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO · ALNILAM 360';
    f1.font = { name: 'Calibri', size: 9, color: { argb: 'FFFECDD3' }, bold: true };
    f1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h1 } };
    f1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(1).height = 20;

    ws.mergeCells(2, 1, 2, TOTAL_COLS);
    const f2 = ws.getCell(2, 1);
    f2.value = 'CARACTERIZACIÓN Y MATRIZ DE CASOS DE ENFERMEDAD LABORAL (E.L.)';
    f2.font = { name: 'Calibri', size: 13, color: { argb: 'FFFFFFFF' }, bold: true };
    f2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h2 } };
    f2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 36;

    ws.mergeCells(3, 1, 3, TOTAL_COLS);
    const f3 = ws.getCell(3, 1);
    f3.value = `Empresa: ${empresa}  ·  Año: ${anio}  ·  Total Casos E.L.: ${casos.length}  ·  Generado: ${NOW.toLocaleDateString('es-CO')}`;
    f3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FFFFFFFF' } };
    f3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.h3 } };
    f3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(3).height = 22;

    ws.getRow(4).height = 6;

    const headers = [
      { header: 'N°', width: 6 },
      { header: 'Año Notificación', width: 14 },
      { header: 'Cédula', width: 15 },
      { header: 'Nombre del Trabajador', width: 26 },
      { header: 'Cargo', width: 20 },
      { header: 'Vinculación', width: 14 },
      { header: 'Sede', width: 16 },
      { header: 'Área / Proceso', width: 18 },
      { header: 'Ciudad', width: 14 },
      { header: 'Tipo Caso', width: 13 },
      { header: 'Fecha Calificación', width: 16 },
      { header: 'Entidad Calificadora', width: 20 },
      { header: 'Cód. CIE-10', width: 14 },
      { header: 'Diagnóstico Médico', width: 32 },
      { header: '% PCL', width: 12 },
      { header: 'Origen / Factor Peligro', width: 22 },
      { header: 'Estado Caso', width: 16 },
      { header: 'Inv. Realizada', width: 14 }
    ];

    ws.columns = headers.map(h => ({ width: h.width }));
    const headerRow = ws.getRow(5);
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h.header;
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerFill } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = bdrThin;
    });
    headerRow.height = 30;

    casos.forEach((c, idx) => {
      const r = ws.getRow(6 + idx);
      const sedeStr = c.sede?.nombre || '—';
      const invStr = c.investigacion_realizada ? 'SÍ' : 'NO';

      r.values = [
        idx + 1,
        c.anio_notificacion,
        c.trabajador_documento || '—',
        c.trabajador_nombre || '—',
        c.cargo || '—',
        c.trabajador_vinculacion || 'Directo',
        sedeStr,
        c.area_proceso || '—',
        c.ciudad || '—',
        c.tipo_caso || 'Nuevo',
        c.fecha_calificacion ? c.fecha_calificacion.slice(0, 10) : '—',
        c.entidad_calificacion || '—',
        c.codigo_cie10 || '—',
        c.diagnostico || '—',
        c.porcentaje_pcl != null ? `${c.porcentaje_pcl}%` : '—',
        c.origen_peligro || '—',
        c.estado_caso || 'Calificado',
        invStr
      ];

      r.height = 20;

      for (let col = 1; col <= TOTAL_COLS; col++) {
        const cell = r.getCell(col);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = bdrThin;
        if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };

        if ([1, 2, 10, 11, 13, 15, 17, 18].includes(col)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matriz_Casos_Enfermedad_Laboral_${empresa.replace(/\s+/g, '_')}_${anio}_${NOW.toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

