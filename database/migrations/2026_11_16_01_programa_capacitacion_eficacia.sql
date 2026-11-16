-- Plan 14 F1: Programa de Capacitacion con lazo de eficacia peligro->capacitacion->resultado. Aditivo e idempotente.
-- Empresa efectiva: get_my_empresa_id() / is_admin() (mismo mecanismo que plan 12 auditorias).
--
-- RIESGO ALTO (cap_necesidades_desde_iperc): nivel_intervencion IN ('I','II') (GTC 45: I = No aceptable,
--   II = No aceptable o aceptable con control especifico). Es el mismo campo que clasifica el dashboard IPERC.
-- EFICACIA (cap_eficacia_tema): hallazgos = sst_hallazgo (fecha = created_at::date).
--   Liga a area: sst_hallazgo -> sst_verificacion.sede_id. NO existe area_trabajo en sst_verificacion, solo sede.
--   Si cap_sesion.sede_id IS NULL => conteo de toda la empresa (senal gruesa).
--   LIMITACION: granularidad sede, no area; cap_sesion.area_trabajo es informativo y no filtra. Es correlacion, no causa.
-- mejora_pct = round((antes - despues) / antes * 100, 1); NULL si antes = 0.

CREATE TABLE IF NOT EXISTS public.cap_tema (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        uuid NOT NULL REFERENCES public.empresas(id),
    nombre            text NOT NULL,
    descripcion       text,
    grupo_objetivo_id uuid REFERENCES public.catalogo_grupo_objetivo(id),
    iperc_id          uuid REFERENCES public.sst_matriz_iperc(id),
    fuente            text NOT NULL DEFAULT 'manual' CHECK (fuente IN ('iperc', 'hallazgo', 'manual')),
    obligatorio       boolean DEFAULT false,
    horas_min         numeric,
    activo            boolean DEFAULT true,
    created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cap_sesion (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id    uuid NOT NULL REFERENCES public.empresas(id),
    tema_id       uuid NOT NULL REFERENCES public.cap_tema(id) ON DELETE CASCADE,
    fecha         date NOT NULL,
    facilitador   text,
    modalidad     text,
    horas         numeric,
    area_trabajo  text,
    sede_id       uuid REFERENCES public.sedes(id),
    evidencia_url text,
    estado        text NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada', 'dictada', 'cancelada')),
    created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cap_asistencia (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      uuid NOT NULL REFERENCES public.empresas(id),
    sesion_id       uuid NOT NULL REFERENCES public.cap_sesion(id) ON DELETE CASCADE,
    trabajador_id   uuid NOT NULL REFERENCES public.trabajadores(id),
    asistio         boolean DEFAULT false,
    nota_evaluacion numeric,
    aprobado        boolean DEFAULT false,
    created_at      timestamptz DEFAULT now(),
    UNIQUE (sesion_id, trabajador_id)
);

CREATE INDEX IF NOT EXISTS idx_cap_tema_empresa ON public.cap_tema (empresa_id);
CREATE INDEX IF NOT EXISTS idx_cap_tema_iperc ON public.cap_tema (iperc_id);
CREATE INDEX IF NOT EXISTS idx_cap_tema_grupo ON public.cap_tema (grupo_objetivo_id);
CREATE INDEX IF NOT EXISTS idx_cap_sesion_empresa ON public.cap_sesion (empresa_id);
CREATE INDEX IF NOT EXISTS idx_cap_sesion_tema ON public.cap_sesion (tema_id);
CREATE INDEX IF NOT EXISTS idx_cap_sesion_fecha ON public.cap_sesion (fecha);
CREATE INDEX IF NOT EXISTS idx_cap_sesion_sede ON public.cap_sesion (sede_id);
CREATE INDEX IF NOT EXISTS idx_cap_asistencia_empresa ON public.cap_asistencia (empresa_id);
CREATE INDEX IF NOT EXISTS idx_cap_asistencia_sesion ON public.cap_asistencia (sesion_id);
CREATE INDEX IF NOT EXISTS idx_cap_asistencia_trabajador ON public.cap_asistencia (trabajador_id);

-- RLS fail-closed, una policy por comando (DROP + CREATE => idempotente).
DO $$
DECLARE
    t text;
    cmd text;
    cond text := 'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())';
BEGIN
    FOREACH t IN ARRAY ARRAY['cap_tema', 'cap_sesion', 'cap_asistencia'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        FOREACH cmd IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_' || cmd, t);
        END LOOP;
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', t || '_select', t, cond);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', t || '_insert', t, cond);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t || '_update', t, cond, cond);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)', t || '_delete', t, cond);
    END LOOP;
