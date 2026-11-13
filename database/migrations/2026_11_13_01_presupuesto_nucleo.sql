-- ============================================================================
-- Migración: Módulo Presupuesto (COP) — núcleo.
--
-- Multi-tenant por empresa_id. RLS con get_my_empresa_id() e is_admin()
-- (mismo patrón que 2026_10_23_01_matriz_legal.sql). Fórmulas corregidas:
-- el total ejecutado suma los 5 rubros (incluye 3000).
-- SIN números de cuenta bancaria en ninguna tabla.
-- Catálogos presupuesto_rubro / presupuesto_subrubro: globales, semilla en
-- database/seeds/2026_11_13_presupuesto_rubros_seed.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.presupuesto_periodo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    mes CHAR(7) NOT NULL CHECK (mes ~ '^[0-9]{4}-[0-9]{2}$'), -- '2026-01'
    saldo_inicial BIGINT NOT NULL DEFAULT 0,
    facturado BIGINT NOT NULL DEFAULT 0,
    cerrado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (empresa_id, mes)
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_periodo_empresa ON public.presupuesto_periodo(empresa_id);

CREATE TABLE IF NOT EXISTS public.presupuesto_rubro (
    codigo INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.presupuesto_subrubro (
    codigo INTEGER PRIMARY KEY,
    rubro_codigo INTEGER NOT NULL REFERENCES public.presupuesto_rubro(codigo),
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_subrubro_rubro ON public.presupuesto_subrubro(rubro_codigo);

CREATE TABLE IF NOT EXISTS public.presupuesto_movimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES public.presupuesto_periodo(id) ON DELETE CASCADE,
    subrubro_codigo INTEGER NOT NULL REFERENCES public.presupuesto_subrubro(codigo),
    fecha DATE,
    detalle TEXT NOT NULL,
    presupuestado BIGINT NOT NULL DEFAULT 0,
    ejecutado BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_mov_empresa_periodo ON public.presupuesto_movimiento(empresa_id, periodo_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_mov_subrubro ON public.presupuesto_movimiento(subrubro_codigo);

CREATE TABLE IF NOT EXISTS public.presupuesto_recaudo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES public.presupuesto_periodo(id) ON DELETE CASCADE,
    cliente_nombre TEXT NOT NULL,
    cliente_nit TEXT,
    valor BIGINT NOT NULL,
    fecha_corte DATE,
    fecha_entrega_cuenta_cobro DATE,
    fecha_limite_pago DATE,
    observaciones TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cobrado', 'pago')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_recaudo_empresa_periodo ON public.presupuesto_recaudo(empresa_id, periodo_id);

CREATE TABLE IF NOT EXISTS public.presupuesto_nomina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES public.presupuesto_periodo(id) ON DELETE CASCADE,
    cargo TEXT,
    nombre_trabajador TEXT NOT NULL,
    cedula TEXT,
    sueldo_basico BIGINT NOT NULL DEFAULT 0,
    dias_trabajados INTEGER NOT NULL DEFAULT 30,
    dev_basico BIGINT NOT NULL DEFAULT 0,
    dev_auxilio_transporte BIGINT NOT NULL DEFAULT 0,
    dev_auxilio_comunicacion BIGINT NOT NULL DEFAULT 0,
    dev_rodamiento BIGINT NOT NULL DEFAULT 0,
    dev_bono_adicional BIGINT NOT NULL DEFAULT 0,
    ded_salud BIGINT NOT NULL DEFAULT 0,
    ded_pension BIGINT NOT NULL DEFAULT 0,
    ded_otras BIGINT NOT NULL DEFAULT 0,
    pago_nomina BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_nomina_empresa_periodo ON public.presupuesto_nomina(empresa_id, periodo_id);

CREATE TABLE IF NOT EXISTS public.presupuesto_cuenta_por_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES public.presupuesto_periodo(id) ON DELETE CASCADE,
    fecha DATE,
    detalle TEXT NOT NULL,
    por_pagar BIGINT NOT NULL DEFAULT 0,
    presupuestado BIGINT NOT NULL DEFAULT 0,
    ejecutado BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_cxp_empresa_periodo ON public.presupuesto_cuenta_por_pagar(empresa_id, periodo_id);

CREATE TABLE IF NOT EXISTS public.presupuesto_socio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    porcentaje NUMERIC(5,4) NOT NULL DEFAULT 0, -- 0.2000 = 20%
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_socio_empresa ON public.presupuesto_socio(empresa_id);

CREATE TABLE IF NOT EXISTS public.presupuesto_liquidez_socio_mes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    socio_id UUID NOT NULL REFERENCES public.presupuesto_socio(id) ON DELETE CASCADE,
    mes CHAR(7) NOT NULL CHECK (mes ~ '^[0-9]{4}-[0-9]{2}$'),
    dias_mes INTEGER NOT NULL CHECK (dias_mes > 0),
    ingreso BIGINT NOT NULL DEFAULT 0,
    egreso BIGINT NOT NULL DEFAULT 0,
    dias_apoyados INTEGER NOT NULL DEFAULT 0,
    ajuste_manual BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_liquidez_empresa_socio ON public.presupuesto_liquidez_socio_mes(empresa_id, socio_id);

CREATE TABLE IF NOT EXISTS public.presupuesto_reparto_socio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    periodo_id UUID NOT NULL REFERENCES public.presupuesto_periodo(id) ON DELETE CASCADE,
    socio_id UUID NOT NULL REFERENCES public.presupuesto_socio(id) ON DELETE CASCADE,
    ejecutado BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (empresa_id, periodo_id, socio_id)
);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.presupuesto_periodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_rubro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_subrubro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_recaudo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_nomina ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_cuenta_por_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_socio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_liquidez_socio_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_reparto_socio ENABLE ROW LEVEL SECURITY;

-- Catálogos globales: lectura a autenticados, escritura solo admin.
DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['presupuesto_rubro', 'presupuesto_subrubro'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_select') THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (TRUE)', t || '_select', t);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_admin_write') THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()))', t || '_admin_write', t);
        END IF;
    END LOOP;
END $$;

-- Tablas por empresa: 4 policies por operación.
DO $$
DECLARE
    t TEXT;
    cond CONSTANT TEXT := 'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())';
BEGIN
    FOREACH t IN ARRAY ARRAY['presupuesto_periodo', 'presupuesto_movimiento', 'presupuesto_recaudo',
        'presupuesto_nomina', 'presupuesto_cuenta_por_pagar', 'presupuesto_socio',
        'presupuesto_liquidez_socio_mes', 'presupuesto_reparto_socio'] LOOP
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
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- RPC: resumen del periodo (único dueño de las fórmulas; el cliente consume).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_presupuesto_resumen(p_periodo_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_per public.presupuesto_periodo%ROWTYPE;
    v_nom_p bigint; v_nom_e bigint;
    v_cxp_p bigint; v_cxp_e bigint;
    v_recaudo bigint; v_recaudo_real bigint;
    v_rubros jsonb; v_tot_p bigint; v_tot_e bigint;
BEGIN
    SELECT * INTO v_per FROM presupuesto_periodo WHERE id = p_periodo_id;
    -- Fail-closed: periodo inexistente o de otra empresa => NULL (sin revelar).
    IF NOT FOUND OR NOT (v_per.empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())) THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM((dev_basico + dev_auxilio_transporte + dev_auxilio_comunicacion + dev_rodamiento + dev_bono_adicional)
                        - (ded_salud + ded_pension + ded_otras)), 0),
           COALESCE(SUM(pago_nomina), 0)
      INTO v_nom_p, v_nom_e
      FROM presupuesto_nomina WHERE empresa_id = v_per.empresa_id AND periodo_id = p_periodo_id;

    SELECT COALESCE(SUM(presupuestado), 0), COALESCE(SUM(ejecutado), 0)
      INTO v_cxp_p, v_cxp_e
      FROM presupuesto_cuenta_por_pagar WHERE empresa_id = v_per.empresa_id AND periodo_id = p_periodo_id;

    SELECT COALESCE(SUM(valor), 0), COALESCE(SUM(valor) FILTER (WHERE estado = 'pago'), 0)
      INTO v_recaudo, v_recaudo_real
      FROM presupuesto_recaudo WHERE empresa_id = v_per.empresa_id AND periodo_id = p_periodo_id;

    WITH mov AS (
        SELECT subrubro_codigo, SUM(presupuestado) AS p, SUM(ejecutado) AS e
          FROM presupuesto_movimiento
         WHERE empresa_id = v_per.empresa_id AND periodo_id = p_periodo_id
         GROUP BY subrubro_codigo
    ), sub AS (
        SELECT s.rubro_codigo, s.codigo, s.nombre, s.orden,
               CASE s.codigo WHEN 1001 THEN v_nom_p WHEN 5001 THEN v_cxp_p WHEN 5002 THEN 0
                             ELSE COALESCE(m.p, 0) END::bigint AS p,
               CASE s.codigo WHEN 1001 THEN v_nom_e WHEN 5001 THEN v_cxp_e WHEN 5002 THEN 0
                             ELSE COALESCE(m.e, 0) END::bigint AS e
          FROM presupuesto_subrubro s LEFT JOIN mov m ON m.subrubro_codigo = s.codigo
         WHERE s.activo
    ), rub AS (
        SELECT r.codigo, r.nombre, r.orden,
               COALESCE(SUM(sub.p), 0)::bigint AS p, COALESCE(SUM(sub.e), 0)::bigint AS e,
               COALESCE(jsonb_agg(jsonb_build_object('codigo', sub.codigo, 'nombre', sub.nombre,
                   'presupuestado', sub.p, 'por_pagar', sub.p - sub.e, 'ejecutado', sub.e)
                   ORDER BY sub.orden) FILTER (WHERE sub.codigo IS NOT NULL), '[]'::jsonb) AS subs
          FROM presupuesto_rubro r LEFT JOIN sub ON sub.rubro_codigo = r.codigo
         WHERE r.activo
         GROUP BY r.codigo, r.nombre, r.orden
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object('codigo', codigo, 'nombre', nombre,
               'presupuestado', p, 'por_pagar', p - e, 'ejecutado', e, 'subrubros', subs) ORDER BY orden), '[]'::jsonb),
           COALESCE(SUM(p), 0), COALESCE(SUM(e), 0)
      INTO v_rubros, v_tot_p, v_tot_e
      FROM rub;

    RETURN jsonb_build_object(
        'periodo', jsonb_build_object('id', v_per.id, 'mes', v_per.mes, 'saldo_inicial', v_per.saldo_inicial,
                                      'facturado', v_per.facturado, 'cerrado', v_per.cerrado),
        'recaudo', v_recaudo,
        'recaudo_real', v_recaudo_real,
        'meta_porcentual', CASE WHEN v_per.facturado > 0 THEN v_recaudo::numeric / v_per.facturado ELSE NULL END,
        'total_presupuestado', v_tot_p,
        'total_ejecutado', v_tot_e,
        'saldo_final', v_per.saldo_inicial + v_recaudo - v_tot_e,
        'rubros', v_rubros
    );
