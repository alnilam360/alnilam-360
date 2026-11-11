-- ============================================================================
-- Migracion: Matriz Legal — documentos de cumplimiento (tabla + bucket privado).
-- periodo/periodicidad/numero_periodo NULL = documento general (historial);
-- con valores = documento de ese corte.
-- Convencion de ruta en Storage: {empresa_id}/{periodo}/{timestamp}_{archivo}
-- (el primer segmento DEBE ser empresa_id: lo exigen las policies del bucket).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.matriz_legal_documento (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id     UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    periodo        INTEGER NULL CHECK (periodo IS NULL OR periodo BETWEEN 2000 AND 2100),
    periodicidad   TEXT NULL CHECK (periodicidad IS NULL OR periodicidad IN ('MENSUAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
    numero_periodo SMALLINT NULL,
    nombre         TEXT NOT NULL,
    version        TEXT NULL,
    archivo_path   TEXT NOT NULL,
    archivo_nombre TEXT NOT NULL,
    mime_type      TEXT NULL,
    tamano_bytes   BIGINT NULL,
    fecha_revision DATE NULL,
    subido_por     UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_doc_empresa_periodo
    ON public.matriz_legal_documento(empresa_id, periodo);

DROP TRIGGER IF EXISTS trg_ml_doc_updated_at ON public.matriz_legal_documento;
CREATE TRIGGER trg_ml_doc_updated_at
    BEFORE UPDATE ON public.matriz_legal_documento
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.matriz_legal_documento ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='matriz_legal_documento' AND policyname='ml_doc_select') THEN
        CREATE POLICY ml_doc_select ON public.matriz_legal_documento
            FOR SELECT TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='matriz_legal_documento' AND policyname='ml_doc_insert') THEN
        CREATE POLICY ml_doc_insert ON public.matriz_legal_documento
            FOR INSERT TO authenticated
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='matriz_legal_documento' AND policyname='ml_doc_update') THEN
        CREATE POLICY ml_doc_update ON public.matriz_legal_documento
            FOR UPDATE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
            WITH CHECK (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='matriz_legal_documento' AND policyname='ml_doc_delete') THEN
        CREATE POLICY ml_doc_delete ON public.matriz_legal_documento
            FOR DELETE TO authenticated
            USING (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()));
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Storage: bucket privado + policies por empresa (carpeta raiz = empresa_id).
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('matriz-legal-docs', 'matriz-legal-docs', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ml_docs_storage_select') THEN
        CREATE POLICY ml_docs_storage_select ON storage.objects
            FOR SELECT TO authenticated
            USING (bucket_id = 'matriz-legal-docs'
                   AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ml_docs_storage_insert') THEN
        CREATE POLICY ml_docs_storage_insert ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'matriz-legal-docs'
                   AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ml_docs_storage_update') THEN
        CREATE POLICY ml_docs_storage_update ON storage.objects
            FOR UPDATE TO authenticated
            USING (bucket_id = 'matriz-legal-docs'
                   AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text)
            WITH CHECK (bucket_id = 'matriz-legal-docs'
                   AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ml_docs_storage_delete') THEN
        CREATE POLICY ml_docs_storage_delete ON storage.objects
            FOR DELETE TO authenticated
            USING (bucket_id = 'matriz-legal-docs'
                   AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);
    END IF;
END $$;
