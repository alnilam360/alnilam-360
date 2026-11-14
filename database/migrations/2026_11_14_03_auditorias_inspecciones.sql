-- Plan 12 F1: Auditorías e Inspecciones (verificación SG-SST). Aditivo e idempotente.
-- Orden de creación: plantilla -> plantilla_item -> verificacion -> respuesta -> hallazgo,
-- así sst_verificacion.plantilla_id referencia una tabla ya existente (sin ALTER posterior).
-- % cumplimiento = cumple / (cumple + no_cumple) * 100, excluye no_aplica, 2 decimales; se persiste en sst_verificacion.puntaje al cerrar.

CREATE TABLE IF NOT EXISTS public.sst_verificacion_plantilla (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid,  -- NULL = plantilla global (seed), legible por todas las empresas
    tipo       text NOT NULL CHECK (tipo IN ('inspeccion', 'auditoria_interna')),
    subtipo    text,
    nombre     text NOT NULL,
    activo     boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sst_verificacion_plantilla_item (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plantilla_id uuid NOT NULL REFERENCES public.sst_verificacion_plantilla(id) ON DELETE CASCADE,
    orden       int NOT NULL DEFAULT 0,
    texto       text NOT NULL,
    categoria   text,
    estandar_id uuid REFERENCES public.sst_estandares_catalogo(id),
    activo      boolean NOT NULL DEFAULT true,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sst_verificacion (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        uuid NOT NULL,
    tipo              text NOT NULL CHECK (tipo IN ('inspeccion', 'auditoria_interna')),
    subtipo           text,  -- epp|extintores|botiquin|locativa|quimicas|gerencial|auditoria_sgsst (libre)
    titulo            text NOT NULL,
    plantilla_id      uuid REFERENCES public.sst_verificacion_plantilla(id),
    sede_id           uuid REFERENCES public.sedes(id),
    responsable_id    uuid REFERENCES public.trabajadores(id),
    responsable_texto text,
    fecha_programada  date,
    fecha_ejecucion   date,
    estado            text NOT NULL DEFAULT 'programada'
                      CHECK (estado IN ('programada', 'en_curso', 'cerrada', 'cancelada')),
    alcance           text,
    criterios         text,
    puntaje           numeric(5,2),
    observaciones     text,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sst_verificacion_respuesta (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    verificacion_id   uuid NOT NULL REFERENCES public.sst_verificacion(id) ON DELETE CASCADE,
    orden             int NOT NULL DEFAULT 0,
    item_texto        text NOT NULL,  -- snapshot: cambiar la plantilla no altera ejecuciones previas
    plantilla_item_id uuid REFERENCES public.sst_verificacion_plantilla_item(id),
    resultado         text CHECK (resultado IN ('cumple', 'no_cumple', 'no_aplica')),
    observacion       text,
    evidencia_url     text,
    created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sst_hallazgo (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id           uuid NOT NULL,
    verificacion_id      uuid NOT NULL REFERENCES public.sst_verificacion(id) ON DELETE CASCADE,
    respuesta_id         uuid REFERENCES public.sst_verificacion_respuesta(id) ON DELETE SET NULL,
    descripcion          text NOT NULL,
    clasificacion        text CHECK (clasificacion IN ('tecnico', 'documental', 'operativo', 'administrativo')),
    severidad            text CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
    estandar_id          uuid REFERENCES public.sst_estandares_catalogo(id),
    responsable_id       uuid REFERENCES public.trabajadores(id),
    responsable_texto    text,
    fecha_compromiso     date,
    jerarquia            text CHECK (jerarquia IS NULL OR jerarquia IN ('fuente', 'medio', 'individuo')),
    estado               text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_progreso', 'cerrado')),
    fecha_cierre         date,
    eficacia_verificada  boolean NOT NULL DEFAULT false,
    fecha_verificacion   date,
    evidencia_cierre_url text,
    created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sst_verif_plantilla_empresa ON public.sst_verificacion_plantilla (empresa_id);
CREATE INDEX IF NOT EXISTS idx_sst_verif_plantilla_item_plantilla ON public.sst_verificacion_plantilla_item (plantilla_id);
CREATE INDEX IF NOT EXISTS idx_sst_verificacion_empresa ON public.sst_verificacion (empresa_id);
CREATE INDEX IF NOT EXISTS idx_sst_verificacion_plantilla ON public.sst_verificacion (plantilla_id);
CREATE INDEX IF NOT EXISTS idx_sst_verif_respuesta_verificacion ON public.sst_verificacion_respuesta (verificacion_id);
CREATE INDEX IF NOT EXISTS idx_sst_hallazgo_empresa ON public.sst_hallazgo (empresa_id);
CREATE INDEX IF NOT EXISTS idx_sst_hallazgo_verificacion ON public.sst_hallazgo (verificacion_id);
CREATE INDEX IF NOT EXISTS idx_sst_hallazgo_respuesta ON public.sst_hallazgo (respuesta_id);

-- RLS fail-closed. Una policy por comando; DROP+CREATE para ser idempotente.
-- Plantilla global (empresa_id NULL): solo lectura; nadie la muta desde el cliente.
DO $$
DECLARE
    r record;
    cmd text;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('sst_verificacion',
         'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())',
         'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())'),
        ('sst_hallazgo',
         'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())',
         'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())'),
        ('sst_verificacion_respuesta',
         'verificacion_id IN (SELECT id FROM sst_verificacion WHERE empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))',
         'verificacion_id IN (SELECT id FROM sst_verificacion WHERE empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))'),
        ('sst_verificacion_plantilla',
         'empresa_id = (SELECT get_my_empresa_id()) OR empresa_id IS NULL OR (SELECT is_admin())',
         'empresa_id = (SELECT get_my_empresa_id())'),
        ('sst_verificacion_plantilla_item',
         'plantilla_id IN (SELECT id FROM sst_verificacion_plantilla WHERE empresa_id = (SELECT get_my_empresa_id()) OR empresa_id IS NULL OR (SELECT is_admin()))',
         'plantilla_id IN (SELECT id FROM sst_verificacion_plantilla WHERE empresa_id = (SELECT get_my_empresa_id()))')
    ) AS t(tabla, cond_sel, cond_mut)
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tabla);
        FOREACH cmd IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tabla || '_' || cmd, r.tabla);
        END LOOP;
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
                       r.tabla || '_select', r.tabla, r.cond_sel);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
                       r.tabla || '_insert', r.tabla, r.cond_mut);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                       r.tabla || '_update', r.tabla, r.cond_mut, r.cond_mut);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
                       r.tabla || '_delete', r.tabla, r.cond_mut);
    END LOOP;
