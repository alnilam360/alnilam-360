-- ============================================================================
-- Migración: Configuración y Personalización de la Matriz de Indicadores SG-SST
-- Compatible con: Indicadores AT-EL LIFERAN y Decreto 1072 / Res. 0312
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matriz_indicadores_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sede_id UUID REFERENCES public.sedes(id) ON DELETE SET NULL,
    anio INTEGER NOT NULL,
    mes INTEGER NULL,
    indicador_id TEXT NOT NULL,
    meta NUMERIC NULL,
    responsable TEXT NULL,
    personal_conocimiento TEXT NULL,
    resultado_manual NUMERIC NULL,
    observaciones TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_matriz_indicador_empresa_periodo UNIQUE (empresa_id, anio, mes, indicador_id)
);

CREATE INDEX IF NOT EXISTS idx_matriz_ind_empresa_anio 
    ON public.matriz_indicadores_config(empresa_id, anio);

ALTER TABLE public.matriz_indicadores_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matriz_indicadores_config' 
        AND policyname = 'matriz_ind_select_secure'
    ) THEN
        CREATE POLICY matriz_ind_select_secure ON public.matriz_indicadores_config
            FOR SELECT TO authenticated
            USING (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matriz_indicadores_config' 
        AND policyname = 'matriz_ind_insert_secure'
    ) THEN
        CREATE POLICY matriz_ind_insert_secure ON public.matriz_indicadores_config
            FOR INSERT TO authenticated
            WITH CHECK (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matriz_indicadores_config' 
        AND policyname = 'matriz_ind_update_secure'
    ) THEN
        CREATE POLICY matriz_ind_update_secure ON public.matriz_indicadores_config
            FOR UPDATE TO authenticated
            USING (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            )
            WITH CHECK (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matriz_indicadores_config' 
        AND policyname = 'matriz_ind_delete_secure'
    ) THEN
        CREATE POLICY matriz_ind_delete_secure ON public.matriz_indicadores_config
            FOR DELETE TO authenticated
            USING (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            );
    END IF;
END $$;
