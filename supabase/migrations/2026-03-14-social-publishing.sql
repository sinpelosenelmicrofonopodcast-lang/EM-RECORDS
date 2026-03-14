create table if not exists public.social_publish_settings (
  id text primary key default 'default' check (id = 'default'),
  facebook_enabled boolean not null default true,
  instagram_enabled boolean not null default true,
  auto_release_facebook boolean not null default true,
  auto_release_instagram boolean not null default true,
  auto_artist_facebook boolean not null default true,
  auto_artist_instagram boolean not null default false,
  auto_video_facebook boolean not null default true,
  auto_video_instagram boolean not null default false,
  auto_news_facebook boolean not null default true,
  auto_news_instagram boolean not null default true,
  random_bundle_size integer not null default 3 check (random_bundle_size between 1 and 6),
  release_template text not null default 'Nuevo release: {{title}} - {{artistName}}{{featuringText}}.
{{descriptionShort}}
{{links}}',
  artist_template text not null default 'Update de artista: {{artistName}}.
{{bioShort}}
{{artistUrl}}',
  video_template text not null default 'Nuevo video: {{videoTitle}} - {{artistName}}.
{{links}}',
  news_template text not null default 'Nueva noticia en EM Records: {{title}}.
{{excerptShort}}
{{newsUrl}}',
  random_template text not null default 'Selecciones de EM Records:
{{items}}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_social_publish_settings_updated_at on public.social_publish_settings;
create trigger set_social_publish_settings_updated_at
before update on public.social_publish_settings
for each row
execute function public.handle_updated_at();

insert into public.social_publish_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.social_post_jobs (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'instagram')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  content_type text not null check (content_type in ('manual', 'release', 'artist', 'video', 'news')),
  trigger_type text not null,
  content_id text,
  title text,
  message text not null,
  link_urls text[] not null default '{}',
  primary_link_url text,
  media_url text,
  metadata jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  last_error text,
  external_post_id text,
  response_payload jsonb,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_post_jobs_status_created_at_idx
on public.social_post_jobs (status, created_at);

create index if not exists social_post_jobs_content_idx
on public.social_post_jobs (content_type, content_id);

drop trigger if exists set_social_post_jobs_updated_at on public.social_post_jobs;
create trigger set_social_post_jobs_updated_at
before update on public.social_post_jobs
for each row
execute function public.handle_updated_at();

alter table public.social_publish_settings enable row level security;
alter table public.social_post_jobs enable row level security;

drop policy if exists "social publish settings admin manage" on public.social_publish_settings;
create policy "social publish settings admin manage"
on public.social_publish_settings
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "social post jobs admin manage" on public.social_post_jobs;
create policy "social post jobs admin manage"
on public.social_post_jobs
for all
using (public.is_admin() or auth.role() = 'service_role')
with check (public.is_admin() or auth.role() = 'service_role');
