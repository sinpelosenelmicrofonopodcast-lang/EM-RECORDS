alter table if exists public.songs
  add column if not exists slug text;

update public.songs
set slug = left(trim(both '-' from regexp_replace(lower(coalesce(title, 'song')), '[^a-z0-9]+', '-', 'g')), 56) || '-' || left(replace(id::text, '-', ''), 8)
where coalesce(nullif(trim(slug), ''), '') = '';

create unique index if not exists songs_slug_unique_idx
  on public.songs (slug)
  where slug is not null;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  content_id uuid,
  content_type text not null check (content_type in ('song', 'blog', 'news', 'video', 'artist', 'custom')),
  title text,
  caption text not null,
  platforms text[] not null default '{}',
  media_url text,
  link text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed', 'ready_for_manual')),
  scheduled_at timestamptz,
  published_at timestamptz,
  meta_post_id text,
  publish_log jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_platforms_check check (
    platforms <@ array['facebook', 'instagram', 'tiktok', 'x', 'youtube']::text[]
  )
);

create index if not exists social_posts_status_scheduled_idx
  on public.social_posts (status, scheduled_at, created_at desc);

create index if not exists social_posts_type_created_idx
  on public.social_posts (content_type, created_at desc);

drop trigger if exists set_social_posts_updated_at on public.social_posts;
create trigger set_social_posts_updated_at
before update on public.social_posts
for each row
execute function public.handle_updated_at();

alter table public.social_posts enable row level security;

drop policy if exists "social posts admin manage" on public.social_posts;
create policy "social posts admin manage"
on public.social_posts
for all
using (public.is_admin() or auth.role() = 'service_role')
with check (public.is_admin() or auth.role() = 'service_role');
