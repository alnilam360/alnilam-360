-- ============================================================================
-- Alnilam 360 - Relación Foránea de Trabajador en Matriz AT Casos
-- Permite vincular directamente el trabajador_id a:
--   1. public.matriz_at_casos
-- Eliminando redundancias manuales y garantizando integridad referencial por Sede.
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matriz_at_casos' AND column_name = 'trabajador_id'
    ) THEN
        ALTER TABLE public.matriz_at_casos 
        ADD COLUMN trabajador_id uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_matriz_at_trabajador ON public.matriz_at_casos(trabajador_id);
    END IF;
END $$;
