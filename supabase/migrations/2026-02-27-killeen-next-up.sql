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

create trigger set_next_up_submissions_updated_at
before update on public.next_up_submissions
for each row
execute function public.handle_updated_at();

create trigger set_next_up_competitors_updated_at
before update on public.next_up_competitors
for each row
execute function public.handle_updated_at();

alter table public.next_up_submissions enable row level security;
alter table public.next_up_competitors enable row level security;
alter table public.next_up_vote_otps enable row level security;
alter table public.next_up_votes enable row level security;

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

insert into storage.buckets (id, name, public)
values ('next-up-media', 'next-up-media', true)
on conflict (id) do nothing;

drop policy if exists "storage public read" on storage.objects;
create policy "storage public read"
on storage.objects
for select
using (bucket_id in ('artist-media', 'release-covers', 'gallery-media', 'demo-submissions', 'press-kits', 'next-up-media'));
