-- Plan 11 F1: Investigación AT/EL (Res. 1401/2007). Aditivo e idempotente.
-- Plazos: investigar <= 15 días calendario desde el evento. Grave/mortal: además remitir a ARL <= 15 días.

-- Forma: [{trabajador_id?: uuid, nombre: text, rol: text, fuente: 'copasst'|'sst'|'manual'}]
ALTER TABLE public.matriz_at_investigacion
    ADD COLUMN IF NOT EXISTS equipo_investigador jsonb NOT NULL DEFAULT '[]'::jsonb;

-- jerarquia (art. 12): fuente > medio > individuo.
ALTER TABLE public.matriz_at_acciones
    ADD COLUMN IF NOT EXISTS jerarquia text,
    ADD COLUMN IF NOT EXISTS eficacia_verificada boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS fecha_verificacion date;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_matriz_at_acciones_jerarquia') THEN
        ALTER TABLE public.matriz_at_acciones
            ADD CONSTRAINT chk_matriz_at_acciones_jerarquia
            CHECK (jerarquia IS NULL OR jerarquia IN ('fuente', 'medio', 'individuo'));
    END IF;
END $$;

-- Una fila por AT de la empresa. Empresa ajena y no admin => 0 filas (fail-closed, sin error).
CREATE OR REPLACE FUNCTION public.get_investigaciones_pendientes(p_empresa_id uuid)
RETURNS TABLE (
    caso_id uuid,
    trabajador_nombre text,
    fecha_hora_evento timestamptz,
    tipo_evento text,
    clasificacion_gravedad text,
    causo_muerte boolean,
    es_grave_o_mortal boolean,
    dias_transcurridos int,
    estado_investigar text,
    estado_remitir_arl text,
    tiene_accion_valida boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        c.id, c.trabajador_nombre, c.fecha_hora_evento, c.tipo_evento,
        c.clasificacion_gravedad, c.causo_muerte,
        g.v,
        d.v,
        CASE WHEN EXISTS (SELECT 1 FROM matriz_at_investigacion i WHERE i.caso_id = c.id) THEN 'completa'
             WHEN d.v <= 15 THEN 'en_plazo' ELSE 'fuera_de_plazo' END,
        CASE WHEN NOT g.v THEN NULL
             WHEN c.reportado_arl THEN 'completa'
             WHEN d.v <= 15 THEN 'en_plazo' ELSE 'fuera_de_plazo' END,
        EXISTS (SELECT 1 FROM matriz_at_acciones a
                WHERE a.caso_id = c.id
                  AND (a.responsable_id IS NOT NULL OR a.responsable_texto IS NOT NULL)
                  AND a.fecha_compromiso IS NOT NULL)
    FROM matriz_at_casos c
    CROSS JOIN LATERAL (SELECT (current_date - c.fecha_hora_evento::date)::int AS v) d
    CROSS JOIN LATERAL (SELECT (c.causo_muerte OR c.clasificacion_gravedad IN ('grave', 'mortal')) AS v) g
    WHERE c.empresa_id = p_empresa_id
      AND c.tipo_evento = 'accidente_trabajo'
      AND (p_empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
    ORDER BY c.fecha_hora_evento DESC;
$$;

-- Solo COPASST activo: el esquema no identifica al "encargado SST" ni guarda licencia SO.
CREATE OR REPLACE FUNCTION public.sugerir_equipo_investigador(p_empresa_id uuid)
RETURNS TABLE (trabajador_id uuid, nombre text, rol text, fuente text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT t.id, t.nombre, m.rol_en_comite, 'copasst'::text
    FROM sst_comite k
    JOIN sst_comite_miembro m ON m.comite_id = k.id AND m.activo
    JOIN trabajadores t ON t.id = m.trabajador_id
    WHERE k.empresa_id = p_empresa_id
      AND k.tipo_comite = 'COPASST'
      AND k.estado = 'vigente'
      AND (p_empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin()))
    ORDER BY t.nombre;
$$;

REVOKE ALL ON FUNCTION public.get_investigaciones_pendientes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_investigaciones_pendientes(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.sugerir_equipo_investigador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sugerir_equipo_investigador(uuid) TO authenticated;

-- VECTOR DE PRUEBA (documentación; NO ejecutar). Con empresa E y usuario de E:
--  INSERT INTO matriz_at_casos (empresa_id, tipo_evento, fecha_hora_evento, causo_muerte, reportado_arl, estado_caso, ...)
--  VALUES (E,'accidente_trabajo', now(),                      false,false,'reportado'),  -- A => en_plazo
--         (E,'accidente_trabajo', now()-interval '16 days',   false,false,'reportado'),  -- B => fuera_de_plazo
--         (E,'accidente_trabajo', now()-interval '16 days',   false,false,'en_investigacion'); -- C
--  INSERT INTO matriz_at_investigacion (caso_id, causas_inmediatas, causas_basicas) VALUES (<C>,'{}','{}'); -- C => completa
--  Un caso mortal de hace 16 días con reportado_arl=false => estado_remitir_arl='fuera_de_plazo'.
--  SELECT * FROM get_investigaciones_pendientes(E);       -- 3 filas: en_plazo, fuera_de_plazo, completa
--  SELECT * FROM get_investigaciones_pendientes(<otra>);  -- 0 filas (no admin)
