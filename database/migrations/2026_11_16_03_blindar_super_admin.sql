-- Endurecimiento del modelo super-admin (sigue a 2026_11_16_02).
-- 1) is_company_admin() deja de ser ejecutable por anon (iguala a is_admin()).
-- 2) eliminar_usuario: un admin de empresa no puede eliminar a un super-admin.

-- Bloque 1: quitar EXECUTE de anon sobre is_company_admin() (inofensivo pero limpia advisor)
revoke execute on function public.is_company_admin() from anon;

-- Bloque 2: eliminar_usuario — añade protección: solo un super-admin puede eliminar a otro super-admin.
-- (cuerpo completo = el de la 02 + un bloque nuevo tras el gate fino de empresa)
create or replace function public.eliminar_usuario(p_usuario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
    v_auth_id uuid;
    v_email text;
    v_empresa_id uuid;
begin
    if auth.uid() is null then
        raise exception 'No autorizado: se requiere una sesión activa para ejecutar esta acción.';
    end if;

    -- gate grueso: solo admins (super o de empresa); evita filtrar existencia de ids a no-admins
    if not (public.is_admin() or public.is_company_admin()) then
        raise exception 'Permiso denegado: solo los usuarios administradores pueden eliminar cuentas de usuario.';
    end if;

    select auth_id, email, empresa_id into v_auth_id, v_email, v_empresa_id
    from public.usuarios
    where id = p_usuario_id;

    if not found then
        return jsonb_build_object('success', false, 'message', 'Usuario no encontrado en public.usuarios');
    end if;

    -- gate fino: admin de empresa solo elimina usuarios de SU empresa; super-admin sin restricción
    if not public.is_admin() and v_empresa_id is distinct from public.get_my_empresa_id() then
        raise exception 'Permiso denegado: solo puede eliminar usuarios de su propia empresa.';
    end if;

    -- blindaje: un admin de empresa no puede eliminar a un super-admin; solo otro super-admin
    if not public.is_admin() and exists (
        select 1 from public.super_admins sa where sa.auth_id = v_auth_id
    ) then
        raise exception 'Permiso denegado: no puede eliminar a un super-admin.';
    end if;

    if v_auth_id = auth.uid() then
        raise exception 'Operación denegada: no es posible eliminar la propia cuenta en sesión.';
    end if;

    if v_auth_id is null and v_email is not null then
        select id into v_auth_id from auth.users where lower(email) = lower(v_email) limit 1;
    end if;

    delete from public.usuarios where id = p_usuario_id;

    if v_auth_id is not null then
        delete from auth.users where id = v_auth_id;
    end if;

    return jsonb_build_object(
        'success', true,
        'usuario_id', p_usuario_id,
        'auth_id', v_auth_id
    );
end;
$function$;
