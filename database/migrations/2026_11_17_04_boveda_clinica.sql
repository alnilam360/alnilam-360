-- Boveda clinica de examenes medicos. Mas estricta que la norma: ni el area SST ni el
-- admin de empresa ven el PDF del concepto ni las observaciones; solo MEDICO (de su empresa) y super-admin.
-- Orden: crear tabla -> migrar datos -> DROP de las 2 columnas en salud_examen (idempotente: re-ejecutar no pierde datos,
-- el INSERT solo corre si las columnas aun existen).
-- El bucket viejo matriz-legal-docs YA no se usa para conceptos nuevos; usar 'salud-conceptos' con ruta <empresa_id>/<archivo>.
-- VECTOR (documentacion; NO ejecutar tal cual en prod):
--  usuario rol ADMINISTRADOR de empresa X: SELECT sobre salud_examen_clinico => 0 filas;
--  usuario rol MEDICO de X => ve las filas de X (no las de Y); super-admin => ve todo.

CREATE OR REPLACE FUNCTION public.is_medico()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM usuarios u
        LEFT JOIN roles r ON r.id = u.rol_id
        WHERE u.auth_id = auth.uid()
          AND upper(coalesce(r.nombre, u.rol, '')) = 'MEDICO'
    );
$$;
REVOKE ALL ON FUNCTION public.is_medico() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_medico() TO authenticated;

CREATE TABLE IF NOT EXISTS public.salud_examen_clinico (
    examen_id     uuid PRIMARY KEY REFERENCES public.salud_examen(id) ON DELETE CASCADE,
    empresa_id    uuid NOT NULL REFERENCES public.empresas(id),
    concepto_path text,
    observaciones text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_salud_examen_clinico_empresa ON public.salud_examen_clinico (empresa_id);

DROP TRIGGER IF EXISTS trg_salud_examen_clinico_updated_at ON public.salud_examen_clinico;
CREATE TRIGGER trg_salud_examen_clinico_updated_at
BEFORE UPDATE ON public.salud_examen_clinico
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- RLS fail-closed. is_company_admin() NO participa: el admin de empresa queda fuera.
DO $$
DECLARE
    cmd text;
    cond text := '(empresa_id = (SELECT get_my_empresa_id()) AND (SELECT is_medico())) OR (SELECT is_admin())';
BEGIN
    ALTER TABLE public.salud_examen_clinico ENABLE ROW LEVEL SECURITY;
    FOREACH cmd IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.salud_examen_clinico', 'salud_examen_clinico_' || cmd);
    END LOOP;
    EXECUTE format('CREATE POLICY salud_examen_clinico_select ON public.salud_examen_clinico FOR SELECT TO authenticated USING (%s)', cond);
    EXECUTE format('CREATE POLICY salud_examen_clinico_insert ON public.salud_examen_clinico FOR INSERT TO authenticated WITH CHECK (%s)', cond);
    EXECUTE format('CREATE POLICY salud_examen_clinico_update ON public.salud_examen_clinico FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', cond, cond);
    EXECUTE format('CREATE POLICY salud_examen_clinico_delete ON public.salud_examen_clinico FOR DELETE TO authenticated USING (%s)', cond);
END $$;

REVOKE ALL ON public.salud_examen_clinico FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salud_examen_clinico TO authenticated;

-- Migrar ANTES del drop; guardado por existencia de columnas para que re-ejecutar no falle.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'salud_examen' AND column_name = 'concepto_path') THEN
        INSERT INTO public.salud_examen_clinico (examen_id, empresa_id, concepto_path, observaciones)
        SELECT id, empresa_id, concepto_path, observaciones FROM public.salud_examen
        WHERE concepto_path IS NOT NULL OR observaciones IS NOT NULL
        ON CONFLICT (examen_id) DO NOTHING;
    END IF;
END $$;

ALTER TABLE public.salud_examen DROP COLUMN IF EXISTS concepto_path;
ALTER TABLE public.salud_examen DROP COLUMN IF EXISTS observaciones;

-- Bucket privado, ruta <empresa_id>/<archivo>.
INSERT INTO storage.buckets (id, name, public) VALUES ('salud-conceptos', 'salud-conceptos', false)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    cmd text;
    cond text := $c$bucket_id = 'salud-conceptos' AND ( (SELECT is_admin()) OR ( (SELECT is_medico()) AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text ) )$c$;
BEGIN
    FOREACH cmd IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', 'salud_conceptos_' || cmd);
    END LOOP;
    EXECUTE format('CREATE POLICY salud_conceptos_select ON storage.objects FOR SELECT TO authenticated USING (%s)', cond);
    EXECUTE format('CREATE POLICY salud_conceptos_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (%s)', cond);
    EXECUTE format('CREATE POLICY salud_conceptos_update ON storage.objects FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', cond, cond);
    EXECUTE format('CREATE POLICY salud_conceptos_delete ON storage.objects FOR DELETE TO authenticated USING (%s)', cond);
END $$;
