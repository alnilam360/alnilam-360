-- Presupuesto: tendencia multimes. Delega el cálculo en get_presupuesto_resumen (dueño único).

CREATE OR REPLACE FUNCTION public.get_presupuesto_tendencia(p_empresa_id uuid, p_n_meses int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_res     jsonb := '[]'::jsonb;
    v_resumen jsonb;
    r         record;
BEGIN
    -- Fail-closed: solo la empresa propia o super admin.
    IF NOT (p_empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())) THEN
        RETURN NULL;
    END IF;

    -- Últimos N periodos, reordenados ascendente por mes (cronológico).
    FOR r IN
        SELECT t.id, t.mes
        FROM (SELECT id, mes FROM presupuesto_periodo
              WHERE empresa_id = p_empresa_id
              ORDER BY mes DESC LIMIT GREATEST(p_n_meses, 0)) t
        ORDER BY t.mes ASC
    LOOP
        -- Se llama al resumen para no duplicar la fórmula de saldo/recaudo/ejecutado.
        v_resumen := get_presupuesto_resumen(r.id);
        CONTINUE WHEN v_resumen IS NULL;

        v_res := v_res || jsonb_build_array(jsonb_build_object(
            'mes', r.mes,
            'saldo_inicial', (v_resumen #>> '{periodo,saldo_inicial}')::bigint,
            'recaudo', (v_resumen ->> 'recaudo')::bigint,
            'total_ejecutado', (v_resumen ->> 'total_ejecutado')::bigint,
            'saldo_final', (v_resumen ->> 'saldo_final')::bigint
        ));
    END LOOP;

    RETURN v_res;
END;
$$;

COMMENT ON FUNCTION public.get_presupuesto_tendencia(uuid, int) IS
'Tendencia de los últimos N meses de una empresa, en orden cronológico ascendente. Delega el cálculo en get_presupuesto_resumen (dueño único de la fórmula). Fail-closed por empresa (NULL si no pertenece y no es admin); [] si no hay periodos. Vector: 3 periodos con saldo_final de resumen 100,200,300 => array de 3 con esos saldo_final en orden de mes.';

REVOKE EXECUTE ON FUNCTION public.get_presupuesto_tendencia(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_presupuesto_tendencia(uuid, int) TO authenticated;
