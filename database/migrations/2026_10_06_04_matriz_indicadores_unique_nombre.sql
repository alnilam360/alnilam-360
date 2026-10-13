-- ============================================================================
-- Migración: Restricción de Unicidad para Indicadores por Empresa
-- Garantiza que no puedan existir dos indicadores con el mismo nombre por empresa
-- ============================================================================

-- 1. Eliminar duplicados previos si existieran, conservando el registro más reciente
DELETE FROM public.matriz_indicadores_registros a
USING public.matriz_indicadores_registros b
WHERE a.id < b.id
  AND a.empresa_id = b.empresa_id
  AND a.anio = b.anio
  AND a.mes = b.mes
  AND LOWER(TRIM(a.nombre)) = LOWER(TRIM(b.nombre));

-- 2. Índice único que previene duplicidad de nombres de indicadores por empresa y periodo
CREATE UNIQUE INDEX IF NOT EXISTS idx_matriz_ind_reg_unique_empresa_periodo_nombre
    ON public.matriz_indicadores_registros (empresa_id, anio, mes, LOWER(TRIM(nombre)));
