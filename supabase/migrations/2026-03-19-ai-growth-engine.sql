-- Autonomous AI Growth Engine for EM Records
-- Extends the current platform with scalable content, publishing, learning, and ingestion modules.

create extension if not exists pgcrypto;

do $$
begin
  begin
    alter type public.hub_role add value if not exists 'owner';
  exception
    when duplicate_object then null;
  end;

  begin
    alter type public.hub_role add value if not exists 'developer';
  exception
    when duplicate_object then null;
  end;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('developer', 'owner', 'admin', 'staff', 'artist'));
end
$$;

alter table if exists public.artists
  add column if not exists stage_name text,
  add column if not exists genre text,
  add column if not exists active boolean not null default true;

alter table if exists public.artist_profiles
  add column if not exists artist_id uuid references public.artists(id) on delete set null,
  add column if not exists instagram text,
  add column if not exists tiktok text,
  add column if not exists youtube_channel text,
  add column if not exists spotify_url text;

create unique index if not exists artist_profiles_artist_id_unique_idx
  on public.artist_profiles (artist_id)
  where artist_id is not null;

create or replace function public.has_growth_role(target_roles text[])
returns boolean
language sql
stable
as $$
  select
    coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = any(target_roles)
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = any(target_roles)
    );
$$;

create or replace function public.can_access_growth_admin()
returns boolean
language sql
stable
as $$
  select public.has_growth_role(array['developer', 'owner', 'admin']);
