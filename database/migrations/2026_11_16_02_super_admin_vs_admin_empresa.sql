-- Separa super-admin (multi-empresa) de admin-de-empresa via allowlist public.super_admins.
-- Cierra el bypass cross-tenant: is_admin() reconoce SOLO a quien esté en super_admins
-- (las policies con `OR is_admin()` no se tocan). Siembra super-admin a la cuenta plataforma.

-- Bloque 1: allowlist super-admins (raíz de confianza aislada, RLS fail-closed)
create table if not exists public.super_admins (
  auth_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.super_admins enable row level security;
revoke all on public.super_admins from anon, authenticated, public;
-- Sin policy de escritura para authenticated => nadie escribe desde el cliente (fail-closed).
-- is_admin() la lee por SECURITY DEFINER (owner), saltando RLS; no se otorga acceso directo.

-- Bloque 2: sembrar super-admin plataforma (moissj) por auth_id (idempotente)
insert into public.super_admins (auth_id)
select u.auth_id
from public.usuarios u
where lower(u.email) = 'moissj@gmail.com' and u.auth_id is not null
on conflict (auth_id) do nothing;

-- Bloque 3: is_admin() = existe en super_admins
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.super_admins sa
    where sa.auth_id = (select auth.uid())
  );
$$;

-- Bloque 4: is_company_admin() = admin dentro de su empresa (rol por-empresa con nombre admin)
create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.usuarios u
    left join public.roles r on r.id = u.rol_id
    where u.auth_id = (select auth.uid())
      and upper(coalesce(r.nombre, u.rol, '')) in ('ADMINISTRADOR','ADMIN')
  );
$$;

-- Bloque 5: eliminar_usuario — gate ahora super-admin O admin de la MISMA empresa.
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
