create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text,
  locale text,
  referrer text,
  user_agent text,
  ip text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.site_events enable row level security;

drop policy if exists "site events public insert" on public.site_events;
create policy "site events public insert"
on public.site_events
for insert
with check (true);

drop policy if exists "site events admin read" on public.site_events;
create policy "site events admin read"
on public.site_events
for select
using (public.is_admin());
