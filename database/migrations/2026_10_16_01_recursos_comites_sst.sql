-- ============================================================================
-- Alnilam 360 — Módulo Recursos y Responsables (SG-SST)
-- Ruta frontend: /personal/roles
-- Normativa: Dec. 1072/2015 art. 2.2.4.6.8 · Res. 2013/1986 · Res. 652/2012 ·
--            Res. 1356/2012 · Res. 2400/1979 · Res. 0312/2019 (Estándar 1.1.1 a 1.1.8)
--
-- Tablas creadas:
--   1. public.sst_recurso                   (Recursos humanos, financieros, técnicos, físicos)
--   2. public.sst_comite                    (Tabla unificada COPASST, CCL, Brigada, Otros)
--   3. public.sst_comite_miembro            (Miembros asignados referenciando a trabajadores)
--   4. public.sst_comite_acta               (Actas periódicas ordinarias/extraordinarias)
--   5. public.sst_comite_acta_asistente     (Registro relacional de asistencia por acta)
--   6. public.matriz_responsabilidades_sst  (Matriz RACI: Procesos SST × Cargos/Roles)
--
-- Referencia obligatoria: public.trabajadores(id) para personas (cero duplicación).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RECURSOS ASIGNADOS AL SG-SST (sst_recurso)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_recurso (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_recurso            text NOT NULL CHECK (tipo_recurso IN ('humano', 'financiero', 'tecnico_tecnologico', 'fisico_locativo')),
    descripcion             text NOT NULL,
    responsable_gestion     uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,
    monto_presupuestado     numeric(14,2) CHECK (monto_presupuestado IS NULL OR monto_presupuestado >= 0),
    monto_ejecutado         numeric(14,2) DEFAULT 0 CHECK (monto_ejecutado IS NULL OR monto_ejecutado >= 0),
    periodo                 text NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::text,
    estado                  text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'ejecutado', 'pendiente')),
    observaciones           text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_recurso_financiero_monto CHECK (
        (tipo_recurso = 'financiero' AND monto_presupuestado IS NOT NULL) OR
        (tipo_recurso <> 'financiero')
    )
);

CREATE INDEX IF NOT EXISTS idx_sst_recurso_empresa_periodo ON public.sst_recurso (empresa_id, periodo);
CREATE INDEX IF NOT EXISTS idx_sst_recurso_responsable ON public.sst_recurso (responsable_gestion);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COMITÉS Y BRIGADAS SST (sst_comite) - Estructura Genérica Unificada
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_comite (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_comite             text NOT NULL CHECK (tipo_comite IN ('COPASST', 'COMITE_CONVIVENCIA', 'BRIGADA_EMERGENCIA', 'OTRO')),
    nombre_personalizado    text,
    fecha_conformacion      date NOT NULL,
    fecha_vigencia_fin      date NOT NULL,
    periodo_anios           integer NOT NULL DEFAULT 2 CHECK (periodo_anios > 0),
    acto_administrativo     text, -- Ej: 'Resolución Interna No. 003 de 2026'
    estado                  text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'en_proceso_eleccion', 'vencido')),
    periodicidad_actas      text NOT NULL DEFAULT 'mensual' CHECK (periodicidad_actas IN ('mensual', 'bimestral', 'trimestral', 'semestral', 'anual')),
    observaciones           text,
    grupo_objetivo_id       uuid REFERENCES public.catalogo_grupo_objetivo(id) ON DELETE SET NULL,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_sst_comite_fechas CHECK (fecha_vigencia_fin >= fecha_conformacion)
);

CREATE INDEX IF NOT EXISTS idx_sst_comite_empresa_tipo ON public.sst_comite (empresa_id, tipo_comite, estado);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MIEMBROS DE COMITÉS Y BRIGADAS (sst_comite_miembro)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_comite_miembro (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comite_id                   uuid NOT NULL REFERENCES public.sst_comite(id) ON DELETE CASCADE,
    trabajador_id               uuid NOT NULL REFERENCES public.trabajadores(id) ON DELETE RESTRICT,
    rol_en_comite               text NOT NULL CHECK (rol_en_comite IN ('presidente', 'secretario', 'miembro', 'jefe_brigada', 'brigadista', 'coordinador', 'otro')),
    tipo_representacion         text NOT NULL DEFAULT 'no_aplica' CHECK (tipo_representacion IN ('empleador', 'trabajadores', 'no_aplica')),
    tipo_miembro                text NOT NULL DEFAULT 'principal' CHECK (tipo_miembro IN ('principal', 'suplente', 'primeros_auxilios', 'evacuacion_rescate', 'control_incendios', 'comunicaciones', 'general')),
    fecha_inicio_participacion  date NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin_participacion     date,
    activo                      boolean NOT NULL DEFAULT true,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_sst_comite_trabajador_activo UNIQUE (comite_id, trabajador_id)
);

