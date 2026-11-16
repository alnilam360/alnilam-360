// Modelos: Programa de Capacitacion con lazo de eficacia (plan 14).

export type CapFuente = 'iperc' | 'hallazgo' | 'manual';
export type CapEstadoSesion = 'programada' | 'dictada' | 'cancelada';

export interface CapTema {
    id?: string;
    empresa_id: string;
    nombre: string;
    descripcion?: string | null;
    grupo_objetivo_id?: string | null;
    iperc_id?: string | null;
    fuente: CapFuente;
    obligatorio?: boolean | null;
    horas_min?: number | null;
    activo?: boolean | null;
    created_at?: string;
}

export interface CapSesion {
    id?: string;
    empresa_id: string;
    tema_id: string;
    fecha: string; // date ISO (YYYY-MM-DD)
    facilitador?: string | null;
    modalidad?: string | null;
    horas?: number | null;
    area_trabajo?: string | null;
    sede_id?: string | null;
    evidencia_url?: string | null;
    estado: CapEstadoSesion;
    created_at?: string;
}

export interface CapAsistencia {
    id?: string;
    empresa_id: string;
    sesion_id: string;
    trabajador_id: string;
    asistio?: boolean | null;
    nota_evaluacion?: number | null;
    aprobado?: boolean | null;
    created_at?: string;
}

/** Retorno de RPC cap_necesidades_desde_iperc. */
export interface NecesidadIperc {
    iperc_id: string;
    proceso: string;
    zona_lugar: string | null;
    cargo: string | null;
    peligro_descripcion: string | null;
    nivel_riesgo: number | null;
    interpretacion_np: string | null;
}

/** Retorno de RPC cap_eficacia_tema. mejora_pct es null si antes = 0. */
export interface EficaciaSesion {
    sesion_id: string;
    fecha: string;
    antes: number;
    despues: number;
    delta: number;
    mejora_pct: number | null;
}
