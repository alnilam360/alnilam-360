import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { SupabaseClientService } from './supabase-client.service';
import {
  FilaTrabajadorPlano,
  FilaTrabajadorValidada,
  ModoCargueTrabajadores,
  ResultadoCargueBackend,
  HistorialCargue,
  ResumenValidacionLocal,
  ALIAS_COLUMNAS_PLANO
} from '../models/cargue-trabajadores.model';
import { Trabajador, calcularEdad } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class CargueTrabajadoresService {
  private sb = inject(SupabaseClientService);

  /**
   * Lee un archivo (.csv, .txt, .xlsx, .xls) y lo transforma en filas normalizadas.
   */
  async parsearArchivo(file: File): Promise<FilaTrabajadorPlano[]> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (extension === 'xlsx' || extension === 'xls') {
      return this.parsearExcel(file);
    }
    return this.parsearTextoPlano(file);
  }

  /**
   * Parser nativo para CSV y TXT delimitado por comas, puntos y comas, tabs o pipes.
   */
  private async parsearTextoPlano(file: File): Promise<FilaTrabajadorPlano[]> {
    const rawText = await file.text();
    // Limpiar BOM UTF-8
    const cleanText = rawText.replace(/^\uFEFF/, '').trim();
    if (!cleanText) return [];

    const lines = cleanText.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Detectar delimitador inspeccionando la primera línea
    const headerLine = lines[0];
    const delimiter = this.detectarDelimitador(headerLine);

    const rawHeaders = this.splitCsvLine(headerLine, delimiter);
    const headerMap = this.construirMapaColumnas(rawHeaders);

    const filas: FilaTrabajadorPlano[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = this.splitCsvLine(line, delimiter);
      const fila = this.construirFilaDesdeCeldas(cells, headerMap, i + 1);
      // Omitir filas totalmente vacías
      if (fila.documento || fila.nombre) {
        filas.push(fila);
      }
    }

    return filas;
  }

  /**
   * Parser para Excel (.xlsx / .xls) convirtiendo primera hoja a filas normalizadas.
   */
  private async parsearExcel(file: File): Promise<FilaTrabajadorPlano[]> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];

    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false
    });

    if (!jsonData || jsonData.length < 2) return [];

    const rawHeaders = (jsonData[0] || []).map(h => String(h ?? '').trim());
    const headerMap = this.construirMapaColumnas(rawHeaders);

    const filas: FilaTrabajadorPlano[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      const cells = row.map(c => {
        if (c instanceof Date) {
          return c.toISOString().slice(0, 10);
        }
        return String(c ?? '').trim();
      });

      const fila = this.construirFilaDesdeCeldas(cells, headerMap, i + 1);
      if (fila.documento || fila.nombre) {
        filas.push(fila);
      }
    }

    return filas;
  }

  /**
   * Valida localmente las filas antes de enviarlas al servidor:
   * - Campos obligatorios y formatos regex
   * - Duplicados intra-archivo
   * - Cruce con trabajadores existentes (detecta altas, actualizaciones y traslados de sede)
   */
  validarLocalmente(
    filas: FilaTrabajadorPlano[],
    sedeDestinoId: string,
    trabajadoresEmpresa: Trabajador[]
  ): { validadas: FilaTrabajadorValidada[]; resumen: ResumenValidacionLocal } {
    // Mapa rápido de trabajadores existentes por documento normalizado
    const mapaExistentes = new Map<string, Trabajador>();
    trabajadoresEmpresa.forEach(t => {
      const doc = this.normalizarDocumento(t.documento);
      if (doc) mapaExistentes.set(doc, t);
    });

    // Control de duplicados dentro del archivo
    const primeraAparicionDoc = new Map<string, number>();

    const validadas: FilaTrabajadorValidada[] = [];

    let totalValidos = 0;
    let totalNuevos = 0;
    let totalActualizaciones = 0;
    let totalTraslados = 0;
    let totalRechazados = 0;
    let totalAdvertencias = 0;

    for (const f of filas) {
      const errores: string[] = [];
      const advertencias: string[] = [];

      const docNorm = this.normalizarDocumento(f.documento);
      const nombreNorm = f.nombre?.trim() || '';

      // 1. Validaciones requeridas
      if (!docNorm) {
        errores.push('El documento de identidad es obligatorio.');
      } else if (!/^[A-Z0-9-]{3,20}$/i.test(docNorm)) {
        errores.push('Documento inválido: use de 3 a 20 caracteres alfanuméricos.');
      }

      // Duplicados en archivo
      if (docNorm) {
        if (primeraAparicionDoc.has(docNorm)) {
          const prevFila = primeraAparicionDoc.get(docNorm);
          errores.push(`Documento duplicado en el archivo (visto primero en fila #${prevFila}).`);
        } else {
          primeraAparicionDoc.set(docNorm, f.fila);
        }
      }

      if (!nombreNorm) {
        errores.push('El nombre completo es obligatorio.');
      } else if (nombreNorm.length < 3 || nombreNorm.length > 150) {
        errores.push('El nombre debe tener entre 3 y 150 caracteres.');
      }

      // 2. Validaciones de fechas
      const nacDate = this.parsearFechaISO(f.fecha_nacimiento);
      const ingDate = this.parsearFechaISO(f.fecha_ingreso);
      const hoy = new Date();

      if (f.fecha_nacimiento && !nacDate) {
        errores.push(`Fecha de nacimiento inválida ("${f.fecha_nacimiento}"). Use formato AAAA-MM-DD o DD/MM/AAAA.`);
      } else if (nacDate) {
        if (nacDate >= hoy) {
          errores.push('La fecha de nacimiento no puede ser presente ni futura.');
        } else if (nacDate < new Date('1920-01-01')) {
          errores.push('Fecha de nacimiento fuera de rango razonable (> 1920).');
        }
      }

      if (f.fecha_ingreso && !ingDate) {
        errores.push(`Fecha de ingreso inválida ("${f.fecha_ingreso}"). Use formato AAAA-MM-DD o DD/MM/AAAA.`);
      } else if (ingDate) {
        if (ingDate > hoy) {
          advertencias.push('La fecha de ingreso es posterior a hoy (ingreso futuro programado).');
        }
        if (nacDate && ingDate <= nacDate) {
          errores.push('La fecha de ingreso debe ser posterior a la fecha de nacimiento.');
        }
      }

      // 3. Teléfono
      if (f.telefono && !/^[0-9+()\s-]{7,20}$/.test(f.telefono.trim())) {
        advertencias.push('Formato de teléfono no estándar.');
      }

      // 4. Determinar estado y cruce
      const existente = docNorm ? mapaExistentes.get(docNorm) : null;
      let estado: FilaTrabajadorValidada['estado'] = 'nuevo';
      let sedeActualNombre: string | null = null;
      let cambiaSede = false;

      if (errores.length > 0) {
        estado = 'rechazado';
        totalRechazados++;
      } else if (existente) {
        sedeActualNombre = existente.sede?.nombre || 'Otra sede';
        if (existente.sede_id === sedeDestinoId) {
          estado = 'actualizacion';
          totalActualizaciones++;
        } else {
          estado = 'traslado';
          cambiaSede = true;
          totalTraslados++;
        }
        totalValidos++;
      } else {
        estado = 'nuevo';
        totalNuevos++;
        totalValidos++;
      }

      if (advertencias.length > 0) {
        totalAdvertencias++;
      }

      validadas.push({
        ...f,
        documento: docNorm,
        nombre: nombreNorm,
        fecha_nacimiento: nacDate ? nacDate.toISOString().slice(0, 10) : null,
        fecha_ingreso: ingDate ? ingDate.toISOString().slice(0, 10) : null,
        estado,
        edadCalculada: nacDate ? calcularEdad(nacDate.toISOString().slice(0, 10)) : null,
        errores,
        advertencias,
        sedeActualNombre,
        cambiaSede
      });
    }

    return {
      validadas,
      resumen: {
        total: filas.length,
        validos: totalValidos,
        nuevos: totalNuevos,
        actualizaciones: totalActualizaciones,
        traslados: totalTraslados,
        rechazados: totalRechazados,
        advertencias: totalAdvertencias
      }
    };
  }

  /**
   * Invoca el procedimiento almacenado Supabase para aplicar el cargue masivo.
   */
  async ejecutarCargue(
    empresaId: string,
    sedeId: string,
    filas: FilaTrabajadorPlano[],
    modo: ModoCargueTrabajadores,
    archivoNombre: string,
    simular = false
  ): Promise<ResultadoCargueBackend> {
    const payloadFilas = filas.map(f => ({
      fila: f.fila,
      documento: this.normalizarDocumento(f.documento),
      nombre: f.nombre?.trim() || '',
      fecha_nacimiento: f.fecha_nacimiento || null,
      fecha_ingreso: f.fecha_ingreso || null,
      cargo: f.cargo?.trim() || null,
      area_trabajo: f.area_trabajo?.trim() || null,
      eps: f.eps?.trim() || null,
      arl: f.arl?.trim() || null,
      fondo_pensiones: f.fondo_pensiones?.trim() || null,
      telefono: f.telefono?.trim() || null,
      activo: f.activo ?? true
    }));

    const { data, error } = await this.sb.client.rpc('cargar_trabajadores_masivo', {
      p_empresa_id: empresaId,
      p_sede_id: sedeId,
      p_filas: payloadFilas,
      p_modo: modo,
      p_archivo_nombre: archivoNombre,
      p_simular: simular
    });

    if (error) throw error;
    return data as ResultadoCargueBackend;
  }

  /**
   * Consulta el historial inmutable de cargues masivos realizados en la sede.
   */
  async obtenerHistorial(sedeId: string): Promise<HistorialCargue[]> {
    const { data, error } = await this.sb.client
      .from('trabajadores_cargues')
      .select('*')
      .eq('sede_id', sedeId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return (data || []) as HistorialCargue[];
  }

  /**
   * Genera y dispara la descarga de plantilla guía (.csv o .xlsx).
   */
  descargarPlantilla(formato: 'csv' | 'xlsx'): void {
    const headers = [
      'Documento',
      'Nombre Completo',
      'Fecha Nacimiento (AAAA-MM-DD)',
      'Fecha Ingreso (AAAA-MM-DD)',
      'Cargo',
      'Area de Trabajo',
      'EPS',
      'ARL',
      'Fondo de Pensiones',
      'Telefono',
      'Activo (SI/NO)'
    ];

    const ejemplos = [
      [
        '1012345678',
        'JUAN CARLOS PEREZ GOMEZ',
        '1990-05-15',
        '2022-01-10',
        'Operario de Producción',
        'Planta Principal',
        'EPS SURA (Suramericana)',
        'Seguros de Riesgos Laborales Suramericana S.A. (ARL SURA)',
        'Protección S.A.',
        '3001234567',
        'SI'
      ],
      [
        '52987654',
        'MARIA FERNANDA RODRIGUEZ',
        '1985-11-20',
        '2020-03-01',
        'Supervisora de Calidad',
        'Control Calidad',
        'EPS Sanitas',
        'Positiva Compañía de Seguros S.A.',
        'Colpensiones (Administradora Colombiana de Pensiones)',
        '3109876543',
        'SI'
      ],
      [
        '1033445566',
        'ANDRES FELIPE MARTINEZ',
        '1998-08-30',
        '2023-06-15',
        'Auxiliar de Bodega',
        'Logística',
        'Compensar EPS',
        'AXA Colpatria Seguros S.A.',
        'Porvenir S.A.',
        '3204567890',
        'SI'
      ]
    ];

    if (formato === 'xlsx') {
      const wsData = [headers, ...ejemplos];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Ancho automático de columnas
      ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Trabajadores');
      XLSX.writeFile(wb, 'Plantilla_Cargue_Masivo_Trabajadores.xlsx');
    } else {
      // Formato CSV delimitado por punto y coma (estándar Excel en español)
      const csvContent = '\uFEFF' + [
        headers.join(';'),
        ...ejemplos.map(row => row.map(c => `"${c.replace(/"/g, '""')}"`).join(';'))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Cargue_Masivo_Trabajadores.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // ==========================================================================
  // HELPERS INTERNOS DE PARSEO Y NORMALIZACIÓN
  // ==========================================================================

  private detectarDelimitador(line: string): string {
    const comas = (line.match(/,/g) || []).length;
    const puntoYComas = (line.match(/;/g) || []).length;
    const tabs = (line.match(/\t/g) || []).length;
    const pipes = (line.match(/\|/g) || []).length;

    if (puntoYComas >= comas && puntoYComas >= tabs && puntoYComas >= pipes) return ';';
    if (tabs > comas && tabs > puntoYComas) return '\t';
    if (pipes > comas && pipes > puntoYComas) return '|';
    return ',';
  }

  private splitCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private normalizarNombreColumna(header: string): string {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private construirMapaColumnas(rawHeaders: string[]): Map<number, keyof Omit<FilaTrabajadorPlano, 'fila'>> {
    const mapa = new Map<number, keyof Omit<FilaTrabajadorPlano, 'fila'>>();
    const aliases = ALIAS_COLUMNAS_PLANO;

    rawHeaders.forEach((header, index) => {
      const norm = this.normalizarNombreColumna(header);
      for (const [key, aliasList] of Object.entries(aliases) as [keyof Omit<FilaTrabajadorPlano, 'fila'>, readonly string[]][]) {
        if (aliasList.some(a => norm === a || norm.includes(a))) {
          mapa.set(index, key);
          break;
        }
      }
    });

    return mapa;
  }

  private construirFilaDesdeCeldas(
    cells: string[],
    headerMap: Map<number, keyof Omit<FilaTrabajadorPlano, 'fila'>>,
    numFila: number
  ): FilaTrabajadorPlano {
    const fila: FilaTrabajadorPlano = {
      fila: numFila,
      documento: '',
      nombre: '',
      activo: true
    };

    cells.forEach((val, index) => {
      const field = headerMap.get(index);
      if (!field) return;

      const cleanVal = (val ?? '').trim();

      switch (field) {
        case 'documento':
          fila.documento = this.normalizarDocumento(cleanVal);
          break;
        case 'nombre':
          fila.nombre = cleanVal.replace(/\s+/g, ' ');
          break;
        case 'fecha_nacimiento':
        case 'fecha_ingreso':
          fila[field] = this.limpiarFechaTexto(cleanVal);
          break;
        case 'activo':
          fila.activo = this.normalizarBooleano(cleanVal);
          break;
        case 'cargo':
          fila.cargo = cleanVal || null;
          break;
        case 'area_trabajo':
          fila.area_trabajo = cleanVal || null;
          break;
        case 'eps':
          fila.eps = cleanVal || null;
          break;
        case 'arl':
          fila.arl = cleanVal || null;
          break;
        case 'fondo_pensiones':
          fila.fondo_pensiones = cleanVal || null;
          break;
        case 'telefono':
          fila.telefono = cleanVal || null;
          break;
      }
    });

    return fila;
  }

  private normalizarDocumento(val: string): string {
    return (val || '')
      .toString()
      .toUpperCase()
      .replace(/[\s.,-]/g, '')
      .trim();
  }

  private normalizarBooleano(val: string): boolean {
    if (!val) return true;
    const v = val.toLowerCase().trim();
    if (['no', 'false', '0', 'inactivo', 'retirado', 'n'].includes(v)) return false;
    return true;
  }

  private limpiarFechaTexto(val: string): string | null {
    if (!val) return null;
    const v = val.trim();

    // Si ya viene AAAA-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    // DD/MM/AAAA o DD-MM-AAAA
    const matchSlash = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (matchSlash) {
      const d = matchSlash[1].padStart(2, '0');
      const m = matchSlash[2].padStart(2, '0');
      const y = matchSlash[3];
      return `${y}-${m}-${d}`;
    }

    // AAAA/MM/DD
    const matchYearSlash = v.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (matchYearSlash) {
      const y = matchYearSlash[1];
      const m = matchYearSlash[2].padStart(2, '0');
      const d = matchYearSlash[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return v;
  }

  private parsearFechaISO(val: string | null | undefined): Date | null {
    if (!val) return null;
    const clean = this.limpiarFechaTexto(val);
    if (!clean || !/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;

    const parts = clean.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (
      d.getFullYear() === parts[0] &&
      d.getMonth() === parts[1] - 1 &&
      d.getDate() === parts[2]
    ) {
      return d;
    }
    return null;
  }
}
