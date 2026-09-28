-- ============================================================================
-- Alnilam 360 - Indicadores SG-SST (4 Módulos) & Planes de Acción
-- Tablas:
--   1. indicadores_analisis_planes (Planes de Acción con Responsable, Fecha, Área)
--   2. indicadores_el_casos (Enfermedad Laboral - Hoja caracterizacion EL)
--   3. indicadores_incapacidades (Ausentismo - Hoja Registro de incapacidades)
-- ============================================================================

-- 1. TABLA: PLANES DE ACCIÓN Y ANÁLISIS DEL INDICADOR
CREATE TABLE IF NOT EXISTS public.indicadores_analisis_planes (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_indicador    text NOT NULL CHECK (tipo_indicador IN ('AT', 'EL', 'AUSENTISMO', 'EPR')),
    anio              integer NOT NULL,
    periodo           text NOT NULL, -- ej. 'Enero', 'Q1', 'Anual'
    analisis_texto    text,
    actividad         text NOT NULL,
    responsable       text NOT NULL,
    area_responsable  text NOT NULL,
    fecha_programada  date,
    fecha_ejecucion   date,
    estado            text NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En Ejecución', 'Completado', 'Cancelado')),
    observaciones     text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ind_planes_empresa ON public.indicadores_analisis_planes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ind_planes_tipo_anio ON public.indicadores_analisis_planes(tipo_indicador, anio);

-- 2. TABLA: ENFERMEDAD LABORAL (EL)
CREATE TABLE IF NOT EXISTS public.indicadores_el_casos (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sede_id                 uuid REFERENCES public.sedes(id) ON DELETE RESTRICT,
    trabajador_documento    text NOT NULL,
    trabajador_nombre       text NOT NULL,
    trabajador_vinculacion  text,
    cargo                   text,
    area_proceso            text,
    tiempo_en_cargo         text,
    ciudad                  text,
    anio_notificacion       integer NOT NULL,
    tipo_caso               text NOT NULL CHECK (tipo_caso IN ('Nuevo', 'Antiguo')),
    fecha_calificacion      date,
    estado_caso             text NOT NULL DEFAULT 'En estudio',
    entidad_calificacion    text,
    porcentaje_pcl          numeric(5,2),
    codigo_cie10            text,
    diagnostico             text,
    origen_peligro          text,
    investigacion_realizada boolean NOT NULL DEFAULT false,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_el_casos_empresa ON public.indicadores_el_casos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_el_casos_anio ON public.indicadores_el_casos(anio_notificacion);

-- 3. TABLA: AUSENTISMO / REGISTRO DE INCAPACIDADES
CREATE TABLE IF NOT EXISTS public.indicadores_incapacidades (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sede_id                 uuid REFERENCES public.sedes(id) ON DELETE RESTRICT,
    mes                     smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio                    integer NOT NULL,
    fecha_expedicion        date,
    trabajador_documento    text NOT NULL,
    trabajador_nombre       text NOT NULL,
    cargo                   text,
    tipo_trabajador         text,
    area_proceso            text,
    tipo_evento             text NOT NULL CHECK (tipo_evento IN ('A.T.', 'E.L.', 'E.G.')),
    fecha_inicial           date NOT NULL,
    fecha_final             date NOT NULL,
    dias_incapacidad        integer NOT NULL DEFAULT 1,
    dias_mes_real           integer,
    dias_mes_siguiente      integer,
    codigo_cie10            text,
    diagnostico             text,
    salario_base            numeric(12,2),
    salario_dia             numeric(12,2),
    dias_asegurados_at      integer DEFAULT 0,
    dias_asegurados_eg      integer DEFAULT 0,
    costos_asegurados_arl   numeric(12,2) DEFAULT 0,
    costos_asegurados_eps   numeric(12,2) DEFAULT 0,
    dias_asumidos_empresa   integer DEFAULT 0,
    costos_asumidos_empresa numeric(12,2) DEFAULT 0,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incap_empresa ON public.indicadores_incapacidades(empresa_id);
CREATE INDEX IF NOT EXISTS idx_incap_anio_mes ON public.indicadores_incapacidades(anio, mes);

-- HABILITAR RLS
ALTER TABLE public.indicadores_analisis_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_el_casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_incapacidades ENABLE ROW LEVEL SECURITY;

-- Políticas de desarrollo / tenant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indicadores_analisis_planes' AND policyname = 'temp_open_ind_planes') THEN
        CREATE POLICY temp_open_ind_planes ON public.indicadores_analisis_planes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indicadores_el_casos' AND policyname = 'temp_open_el_casos') THEN
        CREATE POLICY temp_open_el_casos ON public.indicadores_el_casos FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'indicadores_incapacidades' AND policyname = 'temp_open_incap') THEN
        CREATE POLICY temp_open_incap ON public.indicadores_incapacidades FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
