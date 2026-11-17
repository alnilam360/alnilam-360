-- Plan 17: Diagnostico general de salud (Res. 1843/2025 Art. 20). Aditivo e idempotente.
-- ANONIMIZADO: solo conteos agregados de la empresa del usuario. Sin trabajador_id, nombre, documento ni
-- desglose por sede (v1: solo totales de empresa, evita re-identificacion en sedes de 1 persona).
-- Empresa efectiva: get_my_empresa_id(). SECURITY INVOKER => RLS de salud_examen/salud_restriccion aplica.
--
-- salud_diagnostico_general(p_anio): referencia = hoy si p_anio es NULL o el anio actual; si no, 31-dic de p_anio.
-- Universo: trabajadores con activo = true. Se toma el ULTIMO examen (fecha DESC, created_at DESC) como en salud_cobertura.
--   aptitud:       apto | apto_con_restricciones | aplazado | remitido | sin_concepto (sin examen o aptitud NULL)
--   vigencia:      misma regla que salud_cobertura.estado_vigencia
--                  proximo = COALESCE(ultimo.fecha_proximo, ultimo.fecha + 24 meses)  -- shortcut: tope 24m fijo
--                  sin_examen (sin examenes) | vencido (proximo < ref) | por_vencer (proximo <= ref+30d) | vigente
--   restricciones: activas = clase 'restriccion' con estado IN (abierta, en_gestion);
--                  recomendaciones_activas = clase 'recomendacion' con estado <> 'cerrada'  (conteo de la empresa)
--   poblacion:     activos = nº trabajadores activos
-- Siempre emite todas las subcategorias (n = 0 si no hay), 12 filas.
-- VECTORES (documentacion; NO ejecutar tal cual en prod):
--  (a) 3 activos: A ultimo apto proximo 2027-01-01, B ultimo apto_con_restricciones proximo 2026-11-20, C sin examenes; ref 2026-11-17
--      => aptitud: apto 1, apto_con_restricciones 1, sin_concepto 1; vigencia: vigente 1, por_vencer 1, sin_examen 1; poblacion.activos 3
--  (b) trabajador inactivo con examenes => no cuenta en aptitud/vigencia/poblacion
--  (c) usuario de A nunca ve conteos de la empresa B (RLS + filtro empresa_id)

CREATE OR REPLACE FUNCTION public.salud_diagnostico_general(p_anio int DEFAULT NULL)
RETURNS TABLE (categoria text, subcategoria text, n int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    WITH ref AS (
        SELECT CASE WHEN p_anio IS NULL OR p_anio = extract(year FROM current_date)::int
                    THEN current_date ELSE make_date(p_anio, 12, 31) END AS hoy
    ),
    base AS (
        SELECT u.aptitud AS u_aptitud, u.fecha AS u_fecha,
               COALESCE(u.fecha_proximo, (u.fecha + interval '24 months')::date) AS proximo_ef,
               r.hoy
        FROM trabajadores t
        CROSS JOIN ref r
        LEFT JOIN LATERAL (
            SELECT e.fecha, e.aptitud, e.fecha_proximo
            FROM salud_examen e
            WHERE e.trabajador_id = t.id
            ORDER BY e.fecha DESC, e.created_at DESC
            LIMIT 1
        ) u ON true
        WHERE t.empresa_id = (SELECT get_my_empresa_id()) AND t.activo = true
    ),
    est AS (
        SELECT COALESCE(b.u_aptitud, 'sin_concepto') AS aptitud,
               CASE WHEN b.u_fecha IS NULL THEN 'sin_examen'
                    WHEN b.proximo_ef < b.hoy THEN 'vencido'
                    WHEN b.proximo_ef <= b.hoy + 30 THEN 'por_vencer'
                    ELSE 'vigente' END AS vigencia
        FROM base b
    )
    SELECT 'aptitud', s.k, (SELECT count(*)::int FROM est WHERE est.aptitud = s.k)
    FROM unnest(ARRAY['apto', 'apto_con_restricciones', 'aplazado', 'remitido', 'sin_concepto']) AS s(k)
    UNION ALL
    SELECT 'vigencia', s.k, (SELECT count(*)::int FROM est WHERE est.vigencia = s.k)
    FROM unnest(ARRAY['vigente', 'por_vencer', 'vencido', 'sin_examen']) AS s(k)
    UNION ALL
    SELECT 'restricciones', 'activas',
           (SELECT count(*)::int FROM salud_restriccion r
            WHERE r.empresa_id = (SELECT get_my_empresa_id())
              AND r.clase = 'restriccion' AND r.estado IN ('abierta', 'en_gestion'))
    UNION ALL
    SELECT 'restricciones', 'recomendaciones_activas',
           (SELECT count(*)::int FROM salud_restriccion r
            WHERE r.empresa_id = (SELECT get_my_empresa_id())
              AND r.clase = 'recomendacion' AND r.estado <> 'cerrada')
    UNION ALL
    SELECT 'poblacion', 'activos', (SELECT count(*)::int FROM base);
$$;

REVOKE ALL ON FUNCTION public.salud_diagnostico_general(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salud_diagnostico_general(int) TO authenticated;
