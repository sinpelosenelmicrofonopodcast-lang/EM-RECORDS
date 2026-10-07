create table if not exists public.catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete cascade,
  trigger_type text not null default 'manual',
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  platforms jsonb not null default '{}'::jsonb,
  discovered_count integer not null default 0,
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  conflict_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists catalog_sync_runs_artist_started_idx on public.catalog_sync_runs(artist_id, started_at desc);

create table if not exists public.catalog_platform_items (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  platform text not null check (platform in ('spotify','apple_music','youtube')),
  item_type text not null check (item_type in ('release','track','video')),
  platform_id text not null,
  parent_platform_id text,
  title text not null,
  url text,
  artwork_url text,
  release_date date,
  isrc text,
  upc text,
  duration_ms integer,
  explicit boolean,
  raw jsonb not null default '{}'::jsonb,
  matched_release_id uuid references public.releases(id) on delete set null,
  matched_song_id uuid references public.songs(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  miss_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform,item_type,platform_id)
);
create index if not exists catalog_platform_items_artist_platform_idx on public.catalog_platform_items(artist_id, platform, item_type, active);
create index if not exists catalog_platform_items_isrc_idx on public.catalog_platform_items(isrc) where isrc is not null;
create index if not exists catalog_platform_items_upc_idx on public.catalog_platform_items(upc) where upc is not null;

create table if not exists public.catalog_sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  platform text not null check (platform in ('spotify','apple_music','youtube')),
  conflict_type text not null,
  reason text not null,
  external_item jsonb not null default '{}'::jsonb,
  candidate_ids jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open','resolved','ignored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists catalog_sync_conflicts_artist_status_idx on public.catalog_sync_conflicts(artist_id,status,created_at desc);

alter table public.artists
  add column if not exists last_catalog_sync_at timestamptz,
  add column if not exists last_catalog_sync_status text,
  add column if not exists last_catalog_sync_error text;

alter table public.catalog_sync_runs enable row level security;
alter table public.catalog_platform_items enable row level security;
alter table public.catalog_sync_conflicts enable row level security;

revoke all on public.catalog_sync_runs from anon, authenticated;
revoke all on public.catalog_platform_items from anon, authenticated;
revoke all on public.catalog_sync_conflicts from anon, authenticated;

grant select, insert, update, delete on public.catalog_sync_runs to service_role;
grant select, insert, update, delete on public.catalog_platform_items to service_role;
grant select, insert, update, delete on public.catalog_sync_conflicts to service_role;

drop policy if exists "catalog sync runs deny client access" on public.catalog_sync_runs;
create policy "catalog sync runs deny client access" on public.catalog_sync_runs for all to anon, authenticated using (false) with check (false);
drop policy if exists "catalog platform items deny client access" on public.catalog_platform_items;
create policy "catalog platform items deny client access" on public.catalog_platform_items for all to anon, authenticated using (false) with check (false);
drop policy if exists "catalog sync conflicts deny client access" on public.catalog_sync_conflicts;
create policy "catalog sync conflicts deny client access" on public.catalog_sync_conflicts for all to anon, authenticated using (false) with check (false);
