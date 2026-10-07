create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text,
  locale text,
  referrer text,
  user_agent text,
  ip text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists site_events_created_at_idx on public.site_events(created_at desc);
create index if not exists site_events_event_name_idx on public.site_events(event_name, created_at desc);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_links_sort_idx on public.social_links(sort_order, created_at);

create table if not exists public.press_kit_downloads (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  kind text not null check (kind in ('press_kit','media_kit')),
  file_url text not null,
  ip text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists press_kit_downloads_artist_idx on public.press_kit_downloads(artist_id, created_at desc);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  excerpt text,
  hero_url text,
  cover_url text,
  content text,
  content_status text not null default 'draft' check (content_status in ('draft','scheduled','published')),
  publish_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_published_idx on public.blog_posts(published_at desc);

alter table public.site_events enable row level security;
alter table public.social_links enable row level security;
alter table public.press_kit_downloads enable row level security;
alter table public.blog_posts enable row level security;

revoke all on public.site_events from anon, authenticated;
revoke all on public.social_links from anon, authenticated;
revoke all on public.press_kit_downloads from anon, authenticated;
revoke all on public.blog_posts from anon, authenticated;

grant select, insert, update, delete on public.site_events to service_role;
grant select, insert, update, delete on public.social_links to service_role;
grant select, insert, update, delete on public.press_kit_downloads to service_role;
grant select, insert, update, delete on public.blog_posts to service_role;

drop policy if exists "site events deny client access" on public.site_events;
create policy "site events deny client access" on public.site_events for all to anon, authenticated using (false) with check (false);
drop policy if exists "social links deny client access" on public.social_links;
create policy "social links deny client access" on public.social_links for all to anon, authenticated using (false) with check (false);
drop policy if exists "press kit downloads deny client access" on public.press_kit_downloads;
create policy "press kit downloads deny client access" on public.press_kit_downloads for all to anon, authenticated using (false) with check (false);
drop policy if exists "blog posts deny client access" on public.blog_posts;
create policy "blog posts deny client access" on public.blog_posts for all to anon, authenticated using (false) with check (false);