END;
$$;

COMMENT ON FUNCTION public.get_presupuesto_resumen(uuid) IS
'Resumen del periodo de presupuesto. Fórmulas: nomina presupuestado = SUM(devengados - deducciones), ejecutado = SUM(pago_nomina) (subrubro 1001); rubros 2000/3000/4000 desde presupuesto_movimiento por subrubro; 5001 desde cuenta_por_pagar; 5002 Liquidez = 0/0 (atajo: enlazar con liquidez en fase posterior). por_pagar = presupuestado - ejecutado. total_presupuestado y total_ejecutado suman los 5 rubros (incluye 3000). saldo_final = saldo_inicial + recaudo - total_ejecutado. meta_porcentual = recaudo/facturado (NULL si facturado = 0). Retorna NULL si el periodo no existe o es de otra empresa. VECTOR DE PRUEBA: nomina neto 2.500.000/pago 0, movimiento 2002 presup 300.000/ejec 300.000, cxp presup 3.205.000/ejec 2.600.000, recaudo 8.200.000, saldo_inicial 2.600.000, facturado 4.800.000 => total_presupuestado 6.005.000, total_ejecutado 2.900.000, saldo_final 7.900.000, meta 1.7083.';

-- Solo usuarios autenticados: revocar el EXECUTE por defecto a PUBLIC/anon (evita
-- que anon invoque el RPC via /rest/v1/rpc; aunque es fail-closed, se cierra el acceso).
REVOKE EXECUTE ON FUNCTION public.get_presupuesto_resumen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_presupuesto_resumen(uuid) TO authenticated;
