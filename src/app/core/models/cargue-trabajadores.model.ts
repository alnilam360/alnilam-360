/**
 * Contratos de datos y tipos avanzados para el cargue masivo de trabajadores por sede.
 * Soporta archivos planos (.csv, .txt delimitado por coma o punto y coma, .xlsx/.xls).
 */

export type ModoCargueTrabajadores = 'solo_nuevos' | 'insertar_actualizar';

export type EstadoFilaValidacion = 'nuevo' | 'actualizacion' | 'traslado' | 'omitido' | 'rechazado';

export interface FilaTrabajadorPlano {
  fila: number;
  documento: string;
  nombre: string;
  fecha_nacimiento?: string | null;
  fecha_ingreso?: string | null;
  cargo?: string | null;
  area_trabajo?: string | null;
  eps?: string | null;
  arl?: string | null;
  fondo_pensiones?: string | null;
  telefono?: string | null;
  activo?: boolean;
}

export interface FilaTrabajadorValidada extends FilaTrabajadorPlano {
  estado: EstadoFilaValidacion;
  edadCalculada?: number | null;
  errores: string[];
  advertencias: string[];
  sedeActualNombre?: string | null;
  cambiaSede?: boolean;
}

export interface DetalleCargueFila {
  fila: number;
  documento: string;
  estado: 'rechazado' | 'omitido';
  motivo: string;
}

export interface ResultadoCargueBackend {
  cargue_id: string | null;
  simulado: boolean;
  total: number;
  insertados: number;
  actualizados: number;
  trasladados: number;
  omitidos: number;
  rechazados: number;
  detalle: DetalleCargueFila[];
}

export interface HistorialCargue {
  id: string;
  empresa_id: string;
  sede_id: string;
  usuario_auth_id: string | null;
  archivo_nombre: string;
  modo: ModoCargueTrabajadores;
  total_filas: number;
  insertados: number;
  actualizados: number;
  trasladados: number;
  omitidos: number;
  rechazados: number;
  detalle: DetalleCargueFila[];
  created_at: string;
}

export interface ResumenValidacionLocal {
  total: number;
  validos: number;
  nuevos: number;
  actualizaciones: number;
  traslados: number;
  rechazados: number;
  advertencias: number;
}

/** Columnas estándar reconocidas y sus variantes comunes en nómina colombiana */
export const ALIAS_COLUMNAS_PLANO: Record<keyof Omit<FilaTrabajadorPlano, 'fila'>, readonly string[]> = {
  documento: [
    'documento', 'cedula', 'cc', 'identificacion', 'num_documento',
    'no_documento', 'doc', 'numero_identificacion', 'nro_documento'
  ],
  nombre: [
    'nombre', 'nombres', 'nombre_completo', 'empleado', 'trabajador',
    'apellidos_y_nombres', 'nombres_y_apellidos'
  ],
  fecha_nacimiento: [
    'fecha_nacimiento', 'nacimiento', 'f_nacimiento', 'fecha_nac',
    'fechanacimiento', 'f_nac'
  ],
  fecha_ingreso: [
    'fecha_ingreso', 'ingreso', 'f_ingreso', 'fecha_inicio',
    'fechaingreso', 'f_ing'
  ],
  cargo: [
    'cargo', 'puesto', 'oficio', 'ocupacion', 'cargo_actual'
  ],
  area_trabajo: [
    'area_trabajo', 'area', 'departamento', 'seccion', 'centro_costo',
    'ubicacion_laboral'
  ],
  eps: [
    'eps', 'entidad_salud', 'salud'
  ],
  arl: [
    'arl', 'riesgos_laborales', 'aseguradora'
  ],
  fondo_pensiones: [
    'fondo_pensiones', 'pension', 'afp', 'pensiones', 'fondo_pension'
  ],
  telefono: [
    'telefono', 'celular', 'movil', 'tel', 'contacto'
  ],
  activo: [
    'activo', 'estado', 'vigente', 'laborando'
  ]
} as const;
