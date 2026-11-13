-- ============================================================================
-- Migración: Presupuesto — centros de costo.
--
-- Crea presupuesto_centro_costo (por empresa, RLS 4 policies), agrega
-- centro_costo_id (nullable, ON DELETE SET NULL) a presupuesto_movimiento y
-- presupuesto_cuenta_por_pagar, y la RPC get_presupuesto_centros(periodo).
-- Idempotente. Depende de 2026_11_13_01_presupuesto_nucleo.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.presupuesto_centro_costo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (empresa_id, nombre)
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_centro_empresa ON public.presupuesto_centro_costo(empresa_id);

ALTER TABLE public.presupuesto_movimiento
    ADD COLUMN IF NOT EXISTS centro_costo_id UUID REFERENCES public.presupuesto_centro_costo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_presupuesto_mov_centro ON public.presupuesto_movimiento(centro_costo_id);

ALTER TABLE public.presupuesto_cuenta_por_pagar
    ADD COLUMN IF NOT EXISTS centro_costo_id UUID REFERENCES public.presupuesto_centro_costo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_presupuesto_cxp_centro ON public.presupuesto_cuenta_por_pagar(centro_costo_id);

-- ----------------------------------------------------------------------------
-- RLS: 4 policies por operación (mismo patrón que la migración núcleo).
-- ----------------------------------------------------------------------------
ALTER TABLE public.presupuesto_centro_costo ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t CONSTANT TEXT := 'presupuesto_centro_costo';
    cond CONSTANT TEXT := 'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_select') THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', t || '_select', t, cond);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_insert') THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', t || '_insert', t, cond);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_update') THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t || '_update', t, cond, cond);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_delete') THEN
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', t || '_delete', t, cond);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- RPC: presupuestado/ejecutado por centro de costo del periodo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_presupuesto_centros(p_periodo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_per public.presupuesto_periodo%ROWTYPE;
    v_res jsonb;
BEGIN
    SELECT * INTO v_per FROM presupuesto_periodo WHERE id = p_periodo_id;
    -- Fail-closed: periodo inexistente o de otra empresa => NULL (sin revelar).
    IF NOT FOUND OR NOT (v_per.empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())) THEN
        RETURN NULL;
    END IF;

    WITH t AS (
        SELECT centro_costo_id, presupuestado, ejecutado
          FROM presupuesto_movimiento
         WHERE empresa_id = v_per.empresa_id AND periodo_id = p_periodo_id
        UNION ALL
        SELECT centro_costo_id, presupuestado, ejecutado
          FROM presupuesto_cuenta_por_pagar
         WHERE empresa_id = v_per.empresa_id AND periodo_id = p_periodo_id
    ), g AS (
        SELECT centro_costo_id, SUM(presupuestado) AS p, SUM(ejecutado) AS e
          FROM t GROUP BY centro_costo_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'centro_id', g.centro_costo_id,
               'nombre', COALESCE(cc.nombre, 'Sin centro'),
               'presupuestado', g.p,
               'ejecutado', g.e) ORDER BY COALESCE(cc.nombre, 'Sin centro')), '[]'::jsonb)
      INTO v_res
      FROM g
      LEFT JOIN presupuesto_centro_costo cc
        ON cc.id = g.centro_costo_id AND cc.empresa_id = v_per.empresa_id;

    RETURN v_res;
END;
$$;

COMMENT ON FUNCTION public.get_presupuesto_centros(uuid) IS
'Presupuestado/ejecutado por centro de costo del periodo. Fórmula: SUM(presupuestado) y SUM(ejecutado) de presupuesto_movimiento UNION ALL presupuesto_cuenta_por_pagar del periodo+empresa, agrupado por centro_costo_id; centro NULL => nombre "Sin centro" (centro_id null). v1 NO incluye nómina ni recaudo. Retorna NULL si el periodo no existe o es de otra empresa; [] si no hay filas. VECTOR DE PRUEBA: 2 gastos centro A (presup 100/ejec 80 y presup 0/ejec 0) + 1 cxp centro A (presup 30/ejec 30) + 1 gasto sin centro (presup 50/ejec 50) => [{A: presupuestado 130, ejecutado 110}, {Sin centro: presupuestado 50, ejecutado 50}].';

REVOKE EXECUTE ON FUNCTION public.get_presupuesto_centros(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_presupuesto_centros(uuid) TO authenticated;
