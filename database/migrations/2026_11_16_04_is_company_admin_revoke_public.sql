-- Corrige 2026_11_16_03: is_company_admin() tenía EXECUTE a PUBLIC (anon lo heredaba).
-- Revoca de PUBLIC para igualar a is_admin() y cerrar el advisor anon_security_definer.
revoke execute on function public.is_company_admin() from public;