END $$;

REVOKE ALL ON public.cap_tema, public.cap_sesion, public.cap_asistencia FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tema, public.cap_sesion, public.cap_asistencia TO authenticated;

-- Peligros IPERC de riesgo alto (nivel_intervencion I/II) sin tema activo. p_anio filtra por created_at del peligro.
CREATE OR REPLACE FUNCTION public.cap_necesidades_desde_iperc(p_anio int DEFAULT NULL)
RETURNS TABLE (
    iperc_id uuid,
    proceso text,
    zona_lugar text,
    cargo text,
    peligro_descripcion text,
    nivel_riesgo numeric,
    interpretacion_np text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT i.id, i.proceso, i.zona_lugar, i.cargo, i.peligro_descripcion, i.nivel_riesgo::numeric, i.interpretacion_np
    FROM sst_matriz_iperc i
    WHERE i.empresa_id = (SELECT get_my_empresa_id())
      AND i.nivel_intervencion IN ('I', 'II')
      AND (p_anio IS NULL OR extract(year FROM i.created_at) = p_anio)
      AND NOT EXISTS (
          SELECT 1 FROM cap_tema t
          WHERE t.iperc_id = i.id AND t.activo IS TRUE AND t.empresa_id = i.empresa_id)
    ORDER BY i.nivel_riesgo DESC NULLS LAST, i.proceso;
$$;

-- Por sesion dictada: hallazgos antes [fecha-v, fecha) vs despues (fecha, fecha+v]. Ver limitacion de sede arriba.
CREATE OR REPLACE FUNCTION public.cap_eficacia_tema(p_tema_id uuid, p_ventana_dias int DEFAULT 90)
RETURNS TABLE (
    sesion_id uuid,
    fecha date,
    antes int,
    despues int,
    delta int,
    mejora_pct numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT sesion_id, fecha, antes, despues, (despues - antes) AS delta,
           CASE WHEN antes = 0 THEN NULL
                ELSE round((antes - despues)::numeric / antes * 100, 1) END AS mejora_pct
    FROM (
        SELECT s.id AS sesion_id, s.fecha,
               (SELECT count(*)::int FROM sst_hallazgo h JOIN sst_verificacion v ON v.id = h.verificacion_id
                 WHERE h.empresa_id = s.empresa_id
                   AND (s.sede_id IS NULL OR v.sede_id = s.sede_id)
                   AND h.created_at::date >= s.fecha - p_ventana_dias AND h.created_at::date < s.fecha) AS antes,
               (SELECT count(*)::int FROM sst_hallazgo h JOIN sst_verificacion v ON v.id = h.verificacion_id
                 WHERE h.empresa_id = s.empresa_id
                   AND (s.sede_id IS NULL OR v.sede_id = s.sede_id)
                   AND h.created_at::date > s.fecha AND h.created_at::date <= s.fecha + p_ventana_dias) AS despues
        FROM cap_sesion s
        WHERE s.tema_id = p_tema_id
          AND s.estado = 'dictada'
          AND s.empresa_id = (SELECT get_my_empresa_id())
    ) x
    ORDER BY fecha;
$$;

REVOKE ALL ON FUNCTION public.cap_necesidades_desde_iperc(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cap_eficacia_tema(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cap_necesidades_desde_iperc(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cap_eficacia_tema(uuid, int) TO authenticated;

-- VECTORES (documentacion; NO ejecutar tal cual en prod):
--  (a) mejora_pct: antes=10, despues=4 => 60.0 ; antes=0 => NULL ; antes=4, despues=6 => -50.0 (delta=2)
--  (b) usuario de A: SELECT * FROM cap_tema WHERE empresa_id = <B>;  -- 0 filas; INSERT con empresa_id=B => error RLS
--  (c) usuario de A: SELECT * FROM cap_eficacia_tema(<tema de B>);   -- 0 filas
--  (d) cap_necesidades_desde_iperc(): crear cap_tema activo con iperc_id=X => X desaparece; activo=false => reaparece.
--  (e) frontera de ventana: hallazgo en fecha-90 cuenta antes; en fecha no cuenta; en fecha+90 cuenta despues.
