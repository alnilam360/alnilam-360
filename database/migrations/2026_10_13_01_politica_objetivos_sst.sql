-- ============================================================================
-- Alnilam 360 — Módulo Política, Objetivos y Metas SST
-- Normativa: Dec. 1072/2015 art. 2.2.4.6.5 a 2.2.4.6.7 · Res. 0312/2019
-- Solo LEE: empresas, trabajadores, usuarios, catalogo_responsable_plan,
--           matriz_indicadores_registros. No altera ninguna tabla existente.
--
-- Resolución de personas (sin duplicar datos):
--   * Representante Legal -> public.empresas.representante_legal ->> 'nombre'
--     (mismo campo del encabezado del Plan Anual). Se congela en
--     aprobado_por_nombre por trigger al aprobar.
--   * Elabora / Revisa    -> FK a public.trabajadores(id).
--   * Responsable objetivo -> FK a public.catalogo_responsable_plan(id).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. POLÍTICA SST (documento controlado versionado)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.politica_sst (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    version                 integer NOT NULL,          -- asignada por trigger
    contenido               text NOT NULL DEFAULT '',
    alcance                 text NOT NULL DEFAULT '',
    estado                  text NOT NULL DEFAULT 'borrador'
        CHECK (estado IN ('borrador','en_revision','aprobado','publicado','obsoleto')),

    elaborado_por           uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,
    revisado_por            uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,

    aprobado_por_nombre     text,

    fecha_elaboracion       date NOT NULL DEFAULT CURRENT_DATE,
    fecha_aprobacion        date,
    fecha_publicacion       date,
    fecha_proxima_revision  date GENERATED ALWAYS AS
                              ((fecha_aprobacion + INTERVAL '1 year')::date) STORED,

    created_by              uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT politica_sst_empresa_version_uq UNIQUE (empresa_id, version),
    CONSTRAINT politica_sst_id_empresa_uq      UNIQUE (id, empresa_id),
    CONSTRAINT politica_sst_aprobacion_chk CHECK (
        estado IN ('borrador','en_revision')
        OR (fecha_aprobacion IS NOT NULL AND aprobado_por_nombre IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS politica_sst_un_publicado_por_empresa
    ON public.politica_sst (empresa_id) WHERE estado = 'publicado';

CREATE INDEX IF NOT EXISTS idx_politica_sst_elaborado_por ON public.politica_sst (elaborado_por) WHERE elaborado_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_politica_sst_revisado_por  ON public.politica_sst (revisado_por)  WHERE revisado_por  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_politica_sst_created_by    ON public.politica_sst (created_by)    WHERE created_by    IS NOT NULL;

-- 1.1 Versionado automático por empresa (advisory lock evita carreras)
CREATE OR REPLACE FUNCTION public.politica_sst_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('politica_sst:' || NEW.empresa_id::text));

    SELECT COALESCE(MAX(version), 0) + 1
      INTO NEW.version
      FROM public.politica_sst
     WHERE empresa_id = NEW.empresa_id;

    NEW.estado              := 'borrador';
    NEW.aprobado_por_nombre := NULL;
    NEW.fecha_aprobacion    := NULL;
    NEW.fecha_publicacion   := NULL;

    IF NEW.created_by IS NULL THEN
        SELECT u.id INTO NEW.created_by
          FROM public.usuarios u
         WHERE u.auth_id = (SELECT auth.uid())
         LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$;

-- 1.2 Flujo de estados + inmutabilidad del documento aprobado
CREATE OR REPLACE FUNCTION public.politica_sst_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rep_legal text;
BEGIN
    IF NEW.empresa_id <> OLD.empresa_id OR NEW.version <> OLD.version THEN
        RAISE EXCEPTION 'empresa_id y version son inmutables';
    END IF;

    -- Los campos de aprobación solo los escribe este trigger
    NEW.aprobado_por_nombre := OLD.aprobado_por_nombre;
    NEW.fecha_aprobacion    := OLD.fecha_aprobacion;
    NEW.fecha_publicacion   := OLD.fecha_publicacion;

    -- Contenido editable solo en borrador. Se permite que elaborado_por /
    -- revisado_por pasen a NULL (ON DELETE SET NULL desde Trabajadores).
    IF OLD.estado <> 'borrador' AND (
           NEW.contenido IS DISTINCT FROM OLD.contenido
        OR NEW.alcance   IS DISTINCT FROM OLD.alcance
        OR NEW.fecha_elaboracion IS DISTINCT FROM OLD.fecha_elaboracion
        OR (NEW.elaborado_por IS DISTINCT FROM OLD.elaborado_por AND NEW.elaborado_por IS NOT NULL)
    ) THEN
        RAISE EXCEPTION 'La política solo se puede editar en estado borrador (estado actual: %)', OLD.estado;
    END IF;

    IF OLD.estado NOT IN ('borrador','en_revision')
       AND NEW.revisado_por IS DISTINCT FROM OLD.revisado_por
       AND NEW.revisado_por IS NOT NULL THEN
        RAISE EXCEPTION 'El revisor no se puede cambiar después de aprobada la política';
    END IF;

    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        IF NOT (
               (OLD.estado = 'borrador'    AND NEW.estado = 'en_revision')
            OR (OLD.estado = 'en_revision' AND NEW.estado IN ('borrador','aprobado'))
            OR (OLD.estado = 'aprobado'    AND NEW.estado = 'publicado')
            OR (OLD.estado = 'publicado'   AND NEW.estado = 'obsoleto')
        ) THEN
            RAISE EXCEPTION 'Transición de estado no permitida: % -> %', OLD.estado, NEW.estado;
        END IF;

        IF NEW.estado = 'en_revision' AND (NEW.elaborado_por IS NULL OR length(trim(NEW.contenido)) = 0) THEN
            RAISE EXCEPTION 'Para enviar a revisión se requiere contenido y quién elabora';
        END IF;

        IF NEW.estado = 'aprobado' THEN
            IF NEW.revisado_por IS NULL THEN
                RAISE EXCEPTION 'Debe asignar quién revisa antes de aprobar';
            END IF;

            SELECT NULLIF(trim(e.representante_legal ->> 'nombre'), '')
              INTO v_rep_legal
              FROM public.empresas e
             WHERE e.id = NEW.empresa_id;

            IF v_rep_legal IS NULL THEN
                RAISE EXCEPTION 'La empresa no tiene Representante Legal registrado (Configuración > Empresas)';
            END IF;

            NEW.aprobado_por_nombre := v_rep_legal;
            NEW.fecha_aprobacion    := CURRENT_DATE;
        END IF;

        IF NEW.estado = 'publicado' THEN
            -- La versión publicada anterior pasa a obsoleto (D5: al publicar)
            UPDATE public.politica_sst
               SET estado = 'obsoleto'
             WHERE empresa_id = NEW.empresa_id
               AND estado = 'publicado'
               AND id <> NEW.id;
            NEW.fecha_publicacion := CURRENT_DATE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_politica_sst_bi ON public.politica_sst;
CREATE TRIGGER trg_politica_sst_bi
    BEFORE INSERT ON public.politica_sst
    FOR EACH ROW EXECUTE FUNCTION public.politica_sst_before_insert();

DROP TRIGGER IF EXISTS trg_politica_sst_bu ON public.politica_sst;
CREATE TRIGGER trg_politica_sst_bu
    BEFORE UPDATE ON public.politica_sst
    FOR EACH ROW EXECUTE FUNCTION public.politica_sst_before_update();

DROP TRIGGER IF EXISTS set_updated_at_politica_sst ON public.politica_sst;
CREATE TRIGGER set_updated_at_politica_sst
    BEFORE UPDATE ON public.politica_sst
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. OBJETIVOS SST
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.objetivo_sst (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    politica_sst_id         uuid NOT NULL,
    descripcion             text NOT NULL CHECK (length(trim(descripcion)) >= 10),
    meta_texto              text NOT NULL,
    meta_valor_numerico     numeric,
    meta_unidad             text,
    criterio_cumplimiento   text NOT NULL DEFAULT 'mayor_igual'
        CHECK (criterio_cumplimiento IN ('mayor_igual','menor_igual')),
    indicador_vinculado_id  uuid REFERENCES public.matriz_indicadores_registros(id) ON DELETE SET NULL,
    responsable_id          uuid REFERENCES public.catalogo_responsable_plan(id) ON DELETE SET NULL,
    fecha_inicio            date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 1),
    fecha_fin               date NOT NULL DEFAULT make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 12, 31),
    estado                  text NOT NULL DEFAULT 'vigente'
        CHECK (estado IN ('vigente','cumplido','no_cumplido','vencido')),
    orden                   smallint NOT NULL DEFAULT 0,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT objetivo_sst_politica_fk
        FOREIGN KEY (politica_sst_id, empresa_id)
        REFERENCES public.politica_sst (id, empresa_id) ON DELETE CASCADE,
    CONSTRAINT objetivo_sst_vigencia_chk CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT objetivo_sst_indicador_meta_chk
        CHECK (indicador_vinculado_id IS NULL OR meta_valor_numerico IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_objetivo_sst_politica    ON public.objetivo_sst (politica_sst_id, empresa_id);
CREATE INDEX IF NOT EXISTS idx_objetivo_sst_empresa     ON public.objetivo_sst (empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_objetivo_sst_indicador   ON public.objetivo_sst (indicador_vinculado_id) WHERE indicador_vinculado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_objetivo_sst_responsable ON public.objetivo_sst (responsable_id)         WHERE responsable_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.objetivo_sst_validar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.indicador_vinculado_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.matriz_indicadores_registros r
         WHERE r.id = NEW.indicador_vinculado_id
           AND r.empresa_id = NEW.empresa_id
    ) THEN
        RAISE EXCEPTION 'El indicador vinculado no pertenece a la empresa del objetivo';
    END IF;

    IF TG_OP = 'INSERT' OR NEW.politica_sst_id IS DISTINCT FROM OLD.politica_sst_id THEN
        IF EXISTS (SELECT 1 FROM public.politica_sst p
                    WHERE p.id = NEW.politica_sst_id AND p.estado = 'obsoleto') THEN
            RAISE EXCEPTION 'No se pueden asociar objetivos a una versión obsoleta de la política';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_objetivo_sst_validar ON public.objetivo_sst;
CREATE TRIGGER trg_objetivo_sst_validar
    BEFORE INSERT OR UPDATE OF indicador_vinculado_id, politica_sst_id, empresa_id
    ON public.objetivo_sst
    FOR EACH ROW EXECUTE FUNCTION public.objetivo_sst_validar();

DROP TRIGGER IF EXISTS set_updated_at_objetivo_sst ON public.objetivo_sst;
CREATE TRIGGER set_updated_at_objetivo_sst
    BEFORE UPDATE ON public.objetivo_sst
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VISTA DE AVANCE (solo lectura sobre Indicadores; respeta RLS del invocador)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_objetivo_sst_avance
WITH (security_invoker = true) AS
SELECT
    o.*,
    ref.nombre       AS indicador_nombre,
    ref.tipo         AS indicador_tipo,
    ult.resultado    AS indicador_ultimo_resultado,
    ult.anio         AS indicador_ultimo_anio,
    ult.mes          AS indicador_ultimo_mes
FROM public.objetivo_sst o
LEFT JOIN public.matriz_indicadores_registros ref
       ON ref.id = o.indicador_vinculado_id
LEFT JOIN LATERAL (
    SELECT r.resultado, r.anio, r.mes
      FROM public.matriz_indicadores_registros r
     WHERE ref.id IS NOT NULL
       AND r.empresa_id = o.empresa_id
       AND r.resultado IS NOT NULL
       AND lower(trim(r.nombre)) = lower(trim(ref.nombre))
       AND r.anio BETWEEN EXTRACT(YEAR FROM o.fecha_inicio)::int
                      AND EXTRACT(YEAR FROM o.fecha_fin)::int
     ORDER BY r.anio DESC, r.mes DESC
     LIMIT 1
) ult ON true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS (mismo patrón multi-tenant del proyecto)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.politica_sst ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objetivo_sst ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS politica_sst_select_secure ON public.politica_sst;
CREATE POLICY politica_sst_select_secure ON public.politica_sst
    FOR SELECT TO authenticated
    USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS politica_sst_insert_secure ON public.politica_sst;
CREATE POLICY politica_sst_insert_secure ON public.politica_sst
    FOR INSERT TO authenticated
    WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS politica_sst_update_secure ON public.politica_sst;
CREATE POLICY politica_sst_update_secure ON public.politica_sst
    FOR UPDATE TO authenticated
    USING      (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS politica_sst_delete_secure ON public.politica_sst;
CREATE POLICY politica_sst_delete_secure ON public.politica_sst
    FOR DELETE TO authenticated
    USING (estado = 'borrador'
           AND (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin())));

DROP POLICY IF EXISTS objetivo_sst_select_secure ON public.objetivo_sst;
CREATE POLICY objetivo_sst_select_secure ON public.objetivo_sst
    FOR SELECT TO authenticated
    USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS objetivo_sst_insert_secure ON public.objetivo_sst;
CREATE POLICY objetivo_sst_insert_secure ON public.objetivo_sst
    FOR INSERT TO authenticated
    WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS objetivo_sst_update_secure ON public.objetivo_sst;
CREATE POLICY objetivo_sst_update_secure ON public.objetivo_sst
    FOR UPDATE TO authenticated
    USING      (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS objetivo_sst_delete_secure ON public.objetivo_sst;
CREATE POLICY objetivo_sst_delete_secure ON public.objetivo_sst
    FOR DELETE TO authenticated
    USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.politica_sst TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objetivo_sst TO authenticated;
GRANT SELECT ON public.v_objetivo_sst_avance TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Comentarios
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE  public.politica_sst IS 'Política SST versionada por empresa (documento controlado). Una sola versión publicada por empresa.';
COMMENT ON COLUMN public.politica_sst.aprobado_por_nombre IS 'Firma congelada al aprobar, tomada de empresas.representante_legal->>nombre por trigger. No editable.';
COMMENT ON COLUMN public.politica_sst.fecha_proxima_revision IS 'fecha_aprobacion + 1 año (revisión anual obligatoria).';
COMMENT ON TABLE  public.objetivo_sst IS 'Objetivos SMART del SG-SST asociados a una versión de la política.';
COMMENT ON COLUMN public.objetivo_sst.indicador_vinculado_id IS 'Fila de matriz_indicadores_registros que identifica el indicador; el avance usa el último resultado del mismo nombre dentro de la vigencia.';
COMMENT ON COLUMN public.objetivo_sst.criterio_cumplimiento IS 'mayor_igual: cumple si resultado >= meta. menor_igual: cumple si resultado <= meta (p. ej. accidentalidad).';
