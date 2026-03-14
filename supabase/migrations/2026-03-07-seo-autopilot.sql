-- SEO Autopilot baseline
-- Canonical public content controls + indexing queue + audit snapshots.

create extension if not exists pgcrypto;

-- =====================================================
-- ARTISTS SEO FIELDS
-- =====================================================
alter table if exists public.artists
  add column if not exists genre text default 'Latino',
  add column if not exists language text default 'Español',
  add column if not exists hero_image_url text,
  add column if not exists is_published boolean not null default true,
  add column if not exists published_at timestamptz;

update public.artists
set hero_image_url = coalesce(hero_image_url, avatar_url, hero_media_url)
where hero_image_url is null;

update public.artists
set is_published = true
where is_published is null;

update public.artists
set published_at = coalesce(published_at, created_at)
where is_published = true
  and published_at is null;

-- =====================================================
-- RELEASES SEO FIELDS
-- =====================================================
alter table if exists public.releases
  add column if not exists slug text,
  add column if not exists type text,
  add column if not exists cover_image_url text,
  add column if not exists is_published boolean,
  add column if not exists published_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'releases_type_check'
  ) then
    alter table public.releases
      add constraint releases_type_check check (type is null or type in ('single', 'ep', 'album'));
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'cover_url'
  ) then
    update public.releases
    set cover_image_url = coalesce(cover_image_url, cover_url)
    where cover_image_url is null;
  end if;
end
$$;

do $$
declare
  has_release_type boolean;
  has_format boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'release_type'
  ) into has_release_type;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'format'
  ) into has_format;

  if has_release_type and has_format then
    execute $q$
      update public.releases
      set type = case lower(coalesce(type, release_type::text, format, 'single'))
        when 'ep' then 'ep'
        when 'album' then 'album'
        else 'single'
      end
      where type is null
    $q$;
  elsif has_release_type then
    execute $q$
      update public.releases
      set type = case lower(coalesce(type, release_type::text, 'single'))
        when 'ep' then 'ep'
        when 'album' then 'album'
        else 'single'
      end
      where type is null
    $q$;
  elsif has_format then
    execute $q$
      update public.releases
      set type = case lower(coalesce(type, format, 'single'))
        when 'ep' then 'ep'
        when 'album' then 'album'
        else 'single'
      end
      where type is null
    $q$;
  else
    update public.releases
    set type = 'single'
    where type is null;
  end if;
end
$$;

update public.releases
set slug = trim(both '-' from regexp_replace(lower(regexp_replace(coalesce(title, ''), '[^a-zA-Z0-9]+', '-', 'g')), '-+', '-', 'g'))
          || '-' || substring(id::text, 1, 8)
where (slug is null or length(trim(slug)) = 0)
  and coalesce(title, '') <> '';

do $$
declare
  has_content_status boolean;
  has_publish_at boolean;
  has_release_date boolean;
  scheduled_expr text;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'content_status'
  ) into has_content_status;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'publish_at'
  ) into has_publish_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'release_date'
  ) into has_release_date;

  if has_publish_at and has_release_date then
    scheduled_expr := 'coalesce(publish_at, release_date::timestamptz) <= now()';
  elsif has_publish_at then
    scheduled_expr := 'coalesce(publish_at, now()) <= now()';
  elsif has_release_date then
    scheduled_expr := 'release_date::timestamptz <= now()';
  else
    scheduled_expr := 'true';
  end if;

  if has_content_status then
    execute format(
      'update public.releases
       set is_published = case
         when content_status = ''draft'' then false
         when content_status = ''scheduled'' then %s
         else true
       end
       where is_published is null',
      scheduled_expr
    );
  else
    execute format(
      'update public.releases
       set is_published = %s
       where is_published is null',
      scheduled_expr
    );
  end if;
end
$$;

