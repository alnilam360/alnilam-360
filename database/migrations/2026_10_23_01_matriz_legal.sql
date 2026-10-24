-- ============================================================================
-- Migración: Módulo Matriz Legal (Identificación y Evaluación de Requisitos
-- Legales y de Otra Índole) — SG-SST y Ambiental.
--
-- Normativa: Decreto 1072/2015 Art. 2.2.4.6.2 (matriz legal actualizable),
-- Resolución 0312/2019 (estándares mínimos). El cumplimiento se evalúa
-- periódicamente: indicador = requisitos cumplidos / total aplicables.
--
-- Multi-tenant por empresa_id. RLS con get_my_empresa_id() e is_admin()
-- (mismo patrón que 2026_10_06_03_matriz_indicadores_registros.sql).
--
-- IMPORTANTE: no se cargan requisitos de ejemplo. Solo estructura y catálogos
-- semilla (ver seed 2026_10_23_matriz_legal_catalogos_seed.sql).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Catálogo de componentes (dominio + componente del MENU de la matriz).
--    Filas globales (empresa_id NULL) = semilla editable; una empresa puede
--    añadir componentes propios o desactivar los que no apliquen.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matriz_legal_componentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE, -- NULL = global/semilla
    dominio TEXT NOT NULL CHECK (dominio IN ('SG_SST', 'AMBIENTAL')),
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_componentes_empresa
    ON public.matriz_legal_componentes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ml_componentes_dominio
    ON public.matriz_legal_componentes(dominio, orden);

-- ----------------------------------------------------------------------------
-- 2) Catálogo global de tipos de norma (jerarquía de Kelsen).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogo_tipo_norma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    jerarquia INTEGER NOT NULL DEFAULT 0, -- 1 = Constitución, mayor = inferior
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3) Encabezado del formato de la matriz legal por empresa (hoja MENU).
--    Sin valores de ejemplo: la empresa diligencia código/versión/fechas.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matriz_legal_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo_formato TEXT NULL,
    version TEXT NULL,
    fecha_actualizacion DATE NULL,
    responsable_actualizacion TEXT NULL,
    fecha_verificacion DATE NULL,
    responsable_verificacion TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4) Requisitos legales (núcleo de la matriz).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matriz_legal_requisitos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    componente_id UUID NOT NULL REFERENCES public.matriz_legal_componentes(id) ON DELETE RESTRICT,
    tipo_norma_id UUID REFERENCES public.catalogo_tipo_norma(id) ON DELETE SET NULL,
    numero TEXT NULL,                 -- número de la norma (p. ej. '1072')
    anio INTEGER NULL,                -- año de expedición
    fecha_expedicion DATE NULL,
    entidad_emisora TEXT NULL,        -- quién expide (Min. Trabajo, etc.)
    articulos_aplicables TEXT NULL,   -- artículos concretos que aplican
    descripcion_requisito TEXT NOT NULL, -- exigencia / tema de la norma
    aplicacion_empresa TEXT NULL,     -- cómo aplica a la empresa
    estado_cumplimiento TEXT NOT NULL DEFAULT 'EN_PROCESO'
        CHECK (estado_cumplimiento IN ('CUMPLE', 'EN_PROCESO', 'NO_CUMPLE', 'NO_APLICA')),
    evidencia_cumplimiento TEXT NULL,
    responsable TEXT NULL,
    fecha_verificacion DATE NULL,
    observaciones TEXT NULL,
    es_otra_indole BOOLEAN NOT NULL DEFAULT FALSE, -- requisito de otra índole (no legal)
    vigente BOOLEAN NOT NULL DEFAULT TRUE,         -- FALSE = derogada
    norma_deroga TEXT NULL,                         -- norma que la deroga/modifica
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_requisitos_empresa_componente
    ON public.matriz_legal_requisitos(empresa_id, componente_id);
CREATE INDEX IF NOT EXISTS idx_ml_requisitos_empresa_estado
    ON public.matriz_legal_requisitos(empresa_id, estado_cumplimiento);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.matriz_legal_componentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_tipo_norma      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_legal_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_legal_requisitos   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- ── matriz_legal_componentes ────────────────────────────────────────────
    -- SELECT: globales (empresa_id NULL), los de mi empresa, o admin.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_componentes' AND policyname='ml_componentes_select') THEN
        CREATE POLICY ml_componentes_select ON public.matriz_legal_componentes
            FOR SELECT TO authenticated
            USING (
                empresa_id IS NULL
                OR empresa_id = (SELECT get_my_empresa_id())
                OR (SELECT is_admin())
            );
    END IF;
    -- Escritura: solo sobre componentes propios de la empresa, o admin (que
    -- también gestiona los globales).
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_componentes' AND policyname='ml_componentes_insert') THEN
        CREATE POLICY ml_componentes_insert ON public.matriz_legal_componentes
            FOR INSERT TO authenticated
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_componentes' AND policyname='ml_componentes_update') THEN
        CREATE POLICY ml_componentes_update ON public.matriz_legal_componentes
            FOR UPDATE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_componentes' AND policyname='ml_componentes_delete') THEN
        CREATE POLICY ml_componentes_delete ON public.matriz_legal_componentes
            FOR DELETE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;

    -- ── catalogo_tipo_norma (global) ─────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='catalogo_tipo_norma' AND policyname='tipo_norma_select') THEN
        CREATE POLICY tipo_norma_select ON public.catalogo_tipo_norma
            FOR SELECT TO authenticated USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='catalogo_tipo_norma' AND policyname='tipo_norma_write') THEN
        CREATE POLICY tipo_norma_write ON public.catalogo_tipo_norma
            FOR ALL TO authenticated
            USING ((SELECT is_admin()))
            WITH CHECK ((SELECT is_admin()));
    END IF;

    -- ── matriz_legal_config ──────────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_config' AND policyname='ml_config_select') THEN
        CREATE POLICY ml_config_select ON public.matriz_legal_config
            FOR SELECT TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_config' AND policyname='ml_config_insert') THEN
        CREATE POLICY ml_config_insert ON public.matriz_legal_config
            FOR INSERT TO authenticated
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_config' AND policyname='ml_config_update') THEN
        CREATE POLICY ml_config_update ON public.matriz_legal_config
            FOR UPDATE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;

    -- ── matriz_legal_requisitos ──────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_requisitos' AND policyname='ml_requisitos_select') THEN
        CREATE POLICY ml_requisitos_select ON public.matriz_legal_requisitos
            FOR SELECT TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_requisitos' AND policyname='ml_requisitos_insert') THEN
        CREATE POLICY ml_requisitos_insert ON public.matriz_legal_requisitos
            FOR INSERT TO authenticated
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_requisitos' AND policyname='ml_requisitos_update') THEN
        CREATE POLICY ml_requisitos_update ON public.matriz_legal_requisitos
            FOR UPDATE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_requisitos' AND policyname='ml_requisitos_delete') THEN
        CREATE POLICY ml_requisitos_delete ON public.matriz_legal_requisitos
            FOR DELETE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
END $$;
