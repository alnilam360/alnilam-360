-- ============================================================================
-- Migracion: Matriz Legal — periodicidad por corte.
-- `periodo` SIGUE siendo el anio. Cada corte = (periodicidad, numero_periodo):
--   ANUAL 1..1, SEMESTRAL 1..2, TRIMESTRAL 1..4, MENSUAL 1..12.
-- Filas previas quedan ANUAL/1 por el DEFAULT (sin UPDATE masivo).
-- Impacto cliente: firma del RPC cambia -> actualizar matriz-legal.service.ts
-- y el onConflict del upsert a (empresa_id,componente_id,periodo,periodicidad,numero_periodo).
-- Calculo del resumen: sin cambios (pct = estado/total del dominio, guarda /0 -> 0).
-- Vectores: dominio 6 cumple/2 en_proceso/2 no_cumple => 0.6/0.2/0.2; total 0 => 0/0/0.
-- ============================================================================

ALTER TABLE public.matriz_legal_evaluacion
    ADD COLUMN IF NOT EXISTS periodicidad TEXT NOT NULL DEFAULT 'ANUAL';
ALTER TABLE public.matriz_legal_evaluacion
    ADD COLUMN IF NOT EXISTS numero_periodo SMALLINT NOT NULL DEFAULT 1;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_ml_eval_periodicidad'
                   AND conrelid = 'public.matriz_legal_evaluacion'::regclass) THEN
        ALTER TABLE public.matriz_legal_evaluacion
            ADD CONSTRAINT ck_ml_eval_periodicidad
            CHECK (periodicidad IN ('MENSUAL','TRIMESTRAL','SEMESTRAL','ANUAL'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_ml_eval_numero_rango'
                   AND conrelid = 'public.matriz_legal_evaluacion'::regclass) THEN
        ALTER TABLE public.matriz_legal_evaluacion
            ADD CONSTRAINT ck_ml_eval_numero_rango
            CHECK (numero_periodo BETWEEN 1 AND CASE periodicidad
                WHEN 'ANUAL' THEN 1 WHEN 'SEMESTRAL' THEN 2
                WHEN 'TRIMESTRAL' THEN 4 WHEN 'MENSUAL' THEN 12 END);
    END IF;
END $$;

ALTER TABLE public.matriz_legal_evaluacion
    DROP CONSTRAINT IF EXISTS uq_ml_eval_empresa_comp_periodo;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_ml_eval_empresa_comp_corte'
                   AND conrelid = 'public.matriz_legal_evaluacion'::regclass) THEN
        ALTER TABLE public.matriz_legal_evaluacion
            ADD CONSTRAINT uq_ml_eval_empresa_comp_corte
            UNIQUE (empresa_id, componente_id, periodo, periodicidad, numero_periodo);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- RPC: nueva firma (DROP de la anterior para evitar sobrecarga ambigua).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_matriz_legal_resumen(INTEGER);

CREATE OR REPLACE FUNCTION public.get_matriz_legal_resumen(
    p_periodo INTEGER,
    p_periodicidad TEXT DEFAULT 'ANUAL',
    p_numero SMALLINT DEFAULT 1
)
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
               ON e.componente_id = c.id
              AND e.periodo = p_periodo
              AND e.periodicidad = p_periodicidad
              AND e.numero_periodo = p_numero
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

REVOKE ALL ON FUNCTION public.get_matriz_legal_resumen(INTEGER, TEXT, SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_matriz_legal_resumen(INTEGER, TEXT, SMALLINT) TO authenticated;
