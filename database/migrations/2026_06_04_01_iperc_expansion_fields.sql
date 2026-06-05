-- ============================================================================
-- Migration: Expand sst_matriz_iperc with new IPERC fields
-- Applied: 2026-06-04
-- Adds: tareas, cargo, expuestos_directos, contratistas, requisitos_legales,
--        eliminacion, sustitucion, controles_ingenieria, controles_administrativos, epp
-- ============================================================================

ALTER TABLE public.sst_matriz_iperc
    ADD COLUMN IF NOT EXISTS tareas text,
    ADD COLUMN IF NOT EXISTS cargo varchar(255),
    ADD COLUMN IF NOT EXISTS expuestos_directos integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS contratistas integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS requisitos_legales boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS eliminacion text,
    ADD COLUMN IF NOT EXISTS sustitucion text,
    ADD COLUMN IF NOT EXISTS controles_ingenieria text,
    ADD COLUMN IF NOT EXISTS controles_administrativos text,
    ADD COLUMN IF NOT EXISTS epp text;

-- Add comments for documentation
COMMENT ON COLUMN public.sst_matriz_iperc.tareas IS 'Descripción de las tareas asociadas al proceso';
COMMENT ON COLUMN public.sst_matriz_iperc.cargo IS 'Cargo del trabajador expuesto';
COMMENT ON COLUMN public.sst_matriz_iperc.expuestos_directos IS 'Número de trabajadores expuestos directamente';
COMMENT ON COLUMN public.sst_matriz_iperc.contratistas IS 'Número de contratistas expuestos';
COMMENT ON COLUMN public.sst_matriz_iperc.requisitos_legales IS 'Existencia de requisitos legales específicos asociados';
COMMENT ON COLUMN public.sst_matriz_iperc.eliminacion IS 'Medida de intervención: Eliminación del peligro';
COMMENT ON COLUMN public.sst_matriz_iperc.sustitucion IS 'Medida de intervención: Sustitución por material menos peligroso';
COMMENT ON COLUMN public.sst_matriz_iperc.controles_ingenieria IS 'Medida de intervención: Controles de ingeniería';
COMMENT ON COLUMN public.sst_matriz_iperc.controles_administrativos IS 'Medida de intervención: Controles administrativos';
COMMENT ON COLUMN public.sst_matriz_iperc.epp IS 'Medida de intervención: Elementos de Protección Personal';
