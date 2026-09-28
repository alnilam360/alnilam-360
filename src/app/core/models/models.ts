export interface CatalogoCiuoOficio {
    id: string;
    clase_riesgo: string;
    codigo_ciuo: string;
    descripcion_oficio: string;
    nivel_riesgo_numeral: NivelRiesgo;
    activo: boolean;
    created_at?: string;
}

export interface Empresa {
    id?: string;
    nit: string;
    nombre: string;
    departamento: string;
    municipio: string;
    actividad_economica: string;
    direccion: string;
    telefono: string;
    email: string;
    asegurado: boolean;
    representante_legal: {
        nombre: string;
        email: string;
        telefono: string;
    };
    encargado_sst: {
        nombre: string;
        email: string;
        telefono: string;
    };
    trabajadores: {
        directos: number;
        directos_hombres: number;
        directos_mujeres: number;
        aprendices: number;
        aprendices_hombres: number;
        aprendices_mujeres: number;
        contratistas: number;
        contratistas_hombres: number;
        contratistas_mujeres: number;
        brigadistas: number;
        brigadistas_hombres: number;
        brigadistas_mujeres: number;
    };
    descripcion: string;
    horarios: {
        manana: boolean;
        tarde: boolean;
        noche: boolean;
        continuo: boolean;
    };
    // Campos Res. 0312 (SGSST)
    numero_empleados?: number;
    nivel_riesgo?: NivelRiesgo | null;
    // CIUO-08
    id_oficio_ciuo?: string | null;
    oficio_ciuo?: Partial<CatalogoCiuoOficio> | null;
    created_at?: string;
    updated_at?: string;
}

export type NivelRiesgo = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface Sede {
    id?: string;
    empresa_id: string;
    nombre: string;
    departamento: string;
    municipio: string;
    direccion: string;
    persona_encargada: string;
    correo: string;
    telefono: string;
    descripcion?: string;
    numero_trabajadores?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Trabajador {
    id?: string;
    empresa_id: string;
    sede_id: string;
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
    activo: boolean;
    created_at?: string;
    updated_at?: string;
    // Join embebido (opcional)
    sede?: Partial<Sede> | null;
}

/** Calcula edad en años a partir de fecha ISO. */
export function calcularEdad(fechaNacimiento: string | null | undefined): number | null {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}

export interface CatalogoSeguridadSocial {
    id?: string;
    tipo: 'EPS' | 'ARL' | 'PENSION';
    codigo?: string | null;
    nombre: string;
    sigla?: string | null;
    regimen?: string | null;
    orden: number;
    activo: boolean;
}

export interface Usuario {
    id?: string;
    auth_id?: string;
    empresa_id: string;
    nombre: string;
    email: string;
    telefono?: string;
    rol?: string;
    rol_id?: string;
    cargo?: string;
    estado: boolean;
    avatar_url?: string;
    created_at?: string;
    updated_at?: string;
    empresa?: Empresa;
    rol_data?: Rol;
}

export interface Rol {
    id?: string;
    empresa_id: string;
    nombre: string;
    descripcion?: string;
    created_at?: string;
    updated_at?: string;
    permisos?: RolPermiso[];
}

export interface RolPermiso {
    id?: string;
    rol_id: string;
    modulo_id: string;
    puede_ver: boolean;
    puede_crear?: boolean;
    puede_editar?: boolean;
    puede_eliminar?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface UsuarioSede {
    id?: string;
    usuario_id: string;
    sede_id: string;
    created_at?: string;
}

export interface Departamento {
    id: string;
    nombre: string;
    codigo: string;
}

export interface Municipio {
    id: string;
    nombre: string;
    codigo: string;
    departamento_id: string;
}

export interface CatalogoCie10 {
    id?: string;
    codigo: string;
    descripcion: string;
    capitulo?: string | null;
    es_frecuente: boolean;
    activo: boolean;
    created_at?: string;
}
