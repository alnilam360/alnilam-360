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
    created_at?: string;
    updated_at?: string;
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
    created_at?: string;
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
