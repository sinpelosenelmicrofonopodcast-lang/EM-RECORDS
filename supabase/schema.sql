-- EM Records LLC schema
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text not null,
  bio text not null,
  hero_media_url text not null,
  avatar_url text not null,
  booking_email text not null,
  spotify_url text,
  spotify_embed text,
  soundcloud_embed text,
  apple_music_url text,
  youtube_url text,
  music_video_embed text,
  interview_url_1 text,
  interview_url_2 text,
  press_kit_url text,
  media_kit_url text,
  instagram_url text,
  tiktok_url text,
  x_url text,
  facebook_url text,
  epk_enabled boolean not null default false,
  epk_password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_artists_updated_at
before update on public.artists
for each row
execute function public.handle_updated_at();

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  format text not null check (format in ('Single', 'EP', 'Album')),
  cover_url text not null,
  release_date date not null,
  description text not null,
  spotify_embed text,
  apple_embed text,
  youtube_embed text,
  featured boolean not null default false,
  content_status text not null default 'published' check (content_status in ('draft', 'scheduled', 'published')),
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_releases_updated_at
before update on public.releases
for each row
execute function public.handle_updated_at();

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text not null,
  city text not null,
  country text not null,
  starts_at timestamptz not null,
  ticket_url text,
  stripe_price_id text,
  sponsors text[] not null default '{}',
  status text not null default 'upcoming' check (status in ('upcoming', 'sold_out', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_events_updated_at
before update on public.events
for each row
execute function public.handle_updated_at();

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  category text not null,
  hero_url text not null,
  content text not null,
  published_at date not null,
  content_status text not null default 'published' check (content_status in ('draft', 'scheduled', 'published')),
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_news_posts_updated_at
before update on public.news_posts
for each row
execute function public.handle_updated_at();

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  media_url text not null,
  caption text not null,
  kind text not null check (kind in ('image', 'video')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_gallery_items_updated_at
before update on public.gallery_items
for each row
execute function public.handle_updated_at();

create table if not exists public.demo_submissions (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  email text not null,
  track_title text not null,
  message text,
  file_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_demo_submissions_updated_at
before update on public.demo_submissions
for each row
execute function public.handle_updated_at();

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.sponsor_applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text not null,
  email text not null,
  plan text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_sponsor_applications_updated_at
before update on public.sponsor_applications
for each row
execute function public.handle_updated_at();

create table if not exists public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  event_id text,
  event_title text not null,
  buyer_email text not null,
  quantity integer not null check (quantity > 0),
  amount_total integer not null,
  currency text not null,
  qr_code_value text not null unique,
  qr_code_data_url text,
  status text not null default 'paid' check (status in ('paid', 'refunded', 'cancelled')),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_ticket_orders_updated_at
before update on public.ticket_orders
for each row
execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.events enable row level security;
alter table public.news_posts enable row level security;
alter table public.gallery_items enable row level security;
alter table public.demo_submissions enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.sponsor_applications enable row level security;
alter table public.ticket_orders enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin());

drop policy if exists "artists public read" on public.artists;
create policy "artists public read" on public.artists for select using (true);

drop policy if exists "artists admin manage" on public.artists;
create policy "artists admin manage" on public.artists for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "releases public read" on public.releases;
create policy "releases public read" on public.releases for select using (true);

drop policy if exists "releases admin manage" on public.releases;
create policy "releases admin manage" on public.releases for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events for select using (true);

drop policy if exists "events admin manage" on public.events;
create policy "events admin manage" on public.events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "news public read" on public.news_posts;
create policy "news public read" on public.news_posts for select using (true);

drop policy if exists "news admin manage" on public.news_posts;
create policy "news admin manage" on public.news_posts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gallery public read" on public.gallery_items;
create policy "gallery public read" on public.gallery_items for select using (true);

drop policy if exists "gallery admin manage" on public.gallery_items;
create policy "gallery admin manage" on public.gallery_items for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "demos public insert" on public.demo_submissions;
create policy "demos public insert" on public.demo_submissions for insert with check (true);

drop policy if exists "demos admin read" on public.demo_submissions;
create policy "demos admin read" on public.demo_submissions for select using (public.is_admin());

drop policy if exists "demos admin update" on public.demo_submissions;
create policy "demos admin update" on public.demo_submissions for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "newsletter public insert" on public.newsletter_subscribers;
create policy "newsletter public insert" on public.newsletter_subscribers for insert with check (true);

drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers for select using (public.is_admin());

drop policy if exists "sponsors public insert" on public.sponsor_applications;
create policy "sponsors public insert" on public.sponsor_applications for insert with check (true);

drop policy if exists "sponsors admin manage" on public.sponsor_applications;
create policy "sponsors admin manage" on public.sponsor_applications for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tickets admin manage" on public.ticket_orders;
create policy "tickets admin manage" on public.ticket_orders for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tickets service insert" on public.ticket_orders;
create policy "tickets service insert" on public.ticket_orders
for insert
with check (auth.role() = 'service_role' or public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('artist-media', 'artist-media', true),
  ('release-covers', 'release-covers', true),
  ('gallery-media', 'gallery-media', true),
  ('demo-submissions', 'demo-submissions', true),
  ('press-kits', 'press-kits', true)
on conflict (id) do nothing;

drop policy if exists "storage public read" on storage.objects;
create policy "storage public read"
on storage.objects
for select
using (bucket_id in ('artist-media', 'release-covers', 'gallery-media', 'demo-submissions', 'press-kits'));

drop policy if exists "storage admin write" on storage.objects;
create policy "storage admin write"
on storage.objects
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "storage demo upload" on storage.objects;
create policy "storage demo upload"
on storage.objects
for insert
with check (bucket_id = 'demo-submissions');
