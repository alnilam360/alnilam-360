-- Migración: Sincronización y remediación de eliminación de usuarios entre public.usuarios y auth.users
-- Fecha: 2026-09-27

-- 1. Función Trigger para sincronizar la eliminación de public.usuarios con auth.users
CREATE OR REPLACE FUNCTION public.trg_sync_delete_usuario_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_auth_id UUID;
BEGIN
    v_auth_id := OLD.auth_id;

    -- Si no tenía auth_id registrado, intentar buscar por email en auth.users
    IF v_auth_id IS NULL AND OLD.email IS NOT NULL THEN
        SELECT id INTO v_auth_id FROM auth.users WHERE LOWER(email) = LOWER(OLD.email) LIMIT 1;
    END IF;

    -- Si se localizó el auth_id, eliminar el usuario de auth.users
    -- Las tablas auth.identities, auth.sessions, auth.mfa_factors se eliminan en CASCADE por constraints de Supabase
    IF v_auth_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = v_auth_id;
    END IF;

    RETURN OLD;
END;
$$;

-- 2. Trigger AFTER DELETE en public.usuarios
DROP TRIGGER IF EXISTS trg_usuarios_sync_auth_delete ON public.usuarios;
CREATE TRIGGER trg_usuarios_sync_auth_delete
AFTER DELETE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_delete_usuario_auth();

-- 3. Función RPC explícita para eliminar un usuario completamente
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
    SELECT auth_id, email INTO v_auth_id, v_email
    FROM public.usuarios
    WHERE id = p_usuario_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuario no encontrado en public.usuarios');
    END IF;

    -- Si no tenía auth_id pero tenía email registrado
    IF v_auth_id IS NULL AND v_email IS NOT NULL THEN
        SELECT id INTO v_auth_id FROM auth.users WHERE LOWER(email) = LOWER(v_email) LIMIT 1;
    END IF;

    -- Borrar de public.usuarios (el trigger trg_usuarios_sync_auth_delete también actuará)
    DELETE FROM public.usuarios WHERE id = p_usuario_id;

    -- Garantizar borrado explícito de auth.users si aún existiera
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

-- Conceder permisos de ejecución a authenticated y service_role
GRANT EXECUTE ON FUNCTION public.eliminar_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_usuario(UUID) TO service_role;

-- 4. Remediación inmediata: Limpiar cuentas huérfanas en auth.users que ya no existen en public.usuarios
DELETE FROM auth.users
WHERE id NOT IN (SELECT auth_id FROM public.usuarios WHERE auth_id IS NOT NULL)
  AND email NOT IN (SELECT email FROM public.usuarios WHERE email IS NOT NULL);
