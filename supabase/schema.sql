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
  artist_slug text references public.artists(slug) on update cascade on delete set null,
  artist_name text,
  featuring text,
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

create table if not exists public.next_up_submissions (
  id uuid primary key default gen_random_uuid(),
  stage_name text not null,
  legal_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  demo_url text not null,
  social_links text,
  artist_bio text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ip_address text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_next_up_submissions_updated_at
before update on public.next_up_submissions
for each row
execute function public.handle_updated_at();

create table if not exists public.next_up_competitors (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.next_up_submissions(id) on delete set null,
  stage_name text not null,
  city text not null,
  photo_url text,
  demo_url text not null,
  social_links text,
  artist_bio text,
  status text not null default 'approved' check (status in ('approved', 'hidden')),
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_next_up_competitors_updated_at
before update on public.next_up_competitors
for each row
execute function public.handle_updated_at();

create table if not exists public.next_up_vote_otps (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.next_up_competitors(id) on delete cascade,
  voter_email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  requester_ip text,
  requester_ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.next_up_votes (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.next_up_competitors(id) on delete cascade,
  voter_email text not null,
  voter_ip text,
  voter_ip_hash text,
  created_at timestamptz not null default now(),
  unique (competitor_id, voter_email),
  unique (competitor_id, voter_ip_hash)
);

create table if not exists public.next_up_settings (
  id text primary key default 'default' check (id = 'default'),
  live_final_at timestamptz,
  voting_enabled boolean not null default false,
  voting_starts_at timestamptz default '2026-03-13T00:00:00-05:00'::timestamptz,
  voting_ends_at timestamptz default '2026-04-03T23:59:59-05:00'::timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_next_up_settings_updated_at
before update on public.next_up_settings
for each row
execute function public.handle_updated_at();

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_social_links_updated_at
before update on public.social_links
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
alter table public.next_up_submissions enable row level security;
alter table public.next_up_competitors enable row level security;
alter table public.next_up_vote_otps enable row level security;
alter table public.next_up_votes enable row level security;
alter table public.next_up_settings enable row level security;
alter table public.social_links enable row level security;
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

drop policy if exists "next_up submissions public insert" on public.next_up_submissions;
create policy "next_up submissions public insert"
on public.next_up_submissions
for insert
with check (true);

drop policy if exists "next_up submissions admin manage" on public.next_up_submissions;
create policy "next_up submissions admin manage"
on public.next_up_submissions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "next_up competitors public read" on public.next_up_competitors;
create policy "next_up competitors public read"
on public.next_up_competitors
for select
using (status = 'approved' or public.is_admin());

drop policy if exists "next_up competitors admin manage" on public.next_up_competitors;
create policy "next_up competitors admin manage"
on public.next_up_competitors
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "next_up otps admin manage" on public.next_up_vote_otps;
create policy "next_up otps admin manage"
on public.next_up_vote_otps
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "next_up votes admin manage" on public.next_up_votes;
create policy "next_up votes admin manage"
on public.next_up_votes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "next_up settings public read" on public.next_up_settings;
create policy "next_up settings public read"
on public.next_up_settings
for select
using (true);

drop policy if exists "next_up settings admin manage" on public.next_up_settings;
create policy "next_up settings admin manage"
on public.next_up_settings
for all
using (public.is_admin())
with check (public.is_admin());

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
  ('press-kits', 'press-kits', true),
  ('next-up-media', 'next-up-media', true)
on conflict (id) do nothing;

drop policy if exists "storage public read" on storage.objects;
create policy "storage public read"
on storage.objects
for select
using (bucket_id in ('artist-media', 'release-covers', 'gallery-media', 'demo-submissions', 'press-kits', 'next-up-media'));

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
