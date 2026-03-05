-- Artist Hub MVP (EM Records)
-- Multi-tenant ACL by artist membership + admin overrides.

create extension if not exists pgcrypto;

-- =====================================================
-- ENUMS
-- =====================================================
do $$ begin
  create type public.hub_role as enum ('admin', 'artist', 'manager', 'booking', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.release_kind as enum ('single', 'ep', 'album');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.split_kind as enum ('master', 'publishing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.split_status as enum ('needs_info', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.registration_org as enum ('bmi', 'mlc', 'songtrust', 'soundexchange', 'distrokid', 'contentid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.registration_status as enum ('pending', 'needs_info', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.launch_status as enum ('draft', 'in_progress', 'ready', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.asset_type as enum ('photo', 'logo', 'cover', 'qr', 'template', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.asset_source as enum ('lightroom', 'upload', 'generated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_type as enum ('contract', 'splitsheet', 'invoice', 'license', 'epk', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_type as enum ('reel', 'post', 'story');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'submitted', 'approved', 'scheduled', 'published', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pr_status as enum ('new', 'in_review', 'accepted', 'scheduled', 'done', 'declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum ('new', 'in_review', 'negotiating', 'confirmed', 'done', 'declined');
exception when duplicate_object then null; end $$;

-- =====================================================
-- BASE TABLE EXTENSIONS (REUSE EXISTING)
-- =====================================================
alter table if exists public.artists
  add column if not exists stage_name text,
  add column if not exists bio_short text,
  add column if not exists bio_med text,
  add column if not exists bio_long text,
  add column if not exists primary_genre text,
  add column if not exists territory text,
  add column if not exists contacts jsonb not null default '{}'::jsonb,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists brand_kit jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'active';

alter table if exists public.releases
  add column if not exists artist_id uuid,
  add column if not exists release_type public.release_kind,
  add column if not exists upc text,
  add column if not exists distributor text,
  add column if not exists cover_asset_id uuid,
  add column if not exists smartlink_slug text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'releases_artist_id_fkey'
  ) then
    alter table public.releases
      add constraint releases_artist_id_fkey
      foreign key (artist_id)
      references public.artists(id)
      on update cascade
      on delete set null;
  end if;
end
$$;

update public.releases r
set artist_id = a.id
from public.artists a
where r.artist_id is null
  and (
    (r.artist_slug is not null and a.slug = r.artist_slug)
    or (r.artist_name is not null and lower(a.name) = lower(r.artist_name))
  );

update public.releases
set release_type = case lower(format)
  when 'ep' then 'ep'::public.release_kind
  when 'album' then 'album'::public.release_kind
  else 'single'::public.release_kind
end
where release_type is null;

alter table if exists public.releases
  alter column release_type set default 'single'::public.release_kind;

create unique index if not exists releases_smartlink_slug_key on public.releases (smartlink_slug) where smartlink_slug is not null;
create index if not exists releases_artist_id_idx on public.releases (artist_id);

-- =====================================================
-- ARTIST HUB CORE TABLES
-- =====================================================
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.hub_role not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.artist_members (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.hub_role not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (artist_id, user_id, role)
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  release_id uuid references public.releases(id) on delete set null,
  title text not null,
  alt_titles text[] not null default '{}',
  isrc text,
  iswc text,
  explicit boolean not null default false,
  language text,
  duration integer,
  bpm integer,
  key text,
  links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.splits (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  kind public.split_kind not null,
  splits jsonb not null default '[]'::jsonb,
  total_pct numeric(6,2) not null default 0,
  status public.split_status not null default 'needs_info',
  updated_at timestamptz not null default now(),
  unique (song_id, kind),
  constraint splits_total_pct_range check (total_pct >= 0 and total_pct <= 100)
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  org public.registration_org not null,
  status public.registration_status not null default 'pending',
  ref_number text,
  last_update timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (song_id, org)
);

create table if not exists public.launch_checklists (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references public.songs(id) on delete cascade,
  release_id uuid references public.releases(id) on delete cascade,
  items jsonb not null default '{}'::jsonb,
  ready_score integer not null default 0,
  status public.launch_status not null default 'draft',
  notes text,
  owner_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint launch_checklists_target_check check ((song_id is not null) or (release_id is not null)),
  constraint launch_checklists_ready_score_range check (ready_score >= 0 and ready_score <= 100)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  release_id uuid references public.releases(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  type public.asset_type not null default 'other',
  source public.asset_source not null default 'upload',
  source_id text,
  url text not null,
  thumb_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.smartlinks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null unique references public.releases(id) on delete cascade,
  slug text not null unique,
  links jsonb not null default '{}'::jsonb,
  presave jsonb not null default '{}'::jsonb,
  qr_asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_kits (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null unique references public.artists(id) on delete cascade,
  headline text,
  one_liner text,
  highlights jsonb not null default '[]'::jsonb,
  press_quotes jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  contacts jsonb not null default '{}'::jsonb,
  featured_tracks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.artist_document_acl (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  document_type public.document_type not null,
  allow_artist boolean not null default false,
  allow_manager boolean not null default true,
  allow_booking boolean not null default false,
  allow_staff boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (artist_id, document_type)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  release_id uuid references public.releases(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  type public.document_type not null default 'other',
  url text not null,
  version integer not null default 1,
  status public.registration_status not null default 'pending',
  visibility jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  requester_name text,
  requester_email text,
  event_name text,
  event_location text,
  event_date date,
  budget numeric(12,2),
  notes text,
  status public.booking_status not null default 'new',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  type public.content_type not null,
  caption text,
  assets jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  status public.content_status not null default 'draft',
  submitted_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approvals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pr_requests (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  outlet text not null,
  contact text,
  requested_at timestamptz,
  topic text,
  status public.pr_status not null default 'new',
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_packages (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  tags jsonb not null default '{}'::jsonb,
  link text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.artist_tasks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'done')),
  due_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  month text not null,
  url text not null,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reports_month_format check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  unique (artist_id, month, version)
);

create table if not exists public.lightroom_connections (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null unique references public.artists(id) on delete cascade,
  account_id text,
  album_id text,
  access_token_enc text,
  refresh_token_enc text,
  token_type text,
  scope text,
  expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_hub_feature_flags (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (artist_id, key)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  artist_id uuid references public.artists(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Link release cover assets now that media_assets exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'releases_cover_asset_id_fkey'
  ) then
    alter table public.releases
      add constraint releases_cover_asset_id_fkey
      foreign key (cover_asset_id)
      references public.media_assets(id)
      on update cascade
      on delete set null;
  end if;
end
$$;

-- =====================================================
-- TRIGGERS + INDEXES
-- =====================================================
drop trigger if exists set_songs_updated_at on public.songs;
create trigger set_songs_updated_at
before update on public.songs
for each row
execute function public.handle_updated_at();

drop trigger if exists set_smartlinks_updated_at on public.smartlinks;
create trigger set_smartlinks_updated_at
before update on public.smartlinks
for each row
execute function public.handle_updated_at();

drop trigger if exists set_media_kits_updated_at on public.media_kits;
create trigger set_media_kits_updated_at
before update on public.media_kits
for each row
execute function public.handle_updated_at();

drop trigger if exists set_artist_document_acl_updated_at on public.artist_document_acl;
create trigger set_artist_document_acl_updated_at
before update on public.artist_document_acl
for each row
execute function public.handle_updated_at();

drop trigger if exists set_booking_requests_updated_at on public.booking_requests;
create trigger set_booking_requests_updated_at
before update on public.booking_requests
for each row
execute function public.handle_updated_at();

drop trigger if exists set_content_items_updated_at on public.content_items;
create trigger set_content_items_updated_at
before update on public.content_items
for each row
execute function public.handle_updated_at();

drop trigger if exists set_pr_requests_updated_at on public.pr_requests;
create trigger set_pr_requests_updated_at
before update on public.pr_requests
for each row
execute function public.handle_updated_at();

drop trigger if exists set_sync_packages_updated_at on public.sync_packages;
create trigger set_sync_packages_updated_at
before update on public.sync_packages
for each row
execute function public.handle_updated_at();

drop trigger if exists set_artist_tasks_updated_at on public.artist_tasks;
create trigger set_artist_tasks_updated_at
before update on public.artist_tasks
for each row
execute function public.handle_updated_at();

drop trigger if exists set_lightroom_connections_updated_at on public.lightroom_connections;
create trigger set_lightroom_connections_updated_at
before update on public.lightroom_connections
for each row
execute function public.handle_updated_at();

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists artist_members_artist_user_idx on public.artist_members (artist_id, user_id);
create index if not exists artist_members_user_idx on public.artist_members (user_id);
create index if not exists songs_artist_id_idx on public.songs (artist_id);
create index if not exists songs_release_id_idx on public.songs (release_id);
create index if not exists registrations_song_id_idx on public.registrations (song_id);
create index if not exists launch_checklists_song_id_idx on public.launch_checklists (song_id);
create index if not exists launch_checklists_release_id_idx on public.launch_checklists (release_id);
create unique index if not exists launch_checklists_song_unique on public.launch_checklists (song_id) where song_id is not null;
create unique index if not exists launch_checklists_release_unique on public.launch_checklists (release_id) where release_id is not null;
create index if not exists media_assets_artist_id_idx on public.media_assets (artist_id);
create unique index if not exists media_assets_artist_source_unique on public.media_assets (artist_id, source, source_id) where source_id is not null;
create index if not exists documents_artist_id_idx on public.documents (artist_id);
create index if not exists documents_type_idx on public.documents (type);
create index if not exists content_items_artist_status_idx on public.content_items (artist_id, status);
create index if not exists pr_requests_artist_status_idx on public.pr_requests (artist_id, status);
create index if not exists sync_packages_song_id_idx on public.sync_packages (song_id);
create index if not exists reports_artist_month_idx on public.reports (artist_id, month);
create index if not exists audit_log_artist_action_idx on public.audit_log (artist_id, action, created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_user_id, created_at desc);
create index if not exists booking_requests_artist_status_idx on public.booking_requests (artist_id, status);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
create or replace function public.has_global_role(target_role public.hub_role)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = target_role
  );
$$;

create or replace function public.has_artist_membership(target_artist_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_admin() or exists (
    select 1
    from public.artist_members am
    where am.artist_id = target_artist_id
      and am.user_id = auth.uid()
  );
$$;

create or replace function public.has_artist_role(target_artist_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select public.is_admin() or exists (
    select 1
    from public.artist_members am
    where am.artist_id = target_artist_id
      and am.user_id = auth.uid()
      and am.role::text = any(allowed_roles)
  );
$$;

create or replace function public.song_artist_id(target_song_id uuid)
returns uuid
language sql
stable
as $$
  select s.artist_id
  from public.songs s
  where s.id = target_song_id;
$$;

create or replace function public.release_artist_id(target_release_id uuid)
returns uuid
language sql
stable
as $$
  select r.artist_id
  from public.releases r
  where r.id = target_release_id;
$$;

create or replace function public.can_read_document(target_artist_id uuid, visibility jsonb)
returns boolean
language plpgsql
stable
as $$
declare
  role_name text;
  allowed boolean;
begin
  if public.is_admin() then
    return true;
  end if;

  select am.role::text
  into role_name
  from public.artist_members am
  where am.artist_id = target_artist_id
    and am.user_id = auth.uid()
  order by case am.role
    when 'manager' then 1
    when 'booking' then 2
    when 'artist' then 3
    when 'staff' then 4
    else 5
  end
  limit 1;

  if role_name is null then
    return false;
  end if;

  if visibility is null or visibility = '{}'::jsonb then
    return true;
  end if;

  allowed := coalesce((visibility ->> role_name)::boolean, false);
  return allowed;
end;
$$;

create or replace function public.seed_artist_document_acl(target_artist_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.artist_document_acl (artist_id, document_type, allow_artist, allow_manager, allow_booking, allow_staff)
  values
    (target_artist_id, 'contract', false, true, false, false),
    (target_artist_id, 'splitsheet', true, true, false, true),
    (target_artist_id, 'invoice', false, true, true, false),
    (target_artist_id, 'license', false, true, true, false),
    (target_artist_id, 'epk', true, true, true, true),
    (target_artist_id, 'other', true, true, true, true)
  on conflict (artist_id, document_type) do nothing;
end;
$$;

create or replace function public.after_artist_insert_seed_acl()
returns trigger
language plpgsql
as $$
begin
  perform public.seed_artist_document_acl(new.id);
  return new;
end;
$$;

drop trigger if exists trg_artist_seed_document_acl on public.artists;
create trigger trg_artist_seed_document_acl
after insert on public.artists
for each row
execute function public.after_artist_insert_seed_acl();

-- Ensure ACL defaults for existing artists.
do $$
declare
  row_artist record;
begin
  for row_artist in select id from public.artists loop
    perform public.seed_artist_document_acl(row_artist.id);
  end loop;
end $$;

-- =====================================================
-- RLS
-- =====================================================
alter table public.user_roles enable row level security;
alter table public.artist_members enable row level security;
alter table public.songs enable row level security;
alter table public.splits enable row level security;
alter table public.registrations enable row level security;
alter table public.launch_checklists enable row level security;
alter table public.media_assets enable row level security;
alter table public.smartlinks enable row level security;
alter table public.media_kits enable row level security;
alter table public.artist_document_acl enable row level security;
alter table public.documents enable row level security;
alter table public.booking_requests enable row level security;
alter table public.content_items enable row level security;
alter table public.pr_requests enable row level security;
alter table public.sync_packages enable row level security;
alter table public.artist_tasks enable row level security;
alter table public.reports enable row level security;
alter table public.lightroom_connections enable row level security;
alter table public.artist_hub_feature_flags enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "user_roles self/admin read" on public.user_roles;
create policy "user_roles self/admin read"
on public.user_roles
for select
using (public.is_admin() or user_id = auth.uid());

drop policy if exists "user_roles admin manage" on public.user_roles;
create policy "user_roles admin manage"
on public.user_roles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "artist_members self/admin read" on public.artist_members;
create policy "artist_members self/admin read"
on public.artist_members
for select
using (public.is_admin() or user_id = auth.uid());

drop policy if exists "artist_members admin manage" on public.artist_members;
create policy "artist_members admin manage"
on public.artist_members
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "songs member read" on public.songs;
create policy "songs member read"
on public.songs
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "songs member write" on public.songs;
create policy "songs member write"
on public.songs
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "splits member read" on public.splits;
create policy "splits member read"
on public.splits
for select
using (public.has_artist_membership(public.song_artist_id(song_id)));

drop policy if exists "splits member write" on public.splits;
create policy "splits member write"
on public.splits
for all
using (public.has_artist_membership(public.song_artist_id(song_id)))
with check (public.has_artist_membership(public.song_artist_id(song_id)));

drop policy if exists "registrations member read" on public.registrations;
create policy "registrations member read"
on public.registrations
for select
using (public.has_artist_membership(public.song_artist_id(song_id)));

drop policy if exists "registrations member write" on public.registrations;
create policy "registrations member write"
on public.registrations
for all
using (public.has_artist_membership(public.song_artist_id(song_id)))
with check (public.has_artist_membership(public.song_artist_id(song_id)));

drop policy if exists "launch_checklists member read" on public.launch_checklists;
create policy "launch_checklists member read"
on public.launch_checklists
for select
using (
  public.has_artist_membership(
    coalesce(public.song_artist_id(song_id), public.release_artist_id(release_id))
  )
);

drop policy if exists "launch_checklists member write" on public.launch_checklists;
create policy "launch_checklists member write"
on public.launch_checklists
for all
using (
  public.has_artist_membership(
    coalesce(public.song_artist_id(song_id), public.release_artist_id(release_id))
  )
)
with check (
  public.has_artist_membership(
    coalesce(public.song_artist_id(song_id), public.release_artist_id(release_id))
  )
);

drop policy if exists "media_assets member read" on public.media_assets;
create policy "media_assets member read"
on public.media_assets
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "media_assets member write" on public.media_assets;
create policy "media_assets member write"
on public.media_assets
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "smartlinks member read" on public.smartlinks;
create policy "smartlinks member read"
on public.smartlinks
for select
using (public.has_artist_membership(public.release_artist_id(release_id)));

drop policy if exists "smartlinks member write" on public.smartlinks;
create policy "smartlinks member write"
on public.smartlinks
for all
using (public.has_artist_membership(public.release_artist_id(release_id)))
with check (public.has_artist_membership(public.release_artist_id(release_id)));

drop policy if exists "media_kits member read" on public.media_kits;
create policy "media_kits member read"
on public.media_kits
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "media_kits member write" on public.media_kits;
create policy "media_kits member write"
on public.media_kits
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "artist_document_acl member read" on public.artist_document_acl;
create policy "artist_document_acl member read"
on public.artist_document_acl
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "artist_document_acl admin manage" on public.artist_document_acl;
create policy "artist_document_acl admin manage"
on public.artist_document_acl
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "documents member read by acl" on public.documents;
create policy "documents member read by acl"
on public.documents
for select
using (
  deleted_at is null
  and public.can_read_document(artist_id, visibility)
);

drop policy if exists "documents member write" on public.documents;
create policy "documents member write"
on public.documents
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "booking_requests member read" on public.booking_requests;
create policy "booking_requests member read"
on public.booking_requests
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "booking_requests member write" on public.booking_requests;
create policy "booking_requests member write"
on public.booking_requests
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "content_items member read" on public.content_items;
create policy "content_items member read"
on public.content_items
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "content_items member write" on public.content_items;
create policy "content_items member write"
on public.content_items
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "pr_requests member read" on public.pr_requests;
create policy "pr_requests member read"
on public.pr_requests
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "pr_requests member write" on public.pr_requests;
create policy "pr_requests member write"
on public.pr_requests
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "sync_packages member read" on public.sync_packages;
create policy "sync_packages member read"
on public.sync_packages
for select
using (public.has_artist_membership(public.song_artist_id(song_id)));

drop policy if exists "sync_packages member write" on public.sync_packages;
create policy "sync_packages member write"
on public.sync_packages
for all
using (public.has_artist_membership(public.song_artist_id(song_id)))
with check (public.has_artist_membership(public.song_artist_id(song_id)));

drop policy if exists "artist_tasks member read" on public.artist_tasks;
create policy "artist_tasks member read"
on public.artist_tasks
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "artist_tasks member write" on public.artist_tasks;
create policy "artist_tasks member write"
on public.artist_tasks
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "reports member read" on public.reports;
create policy "reports member read"
on public.reports
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "reports member write" on public.reports;
create policy "reports member write"
on public.reports
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "lightroom member read" on public.lightroom_connections;
create policy "lightroom member read"
on public.lightroom_connections
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "lightroom member write" on public.lightroom_connections;
create policy "lightroom member write"
on public.lightroom_connections
for all
using (public.has_artist_membership(artist_id))
with check (public.has_artist_membership(artist_id));

drop policy if exists "feature_flags member read" on public.artist_hub_feature_flags;
create policy "feature_flags member read"
on public.artist_hub_feature_flags
for select
using (public.has_artist_membership(artist_id));

drop policy if exists "feature_flags admin manage" on public.artist_hub_feature_flags;
create policy "feature_flags admin manage"
on public.artist_hub_feature_flags
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "audit member read" on public.audit_log;
create policy "audit member read"
on public.audit_log
for select
using (
  public.is_admin()
  or (artist_id is not null and public.has_artist_membership(artist_id))
);

drop policy if exists "audit member write" on public.audit_log;
create policy "audit member write"
on public.audit_log
for insert
with check (
  public.is_admin()
  or (artist_id is not null and public.has_artist_membership(artist_id))
);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
insert into storage.buckets (id, name, public)
values
  ('artist-hub-assets', 'artist-hub-assets', false),
  ('artist-hub-pdfs', 'artist-hub-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "artist hub storage read" on storage.objects;
create policy "artist hub storage read"
on storage.objects
for select
using (
  bucket_id in ('artist-hub-assets', 'artist-hub-pdfs')
  and (
    public.is_admin()
    or (
      array_length(storage.foldername(name), 1) >= 1
      and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
      and public.has_artist_membership((storage.foldername(name))[1]::uuid)
    )
  )
);

drop policy if exists "artist hub storage write" on storage.objects;
create policy "artist hub storage write"
on storage.objects
for all
using (
  bucket_id in ('artist-hub-assets', 'artist-hub-pdfs')
  and (
    public.is_admin()
    or (
      array_length(storage.foldername(name), 1) >= 1
      and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
      and public.has_artist_membership((storage.foldername(name))[1]::uuid)
    )
  )
)
with check (
  bucket_id in ('artist-hub-assets', 'artist-hub-pdfs')
  and (
    public.is_admin()
    or (
      array_length(storage.foldername(name), 1) >= 1
      and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
      and public.has_artist_membership((storage.foldername(name))[1]::uuid)
    )
  )
);
