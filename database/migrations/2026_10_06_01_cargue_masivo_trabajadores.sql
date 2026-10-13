-- ============================================================================
-- Alnilam 360 — Cargue masivo de trabajadores por sede (archivo plano)
-- Migration: 2026_10_06_01_cargue_masivo_trabajadores
-- ============================================================================
-- Objetivo:
--   1. Bitácora inmutable de cargues (`public.trabajadores_cargues`).
--   2. Helper `public.fn_try_parse_date(text)` (cast seguro ISO -> date).
--   3. RPC `public.cargar_trabajadores_masivo(...)` SECURITY INVOKER:
--        - Revalida en servidor cada fila (defensa en profundidad).
--        - Detecta duplicados dentro del archivo.
--        - Modo 'solo_nuevos'        : omite documentos ya existentes.
--        - Modo 'insertar_actualizar': actualiza existentes (y los traslada
--          a la sede destino); celdas vacías NO sobrescriben datos previos.
--        - p_simular = true: calcula el resultado sin escribir (preview).
--        - Opera bajo RLS del usuario invocante (no bypass).
-- Contrato TS: src/app/core/models/cargue-trabajadores.model.ts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trabajadores_cargues (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id       uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sede_id          uuid NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
    usuario_auth_id  uuid DEFAULT auth.uid(),
    archivo_nombre   text NOT NULL CHECK (char_length(archivo_nombre) BETWEEN 1 AND 255),
    modo             text NOT NULL CHECK (modo IN ('solo_nuevos', 'insertar_actualizar')),
    total_filas      integer NOT NULL DEFAULT 0 CHECK (total_filas >= 0),
    insertados       integer NOT NULL DEFAULT 0 CHECK (insertados >= 0),
    actualizados     integer NOT NULL DEFAULT 0 CHECK (actualizados >= 0),
    trasladados      integer NOT NULL DEFAULT 0 CHECK (trasladados >= 0),
    omitidos         integer NOT NULL DEFAULT 0 CHECK (omitidos >= 0),
    rechazados       integer NOT NULL DEFAULT 0 CHECK (rechazados >= 0),
    detalle          jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trabajadores_cargues_sede_fecha
    ON public.trabajadores_cargues (sede_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trabajadores_cargues_empresa
    ON public.trabajadores_cargues (empresa_id);

ALTER TABLE public.trabajadores_cargues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'trabajadores_cargues' AND policyname = 'trabajadores_cargues_select_secure'
    ) THEN
        CREATE POLICY trabajadores_cargues_select_secure ON public.trabajadores_cargues
            FOR SELECT TO authenticated
            USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'trabajadores_cargues' AND policyname = 'trabajadores_cargues_insert_secure'
    ) THEN
        CREATE POLICY trabajadores_cargues_insert_secure ON public.trabajadores_cargues
            FOR INSERT TO authenticated
            WITH CHECK (
                usuario_auth_id = (SELECT auth.uid())
                AND (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
            );
    END IF;
END $$;

GRANT SELECT, INSERT ON public.trabajadores_cargues TO authenticated;

COMMENT ON TABLE public.trabajadores_cargues IS
    'Bitácora inmutable de cargues masivos de trabajadores por sede (archivo plano CSV/TXT).';
COMMENT ON COLUMN public.trabajadores_cargues.detalle IS
    'Arreglo JSON [{fila, documento, estado: rechazado|omitido, motivo}] con las filas no aplicadas.';

CREATE OR REPLACE FUNCTION public.fn_try_parse_date(p_value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
    IF p_value IS NULL OR btrim(p_value) = '' THEN
        RETURN NULL;
    END IF;
    IF btrim(p_value) !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RETURN NULL;
    END IF;
    RETURN btrim(p_value)::date;
EXCEPTION WHEN others THEN
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_try_parse_date(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cargar_trabajadores_masivo(
    p_empresa_id      uuid,
    p_sede_id         uuid,
    p_filas           jsonb,
    p_modo            text    DEFAULT 'insertar_actualizar',
    p_archivo_nombre  text    DEFAULT 'archivo.csv',
    p_simular         boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    c_max_filas    CONSTANT integer := 5000;
    v_total        integer;
    v_insertados   integer := 0;
    v_actualizados integer := 0;
    v_trasladados  integer := 0;
    v_omitidos     integer := 0;
    v_rechazados   integer := 0;
    v_detalle      jsonb   := '[]'::jsonb;
    v_cargue_id    uuid;
BEGIN
    IF (SELECT auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'No autorizado: se requiere una sesión activa.' USING ERRCODE = '42501';
    END IF;

    IF p_modo IS NULL OR p_modo NOT IN ('solo_nuevos', 'insertar_actualizar') THEN
        RAISE EXCEPTION 'Modo de cargue inválido: %', coalesce(p_modo, 'NULL') USING ERRCODE = '22023';
    END IF;

    IF p_filas IS NULL OR jsonb_typeof(p_filas) <> 'array' THEN
        RAISE EXCEPTION 'El parámetro p_filas debe ser un arreglo JSON.' USING ERRCODE = '22023';
    END IF;

    v_total := jsonb_array_length(p_filas);
    IF v_total = 0 THEN
        RAISE EXCEPTION 'El archivo no contiene filas para procesar.' USING ERRCODE = '22023';
    END IF;
    IF v_total > c_max_filas THEN
        RAISE EXCEPTION 'El archivo excede el máximo permitido de % filas (recibidas: %).', c_max_filas, v_total
            USING ERRCODE = '22023';
    END IF;

    IF NOT (p_empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin())) THEN
        RAISE EXCEPTION 'Permiso denegado: no tiene acceso a la empresa indicada.' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.sedes s WHERE s.id = p_sede_id AND s.empresa_id = p_empresa_id) THEN
        RAISE EXCEPTION 'La sede indicada no existe o no pertenece a la empresa.' USING ERRCODE = '22023';
    END IF;

    WITH parsed AS (
        SELECT
            CASE WHEN jsonb_typeof(e.r -> 'fila') = 'number'
                 THEN (e.r ->> 'fila')::numeric::integer
                 ELSE e.ord::integer END AS fila,
            nullif(upper(regexp_replace(coalesce(e.r ->> 'documento', ''), '[\s.]', '', 'g')), '') AS documento,
            nullif(regexp_replace(btrim(coalesce(e.r ->> 'nombre', '')), '\s+', ' ', 'g'), '') AS nombre,
            nullif(btrim(coalesce(e.r ->> 'fecha_nacimiento', '')), '') AS fecha_nac_raw,
            nullif(btrim(coalesce(e.r ->> 'fecha_ingreso', '')), '') AS fecha_ing_raw,
            public.fn_try_parse_date(btrim(coalesce(e.r ->> 'fecha_nacimiento', ''))) AS fecha_nacimiento,
            public.fn_try_parse_date(btrim(coalesce(e.r ->> 'fecha_ingreso', ''))) AS fecha_ingreso,
            nullif(btrim(coalesce(e.r ->> 'cargo', '')), '') AS cargo,
            nullif(btrim(coalesce(e.r ->> 'area_trabajo', '')), '') AS area_trabajo,
            nullif(btrim(coalesce(e.r ->> 'eps', '')), '') AS eps,
            nullif(btrim(coalesce(e.r ->> 'arl', '')), '') AS arl,
            nullif(btrim(coalesce(e.r ->> 'fondo_pensiones', '')), '') AS fondo_pensiones,
            nullif(btrim(coalesce(e.r ->> 'telefono', '')), '') AS telefono,
            CASE WHEN jsonb_typeof(e.r -> 'activo') = 'boolean' THEN (e.r ->> 'activo')::boolean ELSE true END AS activo
        FROM jsonb_array_elements(p_filas) WITH ORDINALITY AS e(r, ord)
        WHERE jsonb_typeof(e.r) = 'object'
    ),
    dups_calc AS (
        SELECT p.*,
               first_value(p.fila) OVER (PARTITION BY p.documento ORDER BY p.fila) AS dup_primera_fila,
               row_number()       OVER (PARTITION BY p.documento ORDER BY p.fila) AS dup_rn
        FROM parsed p
    ),
    validated AS (
        SELECT
            d.*,
            CASE
                WHEN d.documento IS NULL THEN 'Documento obligatorio.'
                WHEN d.documento !~ '^[A-Z0-9-]{3,20}$' THEN 'Documento inválido: use 3 a 20 caracteres alfanuméricos.'
                WHEN d.dup_rn > 1 THEN format('Documento duplicado en el archivo (primera aparición en fila %s).', d.dup_primera_fila)
                WHEN d.nombre IS NULL THEN 'Nombre obligatorio.'
                WHEN char_length(d.nombre) NOT BETWEEN 3 AND 150 THEN 'Nombre debe tener entre 3 y 150 caracteres.'
                WHEN d.fecha_nac_raw IS NOT NULL AND d.fecha_nacimiento IS NULL THEN 'Fecha de nacimiento inválida (formato AAAA-MM-DD).'
                WHEN d.fecha_ing_raw IS NOT NULL AND d.fecha_ingreso IS NULL THEN 'Fecha de ingreso inválida (formato AAAA-MM-DD).'
                WHEN d.fecha_nacimiento IS NOT NULL AND (d.fecha_nacimiento < DATE '1900-01-01' OR d.fecha_nacimiento >= current_date) THEN 'Fecha de nacimiento fuera de rango.'
                WHEN d.fecha_ingreso IS NOT NULL AND d.fecha_ingreso > current_date THEN 'Fecha de ingreso no puede ser futura.'
                WHEN d.fecha_ingreso IS NOT NULL AND d.fecha_nacimiento IS NOT NULL AND d.fecha_ingreso <= d.fecha_nacimiento THEN 'Fecha de ingreso debe ser posterior a nacimiento.'
                WHEN greatest(
                        coalesce(char_length(d.cargo), 0), coalesce(char_length(d.area_trabajo), 0),
                        coalesce(char_length(d.eps), 0), coalesce(char_length(d.arl), 0),
                        coalesce(char_length(d.fondo_pensiones), 0)
                     ) > 150 THEN 'Algún campo de texto excede 150 caracteres.'
                WHEN d.telefono IS NOT NULL AND d.telefono !~ '^[0-9+()\s-]{7,20}$' THEN 'Teléfono inválido.'
                ELSE NULL
            END AS error_validacion
        FROM dups_calc d
    ),
    crossed AS (
        SELECT
            v.*,
            (t.id IS NOT NULL) AS ya_existe,
            t.sede_id AS sede_anterior_id
        FROM validated v
        LEFT JOIN public.trabajadores t
          ON t.empresa_id = p_empresa_id AND t.documento = v.documento
    )
    SELECT
        count(*) FILTER (WHERE error_validacion IS NOT NULL),
        count(*) FILTER (WHERE error_validacion IS NULL AND ya_existe AND p_modo = 'solo_nuevos'),
        count(*) FILTER (WHERE error_validacion IS NULL AND NOT ya_existe),
        count(*) FILTER (WHERE error_validacion IS NULL AND ya_existe AND p_modo = 'insertar_actualizar'),
        count(*) FILTER (WHERE error_validacion IS NULL AND ya_existe AND p_modo = 'insertar_actualizar' AND sede_anterior_id IS DISTINCT FROM p_sede_id),
        coalesce(jsonb_agg(
            jsonb_build_object(
                'fila', fila,
                'documento', documento,
                'estado', CASE WHEN error_validacion IS NOT NULL THEN 'rechazado' ELSE 'omitido' END,
                'motivo', coalesce(error_validacion, 'El documento ya existe en la empresa (modo solo nuevos).')
            ) ORDER BY fila
        ) FILTER (WHERE error_validacion IS NOT NULL OR (ya_existe AND p_modo = 'solo_nuevos')), '[]'::jsonb)
    INTO
        v_rechazados,
        v_omitidos,
        v_insertados,
        v_actualizados,
        v_trasladados,
        v_detalle
    FROM crossed;

    IF NOT p_simular THEN
        IF p_modo = 'insertar_actualizar' AND v_actualizados > 0 THEN
            WITH parsed_upd AS (
                SELECT
                    nullif(upper(regexp_replace(coalesce(e.r ->> 'documento', ''), '[\s.]', '', 'g')), '') AS documento,
                    nullif(regexp_replace(btrim(coalesce(e.r ->> 'nombre', '')), '\s+', ' ', 'g'), '') AS nombre,
                    public.fn_try_parse_date(btrim(coalesce(e.r ->> 'fecha_nacimiento', ''))) AS fecha_nacimiento,
                    public.fn_try_parse_date(btrim(coalesce(e.r ->> 'fecha_ingreso', ''))) AS fecha_ingreso,
                    nullif(btrim(coalesce(e.r ->> 'cargo', '')), '') AS cargo,
                    nullif(btrim(coalesce(e.r ->> 'area_trabajo', '')), '') AS area_trabajo,
                    nullif(btrim(coalesce(e.r ->> 'eps', '')), '') AS eps,
                    nullif(btrim(coalesce(e.r ->> 'arl', '')), '') AS arl,
                    nullif(btrim(coalesce(e.r ->> 'fondo_pensiones', '')), '') AS fondo_pensiones,
                    nullif(btrim(coalesce(e.r ->> 'telefono', '')), '') AS telefono,
                    CASE WHEN jsonb_typeof(e.r -> 'activo') = 'boolean' THEN (e.r ->> 'activo')::boolean END AS activo,
                    row_number() OVER (PARTITION BY upper(regexp_replace(coalesce(e.r ->> 'documento', ''), '[\s.]', '', 'g'))) AS rn
                FROM jsonb_array_elements(p_filas) AS e(r)
                WHERE jsonb_typeof(e.r) = 'object'
            )
            UPDATE public.trabajadores t
               SET sede_id          = p_sede_id,
                   nombre           = u.nombre,
                   fecha_nacimiento = coalesce(u.fecha_nacimiento, t.fecha_nacimiento),
                   fecha_ingreso    = coalesce(u.fecha_ingreso,    t.fecha_ingreso),
                   cargo            = coalesce(u.cargo,            t.cargo),
                   area_trabajo     = coalesce(u.area_trabajo,     t.area_trabajo),
                   eps              = coalesce(u.eps,              t.eps),
                   arl              = coalesce(u.arl,              t.arl),
                   fondo_pensiones  = coalesce(u.fondo_pensiones,  t.fondo_pensiones),
                   telefono         = coalesce(u.telefono,         t.telefono),
                   activo           = coalesce(u.activo,           t.activo)
              FROM parsed_upd u
             WHERE u.rn = 1
               AND t.empresa_id = p_empresa_id
               AND t.documento  = u.documento
               AND u.documento !~ '^$'
               AND NOT EXISTS (
                   SELECT 1 FROM jsonb_array_elements(v_detalle) d
                   WHERE (d ->> 'documento') = u.documento AND (d ->> 'estado') = 'rechazado'
               );
        END IF;

        IF v_insertados > 0 THEN
            WITH parsed_ins AS (
                SELECT
                    nullif(upper(regexp_replace(coalesce(e.r ->> 'documento', ''), '[\s.]', '', 'g')), '') AS documento,
                    nullif(regexp_replace(btrim(coalesce(e.r ->> 'nombre', '')), '\s+', ' ', 'g'), '') AS nombre,
                    public.fn_try_parse_date(btrim(coalesce(e.r ->> 'fecha_nacimiento', ''))) AS fecha_nacimiento,
                    public.fn_try_parse_date(btrim(coalesce(e.r ->> 'fecha_ingreso', ''))) AS fecha_ingreso,
                    nullif(btrim(coalesce(e.r ->> 'cargo', '')), '') AS cargo,
                    nullif(btrim(coalesce(e.r ->> 'area_trabajo', '')), '') AS area_trabajo,
                    nullif(btrim(coalesce(e.r ->> 'eps', '')), '') AS eps,
                    nullif(btrim(coalesce(e.r ->> 'arl', '')), '') AS arl,
                    nullif(btrim(coalesce(e.r ->> 'fondo_pensiones', '')), '') AS fondo_pensiones,
                    nullif(btrim(coalesce(e.r ->> 'telefono', '')), '') AS telefono,
                    CASE WHEN jsonb_typeof(e.r -> 'activo') = 'boolean' THEN (e.r ->> 'activo')::boolean END AS activo,
                    row_number() OVER (PARTITION BY upper(regexp_replace(coalesce(e.r ->> 'documento', ''), '[\s.]', '', 'g'))) AS rn
                FROM jsonb_array_elements(p_filas) AS e(r)
                WHERE jsonb_typeof(e.r) = 'object'
            )
            INSERT INTO public.trabajadores (
                empresa_id, sede_id, documento, nombre, fecha_nacimiento, fecha_ingreso,
                cargo, area_trabajo, eps, arl, fondo_pensiones, telefono, activo
            )
            SELECT
                p_empresa_id, p_sede_id, i.documento, i.nombre, i.fecha_nacimiento, i.fecha_ingreso,
                i.cargo, i.area_trabajo, i.eps, i.arl, i.fondo_pensiones, i.telefono, i.activo
            FROM parsed_ins i
            WHERE i.rn = 1
              AND i.documento IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM jsonb_array_elements(v_detalle) d
                  WHERE (d ->> 'documento') = i.documento
              )
            ON CONFLICT (empresa_id, documento) DO NOTHING;
        END IF;

        INSERT INTO public.trabajadores_cargues (
            empresa_id, sede_id, usuario_auth_id, archivo_nombre, modo, total_filas,
            insertados, actualizados, trasladados, omitidos, rechazados, detalle
        ) VALUES (
            p_empresa_id, p_sede_id, (SELECT auth.uid()),
            left(coalesce(nullif(btrim(p_archivo_nombre), ''), 'archivo.csv'), 255),
            p_modo, v_total, v_insertados, v_actualizados, v_trasladados, v_omitidos, v_rechazados, v_detalle
        )
        RETURNING id INTO v_cargue_id;
    END IF;

    RETURN jsonb_build_object(
        'cargue_id',    v_cargue_id,
        'simulado',     p_simular,
        'total',        v_total,
        'insertados',   v_insertados,
        'actualizados', v_actualizados,
        'trasladados',  v_trasladados,
        'omitidos',     v_omitidos,
        'rechazados',   v_rechazados,
        'detalle',      v_detalle
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cargar_trabajadores_masivo(uuid, uuid, jsonb, text, text, boolean) TO authenticated;
