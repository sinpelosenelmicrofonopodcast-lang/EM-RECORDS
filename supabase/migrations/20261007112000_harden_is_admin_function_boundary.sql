-- Mirrors the live Supabase security hardening applied on 2026-10-07.
-- Keep the exposed helper SECURITY INVOKER and isolate privileged table reads
-- in a non-exposed schema.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_admin_internal(
  p_user_id uuid,
  p_app_role text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then false
    when coalesce(p_app_role, '') = 'admin' then true
    when exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and (
          coalesce(p.is_admin, false) = true
          or lower(coalesce(p.role, '')) = 'admin'
        )
    ) then true
    when exists (
      select 1
      from public.user_roles ur
      where ur.user_id = p_user_id
        and lower(coalesce(ur.role::text, '')) = 'admin'
    ) then true
    else false
  end
$$;

revoke execute on function private.is_admin_internal(uuid, text)
  from public, anon;
grant execute on function private.is_admin_internal(uuid, text)
  to authenticated, service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when auth.uid() is null then false
    else private.is_admin_internal(
      auth.uid(),
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
    )
  end
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin()
  to anon, authenticated, service_role;
