create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists social_links_url_key on public.social_links (url);

drop trigger if exists set_social_links_updated_at on public.social_links;
create trigger set_social_links_updated_at
before update on public.social_links
for each row
execute function public.handle_updated_at();

alter table public.social_links enable row level security;

drop policy if exists "social links public read" on public.social_links;
create policy "social links public read"
on public.social_links
for select
using (true);

drop policy if exists "social links admin manage" on public.social_links;
create policy "social links admin manage"
on public.social_links
for all
using (public.is_admin())
with check (public.is_admin());

insert into public.social_links (label, url, sort_order, is_active)
values
  ('Instagram', 'https://www.instagram.com/emrecordsllc', 1, true),
  ('YouTube', 'https://www.youtube.com/@emrecordsllc', 2, true),
  ('Facebook', 'https://www.facebook.com/emrecords020288', 3, true)
on conflict (url) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