$$;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'youtube_shorts', 'x')),
  account_label text,
  account_identifier text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_queue (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  content_type text not null check (content_type in ('song', 'video', 'reel', 'artist_story', 'news', 'promo', 'viral')),
  title text,
  hook text,
  caption text not null default '',
  hashtags text[] not null default '{}',
  media_url text,
  video_data jsonb not null default '{}'::jsonb,
  image_prompt text,
  video_prompt text,
  overlay_text text,
  platform_targets jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'posted', 'failed', 'ready_for_manual')),
  approval_state text not null default 'pending' check (approval_state in ('pending', 'approved', 'rejected')),
  scheduled_at timestamptz,
  published_at timestamptz,
  queue_position integer not null default 1000,
  ai_generated boolean not null default true,
  ready_for_manual boolean not null default false,
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_settings (
  id text primary key default 'default' check (id = 'default'),
  enabled boolean not null default true,
  posts_per_day integer not null default 4 check (posts_per_day between 1 and 20),
  platforms_enabled jsonb not null default '["instagram","facebook","tiktok","youtube_shorts","x"]'::jsonb,
  content_mix jsonb not null default '{"song": 0.3, "reel": 0.25, "artist_story": 0.15, "promo": 0.15, "viral": 0.15}'::jsonb,
  tone text not null default 'urban latino',
  language text not null default 'es',
  best_posting_windows jsonb not null default '[]'::jsonb,
  learning_applied_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.automation_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.artist_assets (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  type text not null check (type in ('image', 'video', 'cover', 'logo', 'document', 'other')),
  url text not null,
  source text not null check (source in ('supabase_storage', 'google_drive', 'media_assets', 'manual', 'youtube', 'spotify', 'generated')),
  source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_content_cache (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  type text not null check (type in ('release', 'track', 'video', 'short', 'asset', 'story')),
  title text not null,
  url text,
  thumbnail text,
  metadata jsonb not null default '{}'::jsonb,
  last_synced timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viral_content_pool (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  content_url text not null,
  caption text,
  performance_score numeric(10,4) not null default 0,
  reusable boolean not null default true,
  repurposed_caption text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_analytics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_queue(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'youtube_shorts', 'x')),
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  views integer not null default 0,
  engagement_rate numeric(10,4) not null default 0,
  snapshot_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_memory (
  id uuid primary key default gen_random_uuid(),
  pattern text not null,
  confidence_score numeric(10,4) not null default 0,
  pattern_type text not null default 'insight',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null default 'manual',
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

drop trigger if exists set_social_accounts_updated_at on public.social_accounts;
create trigger set_social_accounts_updated_at
before update on public.social_accounts
for each row
execute function public.handle_updated_at();

drop trigger if exists set_content_queue_updated_at on public.content_queue;
create trigger set_content_queue_updated_at
before update on public.content_queue
for each row
execute function public.handle_updated_at();

drop trigger if exists set_automation_settings_updated_at on public.automation_settings;
create trigger set_automation_settings_updated_at
before update on public.automation_settings
for each row
execute function public.handle_updated_at();

drop trigger if exists set_artist_assets_updated_at on public.artist_assets;
create trigger set_artist_assets_updated_at
before update on public.artist_assets
for each row
execute function public.handle_updated_at();

drop trigger if exists set_artist_content_cache_updated_at on public.artist_content_cache;
create trigger set_artist_content_cache_updated_at
before update on public.artist_content_cache
for each row
execute function public.handle_updated_at();

drop trigger if exists set_viral_content_pool_updated_at on public.viral_content_pool;
create trigger set_viral_content_pool_updated_at
before update on public.viral_content_pool
for each row
execute function public.handle_updated_at();

drop trigger if exists set_learning_memory_updated_at on public.learning_memory;
create trigger set_learning_memory_updated_at
before update on public.learning_memory
for each row
execute function public.handle_updated_at();

create unique index if not exists social_accounts_platform_identifier_unique_idx
  on public.social_accounts (platform, coalesce(account_identifier, 'default'));
create index if not exists social_accounts_active_idx
  on public.social_accounts (active, platform);

create index if not exists content_queue_status_schedule_idx
  on public.content_queue (status, scheduled_at nulls first, queue_position, created_at);
create index if not exists content_queue_artist_idx
  on public.content_queue (artist_id, created_at desc);
create index if not exists content_queue_type_idx
  on public.content_queue (content_type, created_at desc);

create index if not exists artist_assets_artist_idx
  on public.artist_assets (artist_id, created_at desc);
create unique index if not exists artist_assets_artist_url_unique_idx
  on public.artist_assets (artist_id, url);

create index if not exists artist_content_cache_artist_type_idx
  on public.artist_content_cache (artist_id, type, last_synced desc);
create unique index if not exists artist_content_cache_artist_type_title_url_unique_idx
  on public.artist_content_cache (artist_id, type, title, url);

create index if not exists viral_content_pool_reusable_score_idx
  on public.viral_content_pool (reusable, performance_score desc, created_at desc);

create index if not exists post_analytics_content_platform_idx
  on public.post_analytics (content_id, platform, snapshot_at desc);
create index if not exists post_analytics_snapshot_idx
  on public.post_analytics (snapshot_at desc);

create index if not exists learning_memory_confidence_idx
  on public.learning_memory (confidence_score desc, created_at desc);

create index if not exists automation_runs_started_idx
  on public.automation_runs (started_at desc);

alter table public.social_accounts enable row level security;
alter table public.content_queue enable row level security;
alter table public.automation_settings enable row level security;
alter table public.artist_assets enable row level security;
alter table public.artist_content_cache enable row level security;
alter table public.viral_content_pool enable row level security;
alter table public.post_analytics enable row level security;
alter table public.learning_memory enable row level security;
alter table public.automation_runs enable row level security;

drop policy if exists "social_accounts growth admin manage" on public.social_accounts;
create policy "social_accounts growth admin manage"
on public.social_accounts
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "content_queue growth admin manage" on public.content_queue;
create policy "content_queue growth admin manage"
on public.content_queue
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "automation_settings growth admin manage" on public.automation_settings;
create policy "automation_settings growth admin manage"
on public.automation_settings
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "artist_assets growth admin manage" on public.artist_assets;
create policy "artist_assets growth admin manage"
on public.artist_assets
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "artist_content_cache growth admin manage" on public.artist_content_cache;
create policy "artist_content_cache growth admin manage"
on public.artist_content_cache
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "viral_content_pool growth admin manage" on public.viral_content_pool;
create policy "viral_content_pool growth admin manage"
on public.viral_content_pool
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "post_analytics growth admin manage" on public.post_analytics;
create policy "post_analytics growth admin manage"
on public.post_analytics
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "learning_memory growth admin manage" on public.learning_memory;
create policy "learning_memory growth admin manage"
on public.learning_memory
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "automation_runs growth admin manage" on public.automation_runs;
create policy "automation_runs growth admin manage"
on public.automation_runs
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');
