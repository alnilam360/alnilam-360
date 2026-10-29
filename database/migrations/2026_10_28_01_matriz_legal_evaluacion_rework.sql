-- ============================================================================
-- Migración: Matriz Legal — REHECHO a "Evaluación de Cumplimiento" ágil.
--
-- Contexto: el módulo anterior (requisitos individuales por norma) no cumple lo
-- requerido. Se rehace para capturar DIRECTAMENTE el conteo por estado
-- (CUMPLE / EN PROCESO / NO CUMPLE) de cada componente, por periodo (año),
-- sin depender de llenar requisitos en pestañas por componente.
-- Fuente: MATRIZ LEGAL 2026.xlsx, pestaña "EVALUACIÓN CUMPLIMIENTO".
--
-- Se CONSERVA el catálogo public.matriz_legal_componentes (+ su seed).
-- Se ELIMINAN public.matriz_legal_requisitos, public.catalogo_tipo_norma,
-- public.matriz_legal_config (modelo de requisitos individuales).
--
-- Multi-tenant por empresa_id. RLS con get_my_empresa_id() e is_admin()
-- (mismo patrón que 2026_10_23_01_matriz_legal.sql).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Limpieza del modelo obsoleto (idempotente). DROP TABLE elimina también
--    sus políticas, índices y triggers asociados.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.matriz_legal_requisitos CASCADE;
DROP TABLE IF EXISTS public.matriz_legal_config      CASCADE;
DROP TABLE IF EXISTS public.catalogo_tipo_norma      CASCADE;

-- ----------------------------------------------------------------------------
-- 1) Función utilitaria de auditoría (idempotente, search_path fijo).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2) Conteos de la matriz de evaluación: una fila por empresa × componente ×
--    periodo (año del corte). El % se calcula; aquí solo viven los conteos.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matriz_legal_evaluacion (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    componente_id UUID NOT NULL REFERENCES public.matriz_legal_componentes(id) ON DELETE CASCADE,
    periodo       INTEGER NOT NULL CHECK (periodo BETWEEN 2000 AND 2100),
    cumple        INTEGER NOT NULL DEFAULT 0 CHECK (cumple >= 0),
    en_proceso    INTEGER NOT NULL DEFAULT 0 CHECK (en_proceso >= 0),
    no_cumple     INTEGER NOT NULL DEFAULT 0 CHECK (no_cumple >= 0),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ml_eval_empresa_comp_periodo UNIQUE (empresa_id, componente_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_ml_eval_empresa_periodo
    ON public.matriz_legal_evaluacion(empresa_id, periodo);

DROP TRIGGER IF EXISTS trg_ml_eval_updated_at ON public.matriz_legal_evaluacion;
CREATE TRIGGER trg_ml_eval_updated_at
    BEFORE UPDATE ON public.matriz_legal_evaluacion
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3) Row Level Security (aislamiento total por empresa).
-- ============================================================================
ALTER TABLE public.matriz_legal_evaluacion ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_evaluacion' AND policyname='ml_eval_select') THEN
        CREATE POLICY ml_eval_select ON public.matriz_legal_evaluacion
            FOR SELECT TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_evaluacion' AND policyname='ml_eval_insert') THEN
        CREATE POLICY ml_eval_insert ON public.matriz_legal_evaluacion
            FOR INSERT TO authenticated
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_evaluacion' AND policyname='ml_eval_update') THEN
        CREATE POLICY ml_eval_update ON public.matriz_legal_evaluacion
            FOR UPDATE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='matriz_legal_evaluacion' AND policyname='ml_eval_delete') THEN
        CREATE POLICY ml_eval_delete ON public.matriz_legal_evaluacion
            FOR DELETE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
END $$;

-- ============================================================================
-- 4) RPC de resumen: devuelve tabla + porcentajes ya calculados (guarda /0),
--    para la empresa del usuario autenticado y el periodo indicado.
--    SECURITY INVOKER ⇒ RLS aplica. Un solo viaje para alimentar tabla y gráfica.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_matriz_legal_resumen(p_periodo INTEGER)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH emp AS (SELECT get_my_empresa_id() AS id),
    comp AS (
        SELECT c.id, c.dominio, c.nombre, c.orden
        FROM public.matriz_legal_componentes c, emp
        WHERE c.activo
          AND (c.empresa_id IS NULL OR c.empresa_id = emp.id)
    ),
    filas AS (
        SELECT
            c.id, c.dominio, c.nombre, c.orden,
            COALESCE(e.cumple, 0)     AS cumple,
            COALESCE(e.en_proceso, 0) AS en_proceso,
            COALESCE(e.no_cumple, 0)  AS no_cumple,
            COALESCE(e.cumple, 0) + COALESCE(e.en_proceso, 0) + COALESCE(e.no_cumple, 0) AS total
        FROM comp c
        LEFT JOIN public.matriz_legal_evaluacion e
               ON e.componente_id = c.id AND e.periodo = p_periodo
    ),
    dom AS (
        SELECT
            dominio,
            SUM(cumple)     AS s_cumple,
            SUM(en_proceso) AS s_en_proceso,
            SUM(no_cumple)  AS s_no_cumple,
            SUM(total)      AS s_total,
            jsonb_agg(
                jsonb_build_object(
                    'componenteId', id,
                    'nombre', nombre,
                    'orden', orden,
                    'cumple', cumple,
                    'enProceso', en_proceso,
                    'noCumple', no_cumple,
                    'total', total
                ) ORDER BY orden, nombre
            ) AS componentes
        FROM filas
        GROUP BY dominio
    ),
    dom_pct AS (
        SELECT
            dominio, componentes, s_total,
            CASE WHEN s_total > 0 THEN s_cumple::numeric     / s_total ELSE 0 END AS pct_cumple,
            CASE WHEN s_total > 0 THEN s_en_proceso::numeric / s_total ELSE 0 END AS pct_en_proceso,
            CASE WHEN s_total > 0 THEN s_no_cumple::numeric  / s_total ELSE 0 END AS pct_no_cumple
        FROM dom
    )
    SELECT jsonb_build_object(
        'periodo', p_periodo,
        'sgSst', COALESCE((
            SELECT jsonb_build_object(
                'dominio', 'SG_SST',
                'componentes', componentes,
                'totalDominio', s_total,
                'pctCumple', pct_cumple,
                'pctEnProceso', pct_en_proceso,
                'pctNoCumple', pct_no_cumple
            ) FROM dom_pct WHERE dominio = 'SG_SST'
        ), jsonb_build_object('dominio','SG_SST','componentes','[]'::jsonb,'totalDominio',0,'pctCumple',0,'pctEnProceso',0,'pctNoCumple',0)),
        'ambiental', COALESCE((
            SELECT jsonb_build_object(
                'dominio', 'AMBIENTAL',
                'componentes', componentes,
                'totalDominio', s_total,
                'pctCumple', pct_cumple,
                'pctEnProceso', pct_en_proceso,
                'pctNoCumple', pct_no_cumple
            ) FROM dom_pct WHERE dominio = 'AMBIENTAL'
        ), jsonb_build_object('dominio','AMBIENTAL','componentes','[]'::jsonb,'totalDominio',0,'pctCumple',0,'pctEnProceso',0,'pctNoCumple',0))
    );
$$;

REVOKE ALL ON FUNCTION public.get_matriz_legal_resumen(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_matriz_legal_resumen(INTEGER) TO authenticated;
