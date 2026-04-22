-- ============================================================================
-- Alnilam 360 - Fase 1 Res. 0312
-- Migration: Cabecera y detalle de evaluaciones SGSST (Res. 0312)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tipos ENUM
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sst_eval_tipo_enum') THEN
        CREATE TYPE sst_eval_tipo_enum AS ENUM ('7', '21', '60');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sst_eval_estado_enum') THEN
        CREATE TYPE sst_eval_estado_enum AS ENUM ('Borrador', 'Finalizado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sst_eval_calificacion_enum') THEN
        CREATE TYPE sst_eval_calificacion_enum AS ENUM (
            'Cumple Totalmente',
            'No Cumple',
            'No Aplica'
        );
    END IF;
END $$;

-- ============================================================================
-- Tabla: sst_evaluaciones (cabecera)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sst_evaluaciones (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id         uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    fecha_evaluacion   date NOT NULL DEFAULT CURRENT_DATE,
    tipo_evaluacion    sst_eval_tipo_enum    NOT NULL,
    puntaje_total      numeric(6,2)          NOT NULL DEFAULT 0,
    estado             sst_eval_estado_enum  NOT NULL DEFAULT 'Borrador',
    observaciones      text,
    creado_por         uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sst_evaluaciones_empresa  ON public.sst_evaluaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sst_evaluaciones_estado   ON public.sst_evaluaciones(estado);
CREATE INDEX IF NOT EXISTS idx_sst_evaluaciones_fecha    ON public.sst_evaluaciones(fecha_evaluacion DESC);

DROP TRIGGER IF EXISTS trg_sst_evaluaciones_updated_at ON public.sst_evaluaciones;
CREATE TRIGGER trg_sst_evaluaciones_updated_at
BEFORE UPDATE ON public.sst_evaluaciones
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

COMMENT ON TABLE  public.sst_evaluaciones IS
    'Cabecera de evaluaciones SGSST (Res. 0312/2019). Una fila por evaluación anual de la empresa.';

-- ============================================================================
-- Tabla: sst_evaluaciones_detalle (transaccional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sst_evaluaciones_detalle (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id          uuid NOT NULL REFERENCES public.sst_evaluaciones(id) ON DELETE CASCADE,
    estandar_id            uuid NOT NULL REFERENCES public.sst_estandares_catalogo(id) ON DELETE RESTRICT,
    calificacion           sst_eval_calificacion_enum,
    justificacion_no_aplica text,
    evidencia_url          text,
    observaciones          text,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_eval_detalle_estandar UNIQUE (evaluacion_id, estandar_id),
    CONSTRAINT chk_no_aplica_justificacion CHECK (
        calificacion IS DISTINCT FROM 'No Aplica'
        OR (justificacion_no_aplica IS NOT NULL AND length(btrim(justificacion_no_aplica)) > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_sst_eval_detalle_evaluacion ON public.sst_evaluaciones_detalle(evaluacion_id);
CREATE INDEX IF NOT EXISTS idx_sst_eval_detalle_estandar   ON public.sst_evaluaciones_detalle(estandar_id);

DROP TRIGGER IF EXISTS trg_sst_eval_detalle_updated_at ON public.sst_evaluaciones_detalle;
CREATE TRIGGER trg_sst_eval_detalle_updated_at
BEFORE UPDATE ON public.sst_evaluaciones_detalle
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

COMMENT ON TABLE  public.sst_evaluaciones_detalle IS
    'Detalle de cada estándar evaluado dentro de una evaluación SGSST.';

-- ============================================================================
-- Row Level Security (multi-tenant por empresa_id)
-- ============================================================================
ALTER TABLE public.sst_evaluaciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_evaluaciones_detalle  ENABLE ROW LEVEL SECURITY;

-- Helper: empresa_id del usuario autenticado (vía tabla usuarios.auth_id)
CREATE OR REPLACE FUNCTION public.current_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT empresa_id
      FROM public.usuarios
     WHERE auth_id = auth.uid()
     LIMIT 1;
$$;

-- ---- Políticas: sst_evaluaciones
DROP POLICY IF EXISTS sst_eval_select_own_empresa ON public.sst_evaluaciones;
CREATE POLICY sst_eval_select_own_empresa
    ON public.sst_evaluaciones
    FOR SELECT
    TO authenticated
    USING (empresa_id = public.current_user_empresa_id());

DROP POLICY IF EXISTS sst_eval_insert_own_empresa ON public.sst_evaluaciones;
CREATE POLICY sst_eval_insert_own_empresa
    ON public.sst_evaluaciones
    FOR INSERT
    TO authenticated
    WITH CHECK (empresa_id = public.current_user_empresa_id());

DROP POLICY IF EXISTS sst_eval_update_own_empresa ON public.sst_evaluaciones;
CREATE POLICY sst_eval_update_own_empresa
    ON public.sst_evaluaciones
    FOR UPDATE
    TO authenticated
    USING (empresa_id = public.current_user_empresa_id())
    WITH CHECK (empresa_id = public.current_user_empresa_id());

DROP POLICY IF EXISTS sst_eval_delete_own_empresa ON public.sst_evaluaciones;
CREATE POLICY sst_eval_delete_own_empresa
    ON public.sst_evaluaciones
    FOR DELETE
    TO authenticated
    USING (
        empresa_id = public.current_user_empresa_id()
        AND estado = 'Borrador'
    );

-- ---- Políticas: sst_evaluaciones_detalle (derivadas por cabecera)
DROP POLICY IF EXISTS sst_eval_det_select_own ON public.sst_evaluaciones_detalle;
CREATE POLICY sst_eval_det_select_own
    ON public.sst_evaluaciones_detalle
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sst_evaluaciones e
             WHERE e.id = evaluacion_id
               AND e.empresa_id = public.current_user_empresa_id()
        )
    );

DROP POLICY IF EXISTS sst_eval_det_insert_own ON public.sst_evaluaciones_detalle;
CREATE POLICY sst_eval_det_insert_own
    ON public.sst_evaluaciones_detalle
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sst_evaluaciones e
             WHERE e.id = evaluacion_id
               AND e.empresa_id = public.current_user_empresa_id()
        )
    );

DROP POLICY IF EXISTS sst_eval_det_update_own ON public.sst_evaluaciones_detalle;
CREATE POLICY sst_eval_det_update_own
    ON public.sst_evaluaciones_detalle
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sst_evaluaciones e
             WHERE e.id = evaluacion_id
               AND e.empresa_id = public.current_user_empresa_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sst_evaluaciones e
             WHERE e.id = evaluacion_id
               AND e.empresa_id = public.current_user_empresa_id()
        )
    );

DROP POLICY IF EXISTS sst_eval_det_delete_own ON public.sst_evaluaciones_detalle;
CREATE POLICY sst_eval_det_delete_own
    ON public.sst_evaluaciones_detalle
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sst_evaluaciones e
             WHERE e.id = evaluacion_id
               AND e.empresa_id = public.current_user_empresa_id()
               AND e.estado = 'Borrador'
        )
    );
