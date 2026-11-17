-- Plan 16: Seguimiento de examenes medicos ocupacionales (EMO, Res. 1843/2025). Aditivo e idempotente.
-- Empresa efectiva: get_my_empresa_id() / is_admin(). NO guarda historia clinica (concepto_path = concepto medico).
-- aptitud NO incluye 'no_apto' (Art. 19 Par.).
-- unaccent NO verificado => se normaliza con salud_norm() = lower + translate de vocales acentuadas.
--
-- salud_cobertura(p_anio): fecha de referencia = hoy si p_anio es NULL o el anio actual; si no, 31-dic de p_anio.
--   shortcut: tope periodico 24 meses fijo (sin config por empresa), upgrade cuando exista parametrizacion.
--   estado_vigencia: sin_examen (sin ningun examen) | vencido (proximo < ref; si proximo NULL, fecha+24m < ref)
--                    | por_vencer (proximo <= ref+30d) | vigente.
--   pendientes: pre_ingreso (activo, fecha_ingreso no nula, sin examen pre_ingreso);
--               periodica_programada (activo y vencido, o sin examen con antiguedad > 24m);
--               egreso (activo=false sin examen egreso).
-- VECTORES (documentacion; NO ejecutar tal cual en prod):
--  (a) trabajador activo, ingreso 2026-11-10, sin examenes => estado sin_examen, pendientes {pre_ingreso}
--  (b) activo, ultimo periodico 2023-01-01 sin fecha_proximo, ref 2026-11-17 => vencido, {periodica_programada}
--  (c) activo=false con examen egreso => pendientes vacio
--  (d) salud_perfil_cargo('Operario de Produccion') == salud_perfil_cargo('operario de produccion')
--  (e) usuario de A: SELECT * FROM salud_examen WHERE empresa_id = <B>; -- 0 filas; INSERT con empresa_id=B => error RLS

