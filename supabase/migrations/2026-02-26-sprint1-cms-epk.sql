alter table if exists public.artists
add column if not exists epk_enabled boolean not null default false,
add column if not exists epk_password_hash text;

alter table if exists public.releases
add column if not exists content_status text not null default 'published',
add column if not exists publish_at timestamptz;

alter table if exists public.releases
  drop constraint if exists releases_content_status_check;

alter table if exists public.releases
  add constraint releases_content_status_check check (content_status in ('draft', 'scheduled', 'published'));

alter table if exists public.news_posts
add column if not exists content_status text not null default 'published',
add column if not exists publish_at timestamptz;

alter table if exists public.news_posts
  drop constraint if exists news_posts_content_status_check;

alter table if exists public.news_posts
  add constraint news_posts_content_status_check check (content_status in ('draft', 'scheduled', 'published'));