END $$;

REVOKE ALL ON public.sst_verificacion, public.sst_verificacion_plantilla, public.sst_verificacion_plantilla_item,
              public.sst_verificacion_respuesta, public.sst_hallazgo FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_verificacion, public.sst_verificacion_plantilla,
              public.sst_verificacion_plantilla_item, public.sst_verificacion_respuesta, public.sst_hallazgo TO authenticated;

-- Una fila por verificación del año. Empresa ajena y no admin => 0 filas (fail-closed, sin error).
CREATE OR REPLACE FUNCTION public.get_programa_verificaciones(p_empresa_id uuid, p_anio int)
RETURNS TABLE (
    verificacion_id uuid,
    tipo text,
    subtipo text,
    titulo text,
    estado text,
    fecha_programada date,
    fecha_ejecucion date,
    puntaje numeric,
    hallazgos_abiertos int,
    hallazgos_vencidos int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        v.id, v.tipo, v.subtipo, v.titulo, v.estado, v.fecha_programada, v.fecha_ejecucion, v.puntaje,
        (SELECT count(*)::int FROM sst_hallazgo h
          WHERE h.verificacion_id = v.id AND h.estado <> 'cerrado'),
        (SELECT count(*)::int FROM sst_hallazgo h
          WHERE h.verificacion_id = v.id AND h.estado <> 'cerrado' AND h.fecha_compromiso < current_date)
    FROM sst_verificacion v
    WHERE v.empresa_id = p_empresa_id
      AND (p_empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
      AND extract(year FROM coalesce(v.fecha_programada, v.fecha_ejecucion)) = p_anio
    ORDER BY coalesce(v.fecha_programada, v.fecha_ejecucion), v.created_at;
$$;

REVOKE ALL ON FUNCTION public.get_programa_verificaciones(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_programa_verificaciones(uuid, int) TO authenticated;

-- SEED: 4 plantillas globales de inspección. UUIDs deterministas => ON CONFLICT (id) DO NOTHING.
INSERT INTO public.sst_verificacion_plantilla (id, empresa_id, tipo, subtipo, nombre) VALUES
    ('a1000000-0000-0000-0000-000000000001', NULL, 'inspeccion', 'epp',        'Inspección de EPP'),
    ('a1000000-0000-0000-0000-000000000002', NULL, 'inspeccion', 'extintores', 'Inspección de extintores'),
    ('a1000000-0000-0000-0000-000000000003', NULL, 'inspeccion', 'botiquin',   'Inspección de botiquín'),
    ('a1000000-0000-0000-0000-000000000004', NULL, 'inspeccion', 'locativa',   'Inspección locativa')
ON CONFLICT (id) DO NOTHING;

-- id del ítem = b1000000-...-<plantilla*100+orden> (12 dígitos).
INSERT INTO public.sst_verificacion_plantilla_item (id, plantilla_id, orden, texto)
SELECT ('b1000000-0000-0000-0000-' || lpad((p * 100 + o)::text, 12, '0'))::uuid,
       ('a1000000-0000-0000-0000-' || lpad(p::text, 12, '0'))::uuid, o, texto
FROM (VALUES
    (1, 1, 'Casco de seguridad en buen estado y usado correctamente'),
    (1, 2, 'Gafas de protección sin rayones ni fisuras'),
    (1, 3, 'Guantes adecuados al riesgo y sin roturas'),
    (1, 4, 'Calzado de seguridad en buen estado'),
    (1, 5, 'Protección auditiva disponible y en uso en zonas con ruido'),
    (1, 6, 'Arnés y línea de vida certificados y sin desgaste (trabajo en alturas)'),
    (1, 7, 'EPP limpio, almacenado y en buen estado general'),
    (1, 8, 'Registro de entrega de EPP firmado y actualizado'),
    (2, 1, 'Extintor señalizado y visible'),
    (2, 2, 'Acceso libre de obstáculos'),
    (2, 3, 'Manómetro de presión en zona verde'),
    (2, 4, 'Pin de seguridad y precinto intactos'),
    (2, 5, 'Fecha de recarga vigente'),
    (2, 6, 'Soporte firme en pared o pedestal'),
    (2, 7, 'Inspección mensual registrada'),
    (3, 1, 'Elementos completos según el listado definido'),
    (3, 2, 'Sin elementos vencidos'),
    (3, 3, 'Botiquín limpio, ordenado y accesible'),
    (3, 4, 'Responsable del botiquín asignado'),
    (3, 5, 'Registro de uso y reposición actualizado'),
    (4, 1, 'Orden y aseo en el área'),
    (4, 2, 'Pisos sin riesgo de caída (derrames, huecos, desniveles)'),
    (4, 3, 'Señalización de seguridad visible y completa'),
    (4, 4, 'Iluminación adecuada'),
    (4, 5, 'Rutas de evacuación libres y señalizadas'),
    (4, 6, 'Instalaciones eléctricas en buen estado'),
    (4, 7, 'Almacenamiento seguro y estable')
) AS s(p, o, texto)
ON CONFLICT (id) DO NOTHING;

-- VECTOR DE PRUEBA (documentación; NO ejecutar contra prod).
--  (a) % cumplimiento excluye no_aplica: 8 cumple / 2 no_cumple / 5 no_aplica => 80.00
--   WITH r(resultado, n) AS (VALUES ('cumple',8),('no_cumple',2),('no_aplica',5))
--   SELECT round(100.0 * sum(n) FILTER (WHERE resultado='cumple')
--                / sum(n) FILTER (WHERE resultado IN ('cumple','no_cumple')), 2) FROM r;   -- 80.00
--  (b) cross-empresa: usuario de A (get_my_empresa_id()=A, no admin):
--   SELECT * FROM get_programa_verificaciones(<B>, 2026);   -- 0 filas
--   SELECT * FROM get_programa_verificaciones(<A>, 2026);   -- solo las de A
--  (c) hallazgo vencido = fecha_compromiso < current_date AND estado <> 'cerrado':
--   WITH h(estado, fecha_compromiso) AS (VALUES
--        ('abierto',   current_date - 1),   -- vencido
--        ('abierto',   current_date),       -- no vencido (hoy)
--        ('cerrado',   current_date - 30),  -- no vencido (cerrado)
--        ('en_progreso', current_date - 5)) -- vencido
--   SELECT count(*) FILTER (WHERE estado <> 'cerrado') AS abiertos,                          -- 3
--          count(*) FILTER (WHERE estado <> 'cerrado' AND fecha_compromiso < current_date) AS vencidos  -- 2
--   FROM h;
