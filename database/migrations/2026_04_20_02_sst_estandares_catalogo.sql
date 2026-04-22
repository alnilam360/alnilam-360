-- ============================================================================
-- Alnilam 360 - Fase 1 Res. 0312
-- Migration: Catálogo paramétrico global de los 60 estándares mínimos
-- ============================================================================
-- Esta tabla es global (no lleva empresa_id). Contiene los 60 estándares
-- mínimos de la Resolución 0312 de 2019 clasificados por ciclo PHVA y por
-- el universo al que pertenecen (7, 21 o 60). Lectura pública para usuarios
-- autenticados; escritura restringida al rol administrador/servicio.
-- ============================================================================

-- Tipos ENUM reutilizables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ciclo_phva_enum') THEN
        CREATE TYPE ciclo_phva_enum AS ENUM ('Planear', 'Hacer', 'Verificar', 'Actuar');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aplica_para_enum') THEN
        CREATE TYPE aplica_para_enum AS ENUM ('7', '21', '60');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sst_estandares_catalogo (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_phva            ciclo_phva_enum      NOT NULL,
    item                  text                 NOT NULL UNIQUE,
    descripcion_estandar  text                 NOT NULL,
    marco_legal           text,
    modo_verificacion     text,
    aplica_para           aplica_para_enum[]   NOT NULL DEFAULT ARRAY['60']::aplica_para_enum[],
    peso                  numeric(6,2)         NOT NULL DEFAULT 0,
    orden                 integer              NOT NULL DEFAULT 0,
    activo                boolean              NOT NULL DEFAULT true,
    created_at            timestamptz          NOT NULL DEFAULT now(),
    updated_at            timestamptz          NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sst_estandares_ciclo        ON public.sst_estandares_catalogo(ciclo_phva);
CREATE INDEX IF NOT EXISTS idx_sst_estandares_aplica_para  ON public.sst_estandares_catalogo USING GIN (aplica_para);
CREATE INDEX IF NOT EXISTS idx_sst_estandares_orden        ON public.sst_estandares_catalogo(orden);

COMMENT ON TABLE  public.sst_estandares_catalogo IS
    'Catálogo global de los 60 estándares mínimos SST (Res. 0312/2019). Sin empresa_id: es paramétrica a nivel plataforma.';
COMMENT ON COLUMN public.sst_estandares_catalogo.aplica_para IS
    'Array que indica a qué universos de evaluación pertenece este estándar: {7}, {21}, {60}, o combinaciones.';
COMMENT ON COLUMN public.sst_estandares_catalogo.peso IS
    'Peso porcentual del estándar dentro del total (suma = 100 por universo).';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sst_estandares_updated_at ON public.sst_estandares_catalogo;
CREATE TRIGGER trg_sst_estandares_updated_at
BEFORE UPDATE ON public.sst_estandares_catalogo
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.sst_estandares_catalogo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sst_estandares_select_auth ON public.sst_estandares_catalogo;
CREATE POLICY sst_estandares_select_auth
    ON public.sst_estandares_catalogo
    FOR SELECT
    TO authenticated
    USING (activo = true);

-- Solo el service_role (backend administrativo / seeds) puede insertar, actualizar o eliminar.
DROP POLICY IF EXISTS sst_estandares_write_service ON public.sst_estandares_catalogo;
CREATE POLICY sst_estandares_write_service
    ON public.sst_estandares_catalogo
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
