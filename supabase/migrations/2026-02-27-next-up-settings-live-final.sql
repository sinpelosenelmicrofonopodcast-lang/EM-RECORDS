create table if not exists public.next_up_settings (
  id text primary key default 'default' check (id = 'default'),
  live_final_at timestamptz,
  voting_enabled boolean not null default false,
  voting_starts_at timestamptz default '2026-03-13T00:00:00-05:00'::timestamptz,
  voting_ends_at timestamptz default '2026-04-03T23:59:59-05:00'::timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_next_up_settings_updated_at on public.next_up_settings;
create trigger set_next_up_settings_updated_at
before update on public.next_up_settings
for each row
execute function public.handle_updated_at();

alter table public.next_up_settings enable row level security;

drop policy if exists "next_up settings public read" on public.next_up_settings;
create policy "next_up settings public read"
on public.next_up_settings
for select
using (true);

drop policy if exists "next_up settings admin manage" on public.next_up_settings;
create policy "next_up settings admin manage"
on public.next_up_settings
for all
using (public.is_admin())
with check (public.is_admin());

insert into public.next_up_settings (id, live_final_at, voting_enabled, voting_starts_at, voting_ends_at)
values ('default', null, false, '2026-03-13T00:00:00-05:00'::timestamptz, '2026-04-03T23:59:59-05:00'::timestamptz)
on conflict (id) do update set
  voting_enabled = excluded.voting_enabled,
  voting_starts_at = excluded.voting_starts_at,
  voting_ends_at = excluded.voting_ends_at;
