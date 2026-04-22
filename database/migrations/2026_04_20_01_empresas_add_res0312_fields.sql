-- ============================================================================
-- Alnilam 360 - Fase 1 Res. 0312
-- Migration: Añade columnas `numero_empleados` y `nivel_riesgo` a `public.empresas`
-- ============================================================================
-- Estas columnas se usan para que el sistema determine, de forma automática,
-- qué tipo de evaluación aplica (7, 21 o 60 estándares) según la Resolución
-- 0312 de 2019 (Colombia, Ministerio del Trabajo).
-- ============================================================================

ALTER TABLE public.empresas
    ADD COLUMN IF NOT EXISTS numero_empleados integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nivel_riesgo text;

-- Constraint CHECK para validar únicamente los 5 niveles de riesgo del
-- Decreto 1607 de 2002 (I, II, III, IV, V).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'empresas_nivel_riesgo_check'
    ) THEN
        ALTER TABLE public.empresas
            ADD CONSTRAINT empresas_nivel_riesgo_check
            CHECK (nivel_riesgo IS NULL OR nivel_riesgo IN ('I','II','III','IV','V'));
    END IF;
END $$;

COMMENT ON COLUMN public.empresas.numero_empleados IS
    'Número total de empleados consolidado (directos + aprendices + contratistas). Usado para clasificar el tipo de evaluación Res. 0312.';
COMMENT ON COLUMN public.empresas.nivel_riesgo IS
    'Nivel de riesgo según Decreto 1607/2002: I, II, III (bajo/medio) o IV, V (alto). Obligatorio para calcular tipo de evaluación SGSST.';
