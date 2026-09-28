-- ============================================================================
-- Alnilam 360 - Catálogo Oficial CIE-10 (Clasificación Internacional de Enfermedades)
-- Extraído del maestro técnico RIPS / SISPRO / Hoja "Código del Diagnóstico"
-- Utilizado en:
--   1. Matriz de Incapacidades / Ausentismo (indicadores_incapacidades)
--   2. Caracterización de Casos de Enfermedad Laboral (indicadores_el_casos)
--   3. Matriz de Accidentes de Trabajo (matriz_at_casos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.catalogo_cie10 (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          text NOT NULL UNIQUE,
    descripcion     text NOT NULL,
    capitulo        text,
    es_frecuente    boolean DEFAULT false,
    activo          boolean NOT NULL DEFAULT true,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cie10_codigo ON public.catalogo_cie10 (codigo);
CREATE INDEX IF NOT EXISTS idx_cie10_es_frecuente ON public.catalogo_cie10 (es_frecuente) WHERE es_frecuente = true;

-- Búsqueda de texto en PostgreSQL
CREATE INDEX IF NOT EXISTS idx_cie10_trgm_desc ON public.catalogo_cie10 USING btree (codigo, descripcion);

-- RLS
ALTER TABLE public.catalogo_cie10 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'catalogo_cie10' AND policyname = 'Lectura pública catalogo_cie10'
    ) THEN
        CREATE POLICY "Lectura pública catalogo_cie10"
            ON public.catalogo_cie10 FOR SELECT
            USING (true);
    END IF;
END $$;
