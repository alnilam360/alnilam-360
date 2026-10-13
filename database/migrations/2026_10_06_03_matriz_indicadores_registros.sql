-- ============================================================================
-- Migración: Tabla Completa de Registros de la Matriz de Indicadores SG-SST
-- Permite registrar, personalizar, medir y gestionar indicadores por periodo y sede
-- Normativa: Res. 0312/2019 · Dec. 1072/2015 · GTC 3701
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.matriz_indicadores_registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sede_id UUID REFERENCES public.sedes(id) ON DELETE SET NULL,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL DEFAULT 0, -- 0: Consolidado Anual, 1..12: Enero..Diciembre
    tipo TEXT NOT NULL, -- 'Accidente de Trabajo (AT)', 'Enfermadad Laboral (EL)', 'Ausentismo', 'Estructura - proceso - Resultado     (E-P-R) del  SG-SST'
    codigo_indicador TEXT NULL,
    nombre TEXT NOT NULL,
    formula TEXT NOT NULL,
    meta NUMERIC NOT NULL DEFAULT 0,
    meta_texto TEXT NULL, -- ej: '0%', '2%', '80%'
    responsable TEXT NOT NULL DEFAULT 'Responsable SST',
    frecuencia TEXT NOT NULL DEFAULT 'Mensual', -- 'Mensual', 'Anual', 'Trimestral', 'Semestral'
    numerador NUMERIC NULL,
    denominador NUMERIC NULL,
    resultado NUMERIC NOT NULL DEFAULT 0,
    resultado_texto TEXT NULL,
    cumplimiento TEXT NOT NULL DEFAULT 'CUMPLE', -- 'CUMPLE' o 'NO CUMPLE'
    personal_conocimiento TEXT NOT NULL DEFAULT 'Gerencia y trabajadores',
    observaciones TEXT NULL,
    plan_accion TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matriz_ind_reg_empresa_periodo
    ON public.matriz_indicadores_registros(empresa_id, anio, mes);

CREATE INDEX IF NOT EXISTS idx_matriz_ind_reg_tipo
    ON public.matriz_indicadores_registros(empresa_id, tipo);

ALTER TABLE public.matriz_indicadores_registros ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matriz_indicadores_registros' 
        AND policyname = 'matriz_ind_reg_select_secure'
    ) THEN
        CREATE POLICY matriz_ind_reg_select_secure ON public.matriz_indicadores_registros
            FOR SELECT TO authenticated
            USING (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matriz_indicadores_registros' 
        AND policyname = 'matriz_ind_reg_insert_secure'
    ) THEN
        CREATE POLICY matriz_ind_reg_insert_secure ON public.matriz_indicadores_registros
            FOR INSERT TO authenticated
            WITH CHECK (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'matriz_indicadores_registros' 
        AND policyname = 'matriz_ind_reg_update_secure'
    ) THEN
        CREATE POLICY matriz_ind_reg_update_secure ON public.matriz_indicadores_registros
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
        WHERE tablename = 'matriz_indicadores_registros' 
        AND policyname = 'matriz_ind_reg_delete_secure'
    ) THEN
        CREATE POLICY matriz_ind_reg_delete_secure ON public.matriz_indicadores_registros
            FOR DELETE TO authenticated
            USING (
                (empresa_id = (SELECT get_my_empresa_id() AS get_my_empresa_id))
                OR (SELECT is_admin() AS is_admin)
            );
    END IF;
END $$;
