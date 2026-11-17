-- Catalogo de cargos (fase "Fundacion"). Aditivo, idempotente y no-breaking.
-- Crea public.cargos (por empresa) y cargo_id nullable en trabajadores y sst_matriz_iperc.
-- La columna de texto `cargo` NO se borra: sigue siendo valida y es fallback.
-- Backfill: los cargos se crean SOLO desde trabajadores (fuente limpia). El IPERC se liga
-- unicamente si su texto coincide (salud_norm) con un cargo ya creado; el IPERC con texto
-- basura queda cargo_id NULL a proposito (no se insertan cargos desde IPERC).
-- salud_perfil_cargo: misma firma/retorno; busca por cargo_id y cae al match por texto.
-- VECTOR (documentacion; NO ejecutar tal cual en prod):
--  trabajador con cargo 'Soldador' => se crea cargos('Soldador'), trabajadores.cargo_id queda ligado,
--  el IPERC con cargo 'soldador' se liga por salud_norm y salud_perfil_cargo('Soldador') lo resuelve por cargo_id.

CREATE TABLE IF NOT EXISTS public.cargos (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  uuid NOT NULL REFERENCES public.empresas(id),
    nombre      text NOT NULL,
    nombre_norm text GENERATED ALWAYS AS (public.salud_norm(nombre)) STORED,
    activo      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cargos_empresa_norm ON public.cargos (empresa_id, nombre_norm);
CREATE INDEX IF NOT EXISTS ix_cargos_empresa ON public.cargos (empresa_id);

DROP TRIGGER IF EXISTS trg_cargos_updated_at ON public.cargos;
CREATE TRIGGER trg_cargos_updated_at
BEFORE UPDATE ON public.cargos
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- RLS fail-closed, una policy por comando (DROP + CREATE => idempotente).
DO $$
DECLARE
    cmd text;
    cond text := 'empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())';
BEGIN
    ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
    FOREACH cmd IN ARRAY ARRAY['select', 'insert', 'update', 'delete'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.cargos', 'cargos_' || cmd);
    END LOOP;
    EXECUTE format('CREATE POLICY cargos_select ON public.cargos FOR SELECT TO authenticated USING (%s)', cond);
    EXECUTE format('CREATE POLICY cargos_insert ON public.cargos FOR INSERT TO authenticated WITH CHECK (%s)', cond);
    EXECUTE format('CREATE POLICY cargos_update ON public.cargos FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', cond, cond);
    EXECUTE format('CREATE POLICY cargos_delete ON public.cargos FOR DELETE TO authenticated USING (%s)', cond);
END $$;

REVOKE ALL ON public.cargos FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO authenticated;

ALTER TABLE public.trabajadores ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL;
ALTER TABLE public.sst_matriz_iperc ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_trabajadores_cargo_id ON public.trabajadores (cargo_id);
CREATE INDEX IF NOT EXISTS ix_sst_matriz_iperc_cargo_id ON public.sst_matriz_iperc (cargo_id);

-- Backfill. DISTINCT ON evita que dos variantes (Soldador/soldador) choquen en una misma sentencia.
INSERT INTO public.cargos (empresa_id, nombre)
SELECT DISTINCT ON (empresa_id, public.salud_norm(trim(cargo))) empresa_id, trim(cargo)
FROM public.trabajadores
WHERE cargo IS NOT NULL AND trim(cargo) <> ''
ORDER BY empresa_id, public.salud_norm(trim(cargo)), trim(cargo)
ON CONFLICT (empresa_id, nombre_norm) DO NOTHING;

UPDATE public.trabajadores t SET cargo_id = c.id
FROM public.cargos c
WHERE t.cargo_id IS NULL AND t.cargo IS NOT NULL
  AND c.empresa_id = t.empresa_id AND c.nombre_norm = public.salud_norm(trim(t.cargo));

UPDATE public.sst_matriz_iperc i SET cargo_id = c.id
FROM public.cargos c
WHERE i.cargo_id IS NULL AND i.cargo IS NOT NULL
  AND c.empresa_id = i.empresa_id AND c.nombre_norm = public.salud_norm(trim(i.cargo));

-- Misma firma y retorno que la version del plan 16; solo cambia el WHERE del IPERC.
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
          AND ( i.cargo_id = (SELECT c.id FROM cargos c
                              WHERE c.empresa_id = (SELECT get_my_empresa_id())
                                AND c.nombre_norm = salud_norm(trim(p_cargo))
                              LIMIT 1)
                OR salud_norm(i.cargo) = salud_norm(trim(p_cargo)) )
    ) d
    ORDER BY d.peligro_descripcion;
$$;
