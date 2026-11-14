-- Plan 12 F3: bucket de evidencias, RPC de cierre de verificación (dueña única del puntaje) y CHECK de hallazgo cerrado.
-- Idempotente.

-- 1) Storage: bucket privado + policies por empresa (primera carpeta del path = empresa_id). Molde: ml_docs_storage_*.
INSERT INTO storage.buckets (id, name, public)
VALUES ('verificaciones-evidencias', 'verificaciones-evidencias', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS verif_evid_storage_select ON storage.objects;
CREATE POLICY verif_evid_storage_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'verificaciones-evidencias'
           AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);

DROP POLICY IF EXISTS verif_evid_storage_insert ON storage.objects;
CREATE POLICY verif_evid_storage_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'verificaciones-evidencias'
                AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);

DROP POLICY IF EXISTS verif_evid_storage_update ON storage.objects;
CREATE POLICY verif_evid_storage_update ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'verificaciones-evidencias'
           AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text)
    WITH CHECK (bucket_id = 'verificaciones-evidencias'
                AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);

DROP POLICY IF EXISTS verif_evid_storage_delete ON storage.objects;
CREATE POLICY verif_evid_storage_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'verificaciones-evidencias'
           AND (storage.foldername(name))[1] = (SELECT get_my_empresa_id())::text);

-- 2) RPC cerrar_verificacion: cierre atómico + puntaje.
-- Fórmula: puntaje = round(100 * cumple / (cumple + no_cumple), 2); excluye no_aplica; NULL si no hay evaluables.
-- Vector: 8 cumple / 2 no_cumple / 5 no_aplica => 100*8/10 = 80.00.
CREATE OR REPLACE FUNCTION public.cerrar_verificacion(p_verif_id uuid)
RETURNS sst_verificacion
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total   integer;
    v_sin_resp integer;
    v_puntaje numeric(5,2);
    v_row     sst_verificacion;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sst_verificacion
        WHERE id = p_verif_id
          AND (empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
    ) THEN
        RAISE EXCEPTION 'Verificación no encontrada o sin acceso';
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE resultado IS NULL),
           round(100.0 * count(*) FILTER (WHERE resultado = 'cumple')
                 / NULLIF(count(*) FILTER (WHERE resultado IN ('cumple', 'no_cumple')), 0), 2)
      INTO v_total, v_sin_resp, v_puntaje
      FROM sst_verificacion_respuesta
     WHERE verificacion_id = p_verif_id;

    IF v_total = 0 THEN
        RAISE EXCEPTION 'La verificación no tiene ítems';
    END IF;
    IF v_sin_resp > 0 THEN
        RAISE EXCEPTION 'Faltan ítems por responder';
    END IF;

    UPDATE sst_verificacion
       SET estado = 'cerrada',
           fecha_ejecucion = COALESCE(fecha_ejecucion, current_date),
           puntaje = v_puntaje,
           updated_at = now()
     WHERE id = p_verif_id
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.cerrar_verificacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cerrar_verificacion(uuid) TO authenticated;

-- 3) Integridad: un hallazgo cerrado exige fecha_cierre.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_hallazgo_cierre') THEN
        ALTER TABLE public.sst_hallazgo
            ADD CONSTRAINT chk_hallazgo_cierre CHECK (estado <> 'cerrado' OR fecha_cierre IS NOT NULL);
    END IF;
END $$;