CREATE TABLE IF NOT EXISTS public.salud_examen (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id           uuid NOT NULL REFERENCES public.empresas(id),
    trabajador_id        uuid NOT NULL REFERENCES public.trabajadores(id),
    tipo                 text NOT NULL CHECK (tipo IN ('pre_ingreso', 'periodica_programada', 'cambio_ocupacion', 'egreso', 'post_incapacidad', 'retorno', 'seguimiento')),
    fecha                date NOT NULL,
    fecha_proximo        date,
    aptitud              text CHECK (aptitud IN ('apto', 'apto_con_restricciones', 'aplazado', 'remitido')),
    requiere_seguimiento boolean NOT NULL DEFAULT false,
    ips_nombre           text,
    medico_licencia      text,
    concepto_path        text,
    observaciones        text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salud_restriccion (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          uuid NOT NULL REFERENCES public.empresas(id),
    examen_id           uuid NOT NULL REFERENCES public.salud_examen(id) ON DELETE CASCADE,
    clase               text NOT NULL CHECK (clase IN ('restriccion', 'recomendacion')),
    descripcion         text NOT NULL,
    temporalidad        text CHECK (temporalidad IN ('temporal', 'permanente')),
    fecha_fin           date,
    estado              text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_gestion', 'cerrada')),
    responsable         text,
    fecha_limite_accion date,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salud_peligro_examen (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patron          text NOT NULL,
    examen_sugerido text NOT NULL,
    UNIQUE (patron, examen_sugerido)
);

-- Triggers updated_at (helper public.trigger_set_updated_at(), convencion del repo: trabajadores, comites, objetivos).
DROP TRIGGER IF EXISTS trg_salud_examen_updated_at ON public.salud_examen;
CREATE TRIGGER trg_salud_examen_updated_at
BEFORE UPDATE ON public.salud_examen
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_salud_restriccion_updated_at ON public.salud_restriccion;
CREATE TRIGGER trg_salud_restriccion_updated_at
BEFORE UPDATE ON public.salud_restriccion
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_salud_examen_empresa ON public.salud_examen (empresa_id);
CREATE INDEX IF NOT EXISTS idx_salud_examen_trabajador ON public.salud_examen (trabajador_id);
CREATE INDEX IF NOT EXISTS idx_salud_examen_empresa_proximo ON public.salud_examen (empresa_id, fecha_proximo);
CREATE INDEX IF NOT EXISTS idx_salud_restriccion_empresa ON public.salud_restriccion (empresa_id);
CREATE INDEX IF NOT EXISTS idx_salud_restriccion_examen ON public.salud_restriccion (examen_id);
CREATE INDEX IF NOT EXISTS idx_salud_restriccion_empresa_estado ON public.salud_restriccion (empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_salud_peligro_examen_patron ON public.salud_peligro_examen (patron);

-- Seed catalogo (una fila por patron+examen; patrones sin tildes).
INSERT INTO public.salud_peligro_examen (patron, examen_sugerido) VALUES
 ('Ruido', 'Audiometria'),
 ('Vibracion segmento mano-brazo', 'Evaluacion osteomuscular miembro superior'),
 ('Vibracion de cuerpo entero', 'Evaluacion osteomuscular con enfasis en columna'),
 ('Radiacion ionizante', 'Cuadro hematico (hemograma)'),
 ('Radiacion ultravioleta', 'Valoracion dermatologica'),
 ('Radiacion ultravioleta', 'Valoracion oftalmologica'),
 ('Radiacion no ionizante', 'Valoracion oftalmologica'),
 ('Iluminacion', 'Optometria / visiometria'),
 ('Temperaturas extremas', 'Valoracion cardiovascular'),
 ('Presiones anormales', 'Audiometria'),
 ('Presiones anormales', 'Espirometria'),
 ('Presiones anormales', 'Valoracion ORL'),
 ('Trabajo en alturas', 'Examen medico con enfasis en trabajo en alturas (osteomuscular, visiometria, glicemia, perfil lipidico, cardiovascular, psicologico)'),
 ('Espacios confinados', 'Espirometria'),
 ('Espacios confinados', 'Visiometria'),
 ('Espacios confinados', 'Audiometria'),
 ('Espacios confinados', 'Valoracion cardiovascular'),
 ('Espacios confinados', 'Valoracion psicologica'),
 ('Trabajo en caliente', 'Espirometria'),
 ('Trabajo en caliente', 'Visiometria'),
 ('Trabajo en caliente', 'Audiometria'),
 ('alta tension', 'Examen para trabajo con energia electrica (cardiovascular, visiometria)'),
 ('Accidentes de transito', 'Examen psicosensometrico de conduccion (optometria, audiometria)'),
 ('Polvo inorganico', 'Espirometria'),
 ('Polvo inorganico', 'RX de torax'),
 ('Polvo organico', 'Espirometria'),
 ('Humos metalicos', 'Espirometria'),
 ('Humos metalicos', 'Cuadro hematico (hemograma)'),
 ('Humos de combustion', 'Espirometria'),
 ('Fibras', 'Espirometria'),
 ('Fibras', 'Valoracion dermatologica'),
 ('Hidrocarburos', 'Cuadro hematico (hemograma)'),
 ('Hidrocarburos', 'Perfil hepatico'),
 ('No hidrocarburos', 'Espirometria'),
 ('Nieblas y rocios', 'Valoracion dermatologica'),
 ('Nieblas y rocios', 'Espirometria'),
 ('Bacterias', 'Valoracion de riesgo biologico (vacunacion, serologia)'),
 ('Virus', 'Valoracion de riesgo biologico (vacunacion, serologia)'),
 ('Hongos', 'Valoracion de riesgo biologico (vacunacion, serologia)'),
 ('fluidos', 'Valoracion de riesgo biologico (vacunacion, serologia)'),
 ('Parasitos', 'Valoracion de riesgo biologico (vacunacion, serologia)'),
 ('Picaduras', 'Valoracion de riesgo biologico (vacunacion, serologia)'),
 ('Mordeduras', 'Valoracion de riesgo biologico (vacunacion, serologia)'),
 ('Manipulacion manual de cargas', 'Evaluacion osteomuscular con enfasis en columna'),
 ('Esfuerzo fisico', 'Evaluacion osteomuscular'),
 ('Movimiento repetitivo', 'Evaluacion osteomuscular miembro superior'),
 ('Postura', 'Evaluacion osteomuscular'),
 ('Carga mental', 'Evaluacion de riesgo psicosocial'),
 ('Jornada de trabajo', 'Evaluacion de riesgo psicosocial'),
 ('Gestion organizacional', 'Evaluacion de riesgo psicosocial')
ON CONFLICT (patron, examen_sugerido) DO NOTHING;

-- RLS fail-closed, una policy por comando (DROP + CREATE => idempotente).
DO $$
DECLARE
    t text;
    cmd text;
    cond text := 'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())';
BEGIN
    FOREACH t IN ARRAY ARRAY['salud_examen', 'salud_restriccion'] LOOP
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

-- Catalogo global: lectura para authenticated (sin datos de empresa), sin escritura cliente.
ALTER TABLE public.salud_peligro_examen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS salud_peligro_examen_select ON public.salud_peligro_examen;
CREATE POLICY salud_peligro_examen_select ON public.salud_peligro_examen
    FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.salud_examen, public.salud_restriccion, public.salud_peligro_examen FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salud_examen, public.salud_restriccion TO authenticated;
GRANT SELECT ON public.salud_peligro_examen TO authenticated;

-- Normalizacion sin tildes y en minusculas (fallback a unaccent).
CREATE OR REPLACE FUNCTION public.salud_norm(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
    SELECT translate(lower(p), 'áéíóúüñ', 'aeiouun');
$$;

CREATE OR REPLACE FUNCTION public.salud_cobertura(p_anio int DEFAULT NULL)
RETURNS TABLE (
    trabajador_id uuid,
    nombre text,
    cargo text,
    sede_id uuid,
    ultimo_examen date,
    tipo_ultimo text,
    aptitud text,
    proximo date,
    estado_vigencia text,
    pendientes text[]
)
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
        SELECT t.id, t.nombre, t.cargo, t.sede_id, t.activo, t.fecha_ingreso,
               u.fecha AS u_fecha, u.tipo AS u_tipo, u.aptitud AS u_aptitud, u.fecha_proximo AS u_proximo,
               EXISTS (SELECT 1 FROM salud_examen e WHERE e.trabajador_id = t.id AND e.tipo = 'pre_ingreso') AS tiene_pre,
               EXISTS (SELECT 1 FROM salud_examen e WHERE e.trabajador_id = t.id AND e.tipo = 'egreso') AS tiene_egreso,
               r.hoy
        FROM trabajadores t
        CROSS JOIN ref r
        LEFT JOIN LATERAL (
            SELECT e.fecha, e.tipo, e.aptitud, e.fecha_proximo
            FROM salud_examen e
            WHERE e.trabajador_id = t.id
            ORDER BY e.fecha DESC, e.created_at DESC
            LIMIT 1
        ) u ON true
        WHERE t.empresa_id = (SELECT get_my_empresa_id())
    ),
    calc AS (
        SELECT b.*,
               -- shortcut: tope periodico 24 meses fijo.
               COALESCE(b.u_proximo, (b.u_fecha + interval '24 months')::date) AS proximo_ef
        FROM base b
    )
    SELECT c.id, c.nombre, c.cargo, c.sede_id, c.u_fecha, c.u_tipo, c.u_aptitud, c.u_proximo,
           CASE WHEN c.u_fecha IS NULL THEN 'sin_examen'
                WHEN c.proximo_ef < c.hoy THEN 'vencido'
                WHEN c.proximo_ef <= c.hoy + 30 THEN 'por_vencer'
                ELSE 'vigente' END,
           array_remove(ARRAY[
               CASE WHEN c.activo AND c.fecha_ingreso IS NOT NULL AND NOT c.tiene_pre THEN 'pre_ingreso' END,
               CASE WHEN c.activo AND (
                         (c.u_fecha IS NOT NULL AND c.proximo_ef < c.hoy)
                      OR (c.u_fecha IS NULL AND c.fecha_ingreso IS NOT NULL
                          AND c.fecha_ingreso + interval '24 months' < c.hoy)
                    ) THEN 'periodica_programada' END,
               CASE WHEN NOT c.activo AND NOT c.tiene_egreso THEN 'egreso' END
           ], NULL)
    FROM calc c
    ORDER BY c.nombre;
$$;

CREATE OR REPLACE FUNCTION public.salud_perfil_cargo(p_cargo text)
RETURNS TABLE (
    peligro_id uuid,
    peligro_descripcion text,
    examenes_sugeridos text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
    SELECT d.peligro_id, d.peligro_descripcion,
           COALESCE((SELECT array_agg(DISTINCT pe.examen_sugerido ORDER BY pe.examen_sugerido)
                     FROM salud_peligro_examen pe
                     WHERE salud_norm(d.peligro_descripcion) LIKE '%' || salud_norm(pe.patron) || '%'),
                    ARRAY[]::text[])
    FROM (
        SELECT DISTINCT ON (i.peligro_id, i.peligro_descripcion) i.peligro_id, i.peligro_descripcion
        FROM sst_matriz_iperc i
        WHERE i.empresa_id = (SELECT get_my_empresa_id())
          AND salud_norm(i.cargo) = salud_norm(trim(p_cargo))
    ) d
    ORDER BY d.peligro_descripcion;
$$;

REVOKE ALL ON FUNCTION public.salud_norm(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.salud_cobertura(int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.salud_perfil_cargo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salud_norm(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salud_cobertura(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salud_perfil_cargo(text) TO authenticated;
