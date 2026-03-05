alter table if exists public.artists
  add column if not exists platform_preference text,
  add column if not exists press_kit_updated_at timestamptz,
  add column if not exists media_kit_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'artists_platform_preference_check'
  ) then
    alter table public.artists
      add constraint artists_platform_preference_check
      check (platform_preference is null or platform_preference in ('spotify', 'apple', 'youtube'));
  end if;
end
$$;

alter table if exists public.releases
  add column if not exists video_title text,
  add column if not exists video_thumbnail_url text,
  add column if not exists video_featured boolean not null default false;

create index if not exists releases_video_featured_idx on public.releases (video_featured) where video_featured = true;

alter table if exists public.fan_wall_entries
  add column if not exists is_verified boolean not null default false,
  add column if not exists ip_hash text;

create index if not exists fan_wall_entries_artist_ip_created_idx on public.fan_wall_entries (artist_slug, ip_hash, created_at desc);

create table if not exists public.booking_inquiries (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  artist_slug text not null,
  artist_name text not null,
  inquiry_type text not null default 'club' check (inquiry_type in ('festival', 'club', 'private', 'brand')),
  city text not null,
  date_range text not null,
  budget_range text not null,
  message text,
  contact_email text not null,
  contact_phone text,
  status text not null default 'new' check (status in ('new', 'contacted', 'negotiating', 'confirmed', 'closed')),
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_inquiries_status_idx on public.booking_inquiries (status, created_at desc);
create index if not exists booking_inquiries_artist_slug_idx on public.booking_inquiries (artist_slug, created_at desc);

drop trigger if exists set_booking_inquiries_updated_at on public.booking_inquiries;
create trigger set_booking_inquiries_updated_at
before update on public.booking_inquiries
for each row
execute function public.handle_updated_at();

alter table public.booking_inquiries enable row level security;

drop policy if exists "booking inquiries public insert" on public.booking_inquiries;
create policy "booking inquiries public insert"
on public.booking_inquiries
for insert
with check (status = 'new');

drop policy if exists "booking inquiries admin read" on public.booking_inquiries;
create policy "booking inquiries admin read"
on public.booking_inquiries
for select
using (public.is_admin());

drop policy if exists "booking inquiries admin update" on public.booking_inquiries;
create policy "booking inquiries admin update"
on public.booking_inquiries
for update
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.press_kit_downloads (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  kind text not null check (kind in ('press_kit', 'media_kit')),
  file_url text not null,
  user_agent text,
  ip text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists press_kit_downloads_artist_idx on public.press_kit_downloads (artist_id, created_at desc);

alter table public.press_kit_downloads enable row level security;

drop policy if exists "press kit downloads public insert" on public.press_kit_downloads;
create policy "press kit downloads public insert"
on public.press_kit_downloads
for insert
with check (true);

drop policy if exists "press kit downloads admin read" on public.press_kit_downloads;
create policy "press kit downloads admin read"
on public.press_kit_downloads
for select
using (public.is_admin());