do $$
declare
  has_publish_at boolean;
  has_release_date boolean;
  has_created_at boolean;
  published_expr text := 'published_at';
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'publish_at'
  ) into has_publish_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'release_date'
  ) into has_release_date;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'created_at'
  ) into has_created_at;

  if has_publish_at then
    published_expr := published_expr || ', publish_at';
  end if;
  if has_release_date then
    published_expr := published_expr || ', release_date::timestamptz';
  end if;
  if has_created_at then
    published_expr := published_expr || ', created_at';
  else
    published_expr := published_expr || ', now()';
  end if;

  execute format(
    'update public.releases
     set published_at = coalesce(%s)
     where is_published = true
       and published_at is null',
    published_expr
  );
end
$$;

create unique index if not exists releases_slug_unique_idx on public.releases(slug) where slug is not null;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'releases'
      and column_name = 'updated_at'
  ) then
    execute 'create index if not exists releases_is_published_idx on public.releases(is_published, updated_at desc)';
  else
    execute 'create index if not exists releases_is_published_idx on public.releases(is_published, published_at desc)';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'artists'
      and column_name = 'updated_at'
  ) then
    execute 'create index if not exists artists_is_published_idx on public.artists(is_published, updated_at desc)';
  else
    execute 'create index if not exists artists_is_published_idx on public.artists(is_published, published_at desc)';
  end if;
end
$$;

-- =====================================================
-- SEO QUEUE + AUDIT
-- =====================================================
create table if not exists public.seo_queue (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  type text not null,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'error')),
  attempts integer not null default 0,
  last_error text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists seo_queue_url_unique_idx on public.seo_queue(url);
create index if not exists seo_queue_status_idx on public.seo_queue(status, updated_at asc);

drop trigger if exists set_seo_queue_updated_at on public.seo_queue;
create trigger set_seo_queue_updated_at
before update on public.seo_queue
for each row
execute function public.handle_updated_at();

create table if not exists public.seo_audit_runs (
  id uuid primary key default gen_random_uuid(),
  issues_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================
-- RLS + POLICIES
-- =====================================================
create or replace function public.is_seo_admin()
returns boolean
language plpgsql
stable
as $$
declare
  has_global_admin boolean := false;
begin
  if public.is_admin() then
    return true;
  end if;

  if to_regclass('public.user_roles') is not null then
    select exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = 'admin'
    )
    into has_global_admin;
  end if;

  return has_global_admin;
end;
$$;

alter table public.seo_queue enable row level security;
alter table public.seo_audit_runs enable row level security;

drop policy if exists "artists public read" on public.artists;
create policy "artists public read"
on public.artists
for select
using (coalesce(is_published, true) = true or public.is_seo_admin());

drop policy if exists "artists admin manage" on public.artists;
create policy "artists admin manage"
on public.artists
for all
using (public.is_seo_admin())
with check (public.is_seo_admin());

drop policy if exists "releases public read" on public.releases;
create policy "releases public read"
on public.releases
for select
using (coalesce(is_published, true) = true or public.is_seo_admin());

drop policy if exists "releases admin manage" on public.releases;
create policy "releases admin manage"
on public.releases
for all
using (public.is_seo_admin())
with check (public.is_seo_admin());

drop policy if exists "seo queue admin read" on public.seo_queue;
create policy "seo queue admin read"
on public.seo_queue
for select
using (public.is_seo_admin());

drop policy if exists "seo queue admin write" on public.seo_queue;
create policy "seo queue admin write"
on public.seo_queue
for all
using (public.is_seo_admin())
with check (public.is_seo_admin());

drop policy if exists "seo audit admin read" on public.seo_audit_runs;
create policy "seo audit admin read"
on public.seo_audit_runs
for select
using (public.is_seo_admin());

drop policy if exists "seo audit admin write" on public.seo_audit_runs;
create policy "seo audit admin write"
on public.seo_audit_runs
for all
using (public.is_seo_admin())
with check (public.is_seo_admin());