CREATE INDEX IF NOT EXISTS idx_sst_comite_miembro_trabajador ON public.sst_comite_miembro (trabajador_id);
CREATE INDEX IF NOT EXISTS idx_sst_comite_miembro_comite ON public.sst_comite_miembro (comite_id, activo);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ACTAS DE REUNIÓN PERIÓDICA (sst_comite_acta)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_comite_acta (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comite_id               uuid NOT NULL REFERENCES public.sst_comite(id) ON DELETE CASCADE,
    numero_acta             text NOT NULL, -- Ej: 'Acta No. 004-2026'
    fecha_reunion           date NOT NULL,
    tipo_reunion            text NOT NULL DEFAULT 'ordinaria' CHECK (tipo_reunion IN ('ordinaria', 'extraordinaria')),
    temas_tratados          text NOT NULL,
    compromisos             text,
    compromisos_detalle     jsonb DEFAULT '[]'::jsonb, -- Array [{descripcion, responsable_id, fecha_limite, estado}]
    archivo_acta_url        text, -- URL en Supabase Storage
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sst_comite_acta_comite_fecha ON public.sst_comite_acta (comite_id, fecha_reunion DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ASISTENCIA A LAS ACTAS (sst_comite_acta_asistente)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sst_comite_acta_asistente (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    acta_id                 uuid NOT NULL REFERENCES public.sst_comite_acta(id) ON DELETE CASCADE,
    trabajador_id           uuid NOT NULL REFERENCES public.trabajadores(id) ON DELETE CASCADE,
    miembro_id              uuid REFERENCES public.sst_comite_miembro(id) ON DELETE SET NULL,
    asistio                 boolean NOT NULL DEFAULT true,
    observacion             text,
    created_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_sst_acta_trabajador UNIQUE (acta_id, trabajador_id)
);

CREATE INDEX IF NOT EXISTS idx_sst_acta_asistente_acta ON public.sst_comite_acta_asistente (acta_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. MATRIZ DE RESPONSABILIDADES SST - RACI (matriz_responsabilidades_sst)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matriz_responsabilidades_sst (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id                  uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    actividad_sst               text NOT NULL,
    fase_phva                   text CHECK (fase_phva IN ('Planear', 'Hacer', 'Verificar', 'Actuar')),
    rol_cargo                   text NOT NULL, -- Ej: 'Alta Dirección', 'Responsable SG-SST', 'COPASST', 'Comité Convivencia', 'Brigada', 'Jefaturas', 'Trabajadores'
    trabajador_especifico_id    uuid REFERENCES public.trabajadores(id) ON DELETE SET NULL,
    tipo_responsabilidad        text NOT NULL CHECK (tipo_responsabilidad IN ('R', 'A', 'C', 'I')),
    descripcion_responsabilidad text,
    orden                       integer NOT NULL DEFAULT 1,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_matriz_raci_actividad_rol UNIQUE (empresa_id, actividad_sst, rol_cargo)
);

CREATE INDEX IF NOT EXISTS idx_matriz_raci_empresa ON public.matriz_responsabilidades_sst (empresa_id, orden);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TRIGGERS AUTOMÁTICOS
-- ─────────────────────────────────────────────────────────────────────────────
-- 7.1 Auto-update updated_at
DROP TRIGGER IF EXISTS set_updated_at_sst_recurso ON public.sst_recurso;
CREATE TRIGGER set_updated_at_sst_recurso
    BEFORE UPDATE ON public.sst_recurso
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sst_comite ON public.sst_comite;
CREATE TRIGGER set_updated_at_sst_comite
    BEFORE UPDATE ON public.sst_comite
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sst_comite_miembro ON public.sst_comite_miembro;
CREATE TRIGGER set_updated_at_sst_comite_miembro
    BEFORE UPDATE ON public.sst_comite_miembro
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sst_comite_acta ON public.sst_comite_acta;
CREATE TRIGGER set_updated_at_sst_comite_acta
    BEFORE UPDATE ON public.sst_comite_acta
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_matriz_raci ON public.matriz_responsabilidades_sst;
CREATE TRIGGER set_updated_at_matriz_raci
    BEFORE UPDATE ON public.matriz_responsabilidades_sst
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- 7.2 Cálculo automático de vigencia y periodicidad en sst_comite
CREATE OR REPLACE FUNCTION public.fn_sst_comite_set_vigencia()
RETURNS trigger AS $$
BEGIN
    IF NEW.periodo_anios IS NULL OR NEW.periodo_anios <= 0 THEN
        IF NEW.tipo_comite IN ('COPASST', 'COMITE_CONVIVENCIA') THEN
            NEW.periodo_anios := 2;
        ELSIF NEW.tipo_comite = 'BRIGADA_EMERGENCIA' THEN
            NEW.periodo_anios := 1;
        ELSE
            NEW.periodo_anios := 2;
        END IF;
    END IF;

    IF NEW.fecha_vigencia_fin IS NULL THEN
        NEW.fecha_vigencia_fin := (NEW.fecha_conformacion + (NEW.periodo_anios || ' years')::interval)::date;
    END IF;

    IF NEW.periodicidad_actas IS NULL THEN
        IF NEW.tipo_comite = 'COPASST' THEN
            NEW.periodicidad_actas := 'mensual';
        ELSIF NEW.tipo_comite IN ('COMITE_CONVIVENCIA', 'BRIGADA_EMERGENCIA') THEN
            NEW.periodicidad_actas := 'trimestral';
        ELSE
            NEW.periodicidad_actas := 'trimestral';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sst_comite_set_vigencia ON public.sst_comite;
CREATE TRIGGER trg_sst_comite_set_vigencia
    BEFORE INSERT ON public.sst_comite
    FOR EACH ROW EXECUTE FUNCTION public.fn_sst_comite_set_vigencia();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. POLÍTICAS RLS (Row Level Security) - Zero Trust Multi-Tenant
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sst_recurso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_comite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_comite_miembro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_comite_acta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_comite_acta_asistente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_responsabilidades_sst ENABLE ROW LEVEL SECURITY;

-- sst_recurso
DROP POLICY IF EXISTS sst_recurso_all_policy ON public.sst_recurso;
CREATE POLICY sst_recurso_all_policy ON public.sst_recurso
    FOR ALL TO authenticated
    USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

-- sst_comite
DROP POLICY IF EXISTS sst_comite_all_policy ON public.sst_comite;
CREATE POLICY sst_comite_all_policy ON public.sst_comite
    FOR ALL TO authenticated
    USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

-- sst_comite_miembro
DROP POLICY IF EXISTS sst_comite_miembro_all_policy ON public.sst_comite_miembro;
CREATE POLICY sst_comite_miembro_all_policy ON public.sst_comite_miembro
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sst_comite c
        WHERE c.id = comite_id
          AND (c.empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sst_comite c
        WHERE c.id = comite_id
          AND (c.empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    ));

-- sst_comite_acta
DROP POLICY IF EXISTS sst_comite_acta_all_policy ON public.sst_comite_acta;
CREATE POLICY sst_comite_acta_all_policy ON public.sst_comite_acta
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sst_comite c
        WHERE c.id = comite_id
          AND (c.empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sst_comite c
        WHERE c.id = comite_id
          AND (c.empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    ));

-- sst_comite_acta_asistente
DROP POLICY IF EXISTS sst_comite_acta_asistente_all_policy ON public.sst_comite_acta_asistente;
CREATE POLICY sst_comite_acta_asistente_all_policy ON public.sst_comite_acta_asistente
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.sst_comite_acta a
        JOIN public.sst_comite c ON c.id = a.comite_id
        WHERE a.id = acta_id
          AND (c.empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.sst_comite_acta a
        JOIN public.sst_comite c ON c.id = a.comite_id
        WHERE a.id = acta_id
          AND (c.empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    ));

-- matriz_responsabilidades_sst
DROP POLICY IF EXISTS matriz_raci_all_policy ON public.matriz_responsabilidades_sst;
CREATE POLICY matriz_raci_all_policy ON public.matriz_responsabilidades_sst
    FOR ALL TO authenticated
    USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
    WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

-- Otorgar permisos a authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_recurso TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_comite TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_comite_miembro TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_comite_acta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sst_comite_acta_asistente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matriz_responsabilidades_sst TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. BUCKET DE STORAGE PARA ACTAS
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('sst-actas', 'sst-actas', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS sst_actas_storage_select ON storage.objects;
CREATE POLICY sst_actas_storage_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'sst-actas');

DROP POLICY IF EXISTS sst_actas_storage_insert ON storage.objects;
CREATE POLICY sst_actas_storage_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'sst-actas');

DROP POLICY IF EXISTS sst_actas_storage_update ON storage.objects;
CREATE POLICY sst_actas_storage_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'sst-actas')
    WITH CHECK (bucket_id = 'sst-actas');

DROP POLICY IF EXISTS sst_actas_storage_delete ON storage.objects;
CREATE POLICY sst_actas_storage_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'sst-actas');

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. COMENTARIOS TÉCNICOS
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.sst_recurso IS 'Registro de recursos humanos, financieros, tecnológicos y físicos asignados al SG-SST (Res. 0312/19 Estándar 1.1.1).';
COMMENT ON TABLE public.sst_comite IS 'Tabla unificada para COPASST, Comité de Convivencia Laboral, Brigada de Emergencia y otros comités.';
COMMENT ON TABLE public.sst_comite_miembro IS 'Integrantes asignados a comités, vinculados por trabajador_id sin duplicación de datos de personal.';
COMMENT ON TABLE public.sst_comite_acta IS 'Actas periódicas de comités (COPASST mensual, CCL y Brigada trimestrales).';
COMMENT ON TABLE public.matriz_responsabilidades_sst IS 'Matriz RACI de asignación y rendición de cuentas del SG-SST (Dec. 1072/15 art. 2.2.4.6.8).';
