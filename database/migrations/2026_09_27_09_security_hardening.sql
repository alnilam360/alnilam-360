-- ==============================================================================
-- MIGRACIÓN DE ENDURECIMIENTO DE SEGURIDAD Y RENDIMIENTO (SECURITY HARDENING)
-- Proyecto: Alnilam 360
-- Fecha: 2026-09-27
-- Objetivo:
--   1. Eliminar políticas temporales abiertas (temp_open_*)
--   2. Proteger funciones SECURITY DEFINER contra invocaciones anónimas o indebidas
--   3. Implementar políticas RLS robustas multi-tenant con soporte para Administradores
--   4. Crear índices faltantes en claves foráneas para optimización de consultas
-- ==============================================================================

-- 1. Helper Function: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    LEFT JOIN public.roles r ON u.rol_id = r.id
    WHERE u.auth_id = (SELECT auth.uid())
      AND (
        UPPER(COALESCE(r.nombre, u.rol, '')) IN ('ADMINISTRADOR', 'ADMIN', 'SUPER ADMIN', 'SUPERADMIN')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;

-- 2. Asegurar search_path seguro en funciones
ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public, pg_temp;

-- 3. Blindaje de función RPC eliminar_usuario
CREATE OR REPLACE FUNCTION public.eliminar_usuario(p_usuario_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_auth_id UUID;
    v_email TEXT;
BEGIN
    -- Validar autenticación
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autorizado: se requiere una sesión activa para ejecutar esta acción.';
    END IF;

    -- Validar privilegios de administrador
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permiso denegado: solo los usuarios administradores pueden eliminar cuentas de usuario.';
    END IF;

    SELECT auth_id, email INTO v_auth_id, v_email
    FROM public.usuarios
    WHERE id = p_usuario_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado en public.usuarios');
    END IF;

    -- Prevenir auto-eliminación accidental de la cuenta en uso
    IF v_auth_id = auth.uid() THEN
        RAISE EXCEPTION 'Operación denegada: no es posible eliminar la propia cuenta en sesión.';
    END IF;

    -- Si no tenía auth_id pero tenía email registrado
    IF v_auth_id IS NULL AND v_email IS NOT NULL THEN
        SELECT id INTO v_auth_id FROM auth.users WHERE LOWER(email) = LOWER(v_email) LIMIT 1;
    END IF;

    -- Borrar de public.usuarios
    DELETE FROM public.usuarios WHERE id = p_usuario_id;

    -- Garantizar borrado explícito de auth.users
    IF v_auth_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = v_auth_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'usuario_id', p_usuario_id,
        'auth_id', v_auth_id
    );
END;
$$;

-- Restringir permisos de ejecución de funciones sensibles
REVOKE EXECUTE ON FUNCTION public.eliminar_usuario(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_usuario(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.trg_sync_delete_usuario_auth() FROM PUBLIC, anon, authenticated;

-- 4. ELIMINAR TODAS LAS POLÍTICAS TEMPORALES ABIERTAS
DROP POLICY IF EXISTS "temp_open_empresas" ON public.empresas;
DROP POLICY IF EXISTS "temp_open_usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "temp_open_sedes" ON public.sedes;
DROP POLICY IF EXISTS "temp_open_usuarios_sedes" ON public.usuarios_sedes;
DROP POLICY IF EXISTS "temp_open_roles" ON public.roles;
DROP POLICY IF EXISTS "temp_open_roles_permisos" ON public.roles_permisos;
DROP POLICY IF EXISTS "temp_open_trabajadores" ON public.trabajadores;
DROP POLICY IF EXISTS "temp_open_ind_planes" ON public.indicadores_analisis_planes;
DROP POLICY IF EXISTS "temp_open_el_casos" ON public.indicadores_el_casos;
DROP POLICY IF EXISTS "temp_open_incap" ON public.indicadores_incapacidades;

-- 5. POLÍTICAS RLS ROBUSTAS MULTI-TENANT

-- EMPRESAS
DROP POLICY IF EXISTS "empresas_select" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete" ON public.empresas;

CREATE POLICY "empresas_select_secure" ON public.empresas
  FOR SELECT TO authenticated
  USING (id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "empresas_insert_secure" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "empresas_update_secure" ON public.empresas
  FOR UPDATE TO authenticated
  USING (id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
  WITH CHECK (id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "empresas_delete_secure" ON public.empresas
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- USUARIOS
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;

CREATE POLICY "usuarios_select_secure" ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    auth_id = (SELECT auth.uid())
    OR empresa_id = (SELECT public.get_my_empresa_id())
    OR (SELECT public.is_admin())
  );

CREATE POLICY "usuarios_insert_secure" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (
    (empresa_id = (SELECT public.get_my_empresa_id()) AND (SELECT public.is_admin()))
    OR (SELECT public.is_admin())
  );

CREATE POLICY "usuarios_update_secure" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (
    auth_id = (SELECT auth.uid())
    OR (empresa_id = (SELECT public.get_my_empresa_id()) AND (SELECT public.is_admin()))
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    auth_id = (SELECT auth.uid())
    OR (empresa_id = (SELECT public.get_my_empresa_id()) AND (SELECT public.is_admin()))
    OR (SELECT public.is_admin())
  );

CREATE POLICY "usuarios_delete_secure" ON public.usuarios
  FOR DELETE TO authenticated
  USING (
    (empresa_id = (SELECT public.get_my_empresa_id()) AND (SELECT public.is_admin()))
    OR (SELECT public.is_admin())
  );

-- SEDES
DROP POLICY IF EXISTS "sedes_select" ON public.sedes;
DROP POLICY IF EXISTS "sedes_insert" ON public.sedes;
DROP POLICY IF EXISTS "sedes_update" ON public.sedes;
DROP POLICY IF EXISTS "sedes_delete" ON public.sedes;

CREATE POLICY "sedes_select_secure" ON public.sedes
  FOR SELECT TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "sedes_insert_secure" ON public.sedes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "sedes_update_secure" ON public.sedes
  FOR UPDATE TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
  WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "sedes_delete_secure" ON public.sedes
  FOR DELETE TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

-- USUARIOS_SEDES
DROP POLICY IF EXISTS "usuarios_sedes_select" ON public.usuarios_sedes;
DROP POLICY IF EXISTS "usuarios_sedes_all" ON public.usuarios_sedes;

CREATE POLICY "usuarios_sedes_select_secure" ON public.usuarios_sedes
  FOR SELECT TO authenticated
  USING (
    usuario_id IN (
      SELECT id FROM public.usuarios
      WHERE empresa_id = (SELECT public.get_my_empresa_id())
         OR auth_id = (SELECT auth.uid())
         OR (SELECT public.is_admin())
    )
  );

CREATE POLICY "usuarios_sedes_modify_secure" ON public.usuarios_sedes
  FOR ALL TO authenticated
  USING (
    usuario_id IN (
      SELECT id FROM public.usuarios
      WHERE empresa_id = (SELECT public.get_my_empresa_id())
         OR (SELECT public.is_admin())
    )
  )
  WITH CHECK (
    usuario_id IN (
      SELECT id FROM public.usuarios
      WHERE empresa_id = (SELECT public.get_my_empresa_id())
         OR (SELECT public.is_admin())
    )
  );

-- ROLES Y ROLES_PERMISOS
DROP POLICY IF EXISTS "roles_select" ON public.roles;
DROP POLICY IF EXISTS "roles_all" ON public.roles;
DROP POLICY IF EXISTS "roles_permisos_select" ON public.roles_permisos;
DROP POLICY IF EXISTS "roles_permisos_all" ON public.roles_permisos;

CREATE POLICY "roles_select_secure" ON public.roles
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "roles_modify_secure" ON public.roles
  FOR ALL TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
  WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "roles_permisos_select_secure" ON public.roles_permisos
  FOR SELECT TO authenticated
  USING (
    rol_id IN (
      SELECT id FROM public.roles
      WHERE empresa_id IS NULL OR empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin())
    )
  );

CREATE POLICY "roles_permisos_modify_secure" ON public.roles_permisos
  FOR ALL TO authenticated
  USING (
    rol_id IN (
      SELECT id FROM public.roles
      WHERE empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin())
    )
  )
  WITH CHECK (
    rol_id IN (
      SELECT id FROM public.roles
      WHERE empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin())
    )
  );

-- TRABAJADORES
DROP POLICY IF EXISTS "trabajadores_all" ON public.trabajadores;

CREATE POLICY "trabajadores_select_secure" ON public.trabajadores
  FOR SELECT TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "trabajadores_modify_secure" ON public.trabajadores
  FOR ALL TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
  WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

-- INDICADORES: ANÁLISIS PLANES, CASOS EL, INCAPACIDADES
CREATE POLICY "ind_planes_select_secure" ON public.indicadores_analisis_planes
  FOR SELECT TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "ind_planes_modify_secure" ON public.indicadores_analisis_planes
  FOR ALL TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
  WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "el_casos_select_secure" ON public.indicadores_el_casos
  FOR SELECT TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "el_casos_modify_secure" ON public.indicadores_el_casos
  FOR ALL TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
  WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "incap_select_secure" ON public.indicadores_incapacidades
  FOR SELECT TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

CREATE POLICY "incap_modify_secure" ON public.indicadores_incapacidades
  FOR ALL TO authenticated
  USING (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()))
  WITH CHECK (empresa_id = (SELECT public.get_my_empresa_id()) OR (SELECT public.is_admin()));

-- 6. ÍNDICES CUBRIENTES PARA CLAVES FORÁNEAS (OPTIMIZACIÓN DE PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_fk_indicadores_el_casos_sede ON public.indicadores_el_casos(sede_id);
CREATE INDEX IF NOT EXISTS idx_fk_indicadores_incapacidades_sede ON public.indicadores_incapacidades(sede_id);
CREATE INDEX IF NOT EXISTS idx_fk_matriz_at_casos_sede ON public.matriz_at_casos(sede_id);
CREATE INDEX IF NOT EXISTS idx_fk_matriz_at_casos_agente ON public.matriz_at_casos(agente_id);
CREATE INDEX IF NOT EXISTS idx_fk_matriz_at_casos_mecanismo ON public.matriz_at_casos(mecanismo_id);
CREATE INDEX IF NOT EXISTS idx_fk_matriz_at_casos_parte_cuerpo ON public.matriz_at_casos(parte_cuerpo_id);
CREATE INDEX IF NOT EXISTS idx_fk_matriz_at_casos_peligro ON public.matriz_at_casos(peligro_id);
CREATE INDEX IF NOT EXISTS idx_fk_matriz_at_casos_sitio ON public.matriz_at_casos(sitio_ocurrencia_id);
CREATE INDEX IF NOT EXISTS idx_fk_matriz_at_casos_tipo_lesion ON public.matriz_at_casos(tipo_lesion_id);
CREATE INDEX IF NOT EXISTS idx_fk_usuarios_rol ON public.usuarios(rol_id);
CREATE INDEX IF NOT EXISTS idx_fk_usuarios_sedes_sede ON public.usuarios_sedes(sede_id);
