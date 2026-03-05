create table if not exists public.fan_wall_entries (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null,
  fan_name text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists fan_wall_entries_artist_status_idx on public.fan_wall_entries (artist_slug, status, created_at desc);

alter table public.fan_wall_entries enable row level security;

drop policy if exists "fan wall public approved read" on public.fan_wall_entries;
create policy "fan wall public approved read"
on public.fan_wall_entries
for select
using (status = 'approved' or public.is_admin());

drop policy if exists "fan wall public submit" on public.fan_wall_entries;
create policy "fan wall public submit"
on public.fan_wall_entries
for insert
with check (status = 'pending');

drop policy if exists "fan wall admin update" on public.fan_wall_entries;
create policy "fan wall admin update"
on public.fan_wall_entries
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "fan wall admin delete" on public.fan_wall_entries;
create policy "fan wall admin delete"
on public.fan_wall_entries
for delete
using (public.is_admin());
