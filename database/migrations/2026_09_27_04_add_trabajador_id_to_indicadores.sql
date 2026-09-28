-- ============================================================================
-- Alnilam 360 - Relación Foránea de Trabajador en Indicadores EL e Incapacidades
-- Permite vincular directamente el trabajador_id a los registros de:
--   1. public.indicadores_el_casos
--   2. public.indicadores_incapacidades
-- Eliminando redundancias manuales y garantizando integridad referencial por Sede.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'indicadores_el_casos' AND column_name = 'trabajador_id'
    ) THEN
        ALTER TABLE public.indicadores_el_casos 
        ADD COLUMN trabajador_id uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_el_casos_trabajador ON public.indicadores_el_casos(trabajador_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'indicadores_incapacidades' AND column_name = 'trabajador_id'
    ) THEN
        ALTER TABLE public.indicadores_incapacidades 
        ADD COLUMN trabajador_id uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_incap_trabajador ON public.indicadores_incapacidades(trabajador_id);
    END IF;
END $$;
