-- ============================================================================
-- Alnilam 360 — Módulo Empresas / Trabajadores
-- Migration: Crea tabla `public.trabajadores` (registro de personal por sede)
-- ============================================================================
-- Permite llevar un censo de trabajadores vinculados a cada sede de la empresa,
-- con datos personales, laborales y de seguridad social. La edad se calcula en
-- frontend a partir de `fecha_nacimiento` (no se persiste).
-- Integración: El módulo de Indicadores AT puede buscar trabajadores activos
-- por sede en lugar de ingresarlos manualmente.
-- ============================================================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS public.trabajadores (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sede_id         uuid NOT NULL REFERENCES public.sedes(id) ON DELETE RESTRICT,
    documento       text NOT NULL,
    nombre          text NOT NULL,
    fecha_nacimiento date,
    fecha_ingreso   date,
    cargo           text,
    area_trabajo    text,
    eps             text,
    arl             text,
    fondo_pensiones text,
    telefono        text,
    activo          boolean NOT NULL DEFAULT true,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- 2. Constraint: documento único por empresa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'trabajadores_empresa_documento_uq'
    ) THEN
        ALTER TABLE public.trabajadores
            ADD CONSTRAINT trabajadores_empresa_documento_uq
            UNIQUE (empresa_id, documento);
    END IF;
END $$;

-- 3. Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_trabajadores_sede_id
    ON public.trabajadores (sede_id);
CREATE INDEX IF NOT EXISTS idx_trabajadores_empresa_id
    ON public.trabajadores (empresa_id);
CREATE INDEX IF NOT EXISTS idx_trabajadores_activo
    ON public.trabajadores (sede_id, activo)
    WHERE activo = true;

-- 4. Trigger auto-update updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_updated_at_trabajadores'
    ) THEN
        CREATE TRIGGER set_updated_at_trabajadores
            BEFORE UPDATE ON public.trabajadores
            FOR EACH ROW
            EXECUTE FUNCTION public.trigger_set_updated_at();
    END IF;
END $$;

-- 5. RLS (mismo patrón que sedes: get_my_empresa_id())
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY trabajadores_select ON public.trabajadores
    FOR SELECT USING (empresa_id = get_my_empresa_id());

CREATE POLICY trabajadores_insert ON public.trabajadores
    FOR INSERT WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY trabajadores_update ON public.trabajadores
    FOR UPDATE USING (empresa_id = get_my_empresa_id())
               WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY trabajadores_delete ON public.trabajadores
    FOR DELETE USING (empresa_id = get_my_empresa_id());

-- Política temporal abierta (desarrollo) — misma convención que sedes
CREATE POLICY temp_open_trabajadores ON public.trabajadores
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Comentarios de columnas
COMMENT ON TABLE public.trabajadores IS
    'Registro de trabajadores por sede. Integrado con módulo de Indicadores AT para búsqueda automática.';
COMMENT ON COLUMN public.trabajadores.documento IS
    'Número de documento de identidad. Único por empresa (permite mismo documento en diferentes empresas).';
COMMENT ON COLUMN public.trabajadores.fecha_nacimiento IS
    'Fecha de nacimiento. La edad se calcula en frontend como derivado.';
COMMENT ON COLUMN public.trabajadores.fecha_ingreso IS
    'Fecha de ingreso a la empresa.';
COMMENT ON COLUMN public.trabajadores.activo IS
    'true = trabajador activo, false = retirado. Se usa para filtrar en autocomplete de AT.';
