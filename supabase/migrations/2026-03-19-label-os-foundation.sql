create table if not exists public.contributors (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  full_name text not null,
  stage_name text,
  email text,
  role text not null check (role in ('artist', 'writer', 'producer', 'engineer', 'publisher', 'manager', 'other')),
  ipi text,
  pro_affiliation text,
  phone text,
  payment_details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalties (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  release_id uuid references public.releases(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  contributor_id uuid references public.contributors(id) on delete set null,
  source text not null check (source in ('spotify', 'apple_music', 'youtube', 'distrokid', 'songtrust', 'soundexchange', 'bmi', 'mlc', 'manual')),
  statement_period date not null,
  gross_amount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  share_pct numeric(6,2) not null default 0,
  payout_amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'disputed')),
  external_ref text,
  report_payload jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint royalties_share_pct_range check (share_pct >= 0 and share_pct <= 100)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete cascade,
  release_id uuid references public.releases(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  title text not null,
  objective text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'boosting', 'paused', 'completed')),
  strategy text,
  budget_cents integer not null default 0,
  currency text not null default 'USD',
  start_at timestamptz,
  end_at timestamptz,
  automation_enabled boolean not null default true,
  ai_summary text,
  platforms jsonb not null default '[]'::jsonb,
  content_targets jsonb not null default '{}'::jsonb,
  kpis jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_rollups (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete cascade,
  release_id uuid references public.releases(id) on delete set null,
  song_id uuid references public.songs(id) on delete set null,
  platform text not null check (platform in ('spotify', 'apple_music', 'youtube', 'instagram', 'facebook', 'tiktok', 'x', 'manual')),
  snapshot_date date not null,
  streams integer not null default 0,
  listeners integer not null default 0,
  followers integer not null default 0,
  reach integer not null default 0,
  engagement numeric(10,4) not null default 0,
  revenue_cents integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (artist_id, release_id, song_id, platform, snapshot_date)
);

create table if not exists public.service_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_es text not null,
  description_en text not null,
  description_es text not null,
  billing_interval text not null check (billing_interval in ('one_time', 'monthly', 'quarterly', 'yearly')),
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  plan_type text not null check (plan_type in ('distribution', 'marketing', 'subscription', 'sponsorship', 'custom')),
  features jsonb not null default '[]'::jsonb,
  stripe_price_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_subscriptions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  plan_id uuid not null references public.service_plans(id) on delete restrict,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'paused', 'cancelled')),
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'push')),
  label text not null,
  provider text not null check (provider in ('resend', 'twilio', 'onesignal', 'manual')),
  target text not null,
  artist_id uuid references public.artists(id) on delete cascade,
  verified boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_plans (
  slug,
  name_en,
  name_es,
  description_en,
  description_es,
  billing_interval,
  amount_cents,
  plan_type,
  features
)
values
  (
    'distribution-core',
    'Distribution Core',
    'Distribucion Core',
    'Release planning, metadata QA, smart links, and catalog operations.',
    'Planeacion de lanzamientos, QA de metadata, smart links y operaciones de catalogo.',
    'monthly',
    9900,
    'distribution',
    '["metadata QA","smart links","release support","catalog reports"]'::jsonb
  ),
  (
    'growth-engine-pro',
    'Growth Engine Pro',
    'Growth Engine Pro',
    'AI social engine, content queueing, campaign automation, and reporting.',
    'Motor social con AI, cola de contenido, automatizacion de campanas y reportes.',
    'monthly',
    24900,
    'marketing',
    '["ai content","social scheduling","growth analytics","campaign automations"]'::jsonb
  ),
  (
    'label-os-enterprise',
    'Label OS Enterprise',
    'Label OS Enterprise',
    'Full-service autonomous label stack with distribution, growth, and royalty operations.',
    'Stack autonomo completo para sello con distribucion, growth y operaciones de regalias.',
    'monthly',
    49900,
    'subscription',
    '["distribution","growth engine","royalty reporting","priority support"]'::jsonb
  )
on conflict (slug) do nothing;

create index if not exists contributors_artist_idx on public.contributors (artist_id, active);
create index if not exists royalties_artist_period_idx on public.royalties (artist_id, statement_period desc);
create index if not exists royalties_status_idx on public.royalties (status, statement_period desc);
create index if not exists campaigns_artist_status_idx on public.campaigns (artist_id, status, start_at desc);
create index if not exists analytics_rollups_artist_date_idx on public.analytics_rollups (artist_id, snapshot_date desc);
create index if not exists artist_subscriptions_artist_status_idx on public.artist_subscriptions (artist_id, status);
create index if not exists notification_channels_artist_channel_idx on public.notification_channels (artist_id, channel, active);

drop trigger if exists set_contributors_updated_at on public.contributors;
create trigger set_contributors_updated_at
before update on public.contributors
for each row
execute function public.handle_updated_at();

drop trigger if exists set_royalties_updated_at on public.royalties;
create trigger set_royalties_updated_at
before update on public.royalties
for each row
execute function public.handle_updated_at();

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row
execute function public.handle_updated_at();

drop trigger if exists set_service_plans_updated_at on public.service_plans;
create trigger set_service_plans_updated_at
before update on public.service_plans
for each row
execute function public.handle_updated_at();

drop trigger if exists set_artist_subscriptions_updated_at on public.artist_subscriptions;
create trigger set_artist_subscriptions_updated_at
before update on public.artist_subscriptions
for each row
execute function public.handle_updated_at();

drop trigger if exists set_notification_channels_updated_at on public.notification_channels;
create trigger set_notification_channels_updated_at
before update on public.notification_channels
for each row
execute function public.handle_updated_at();

alter table public.contributors enable row level security;
alter table public.royalties enable row level security;
alter table public.campaigns enable row level security;
alter table public.analytics_rollups enable row level security;
alter table public.service_plans enable row level security;
alter table public.artist_subscriptions enable row level security;
alter table public.notification_channels enable row level security;

drop policy if exists "contributors growth admin manage" on public.contributors;
create policy "contributors growth admin manage"
on public.contributors
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "royalties growth admin manage" on public.royalties;
create policy "royalties growth admin manage"
on public.royalties
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "campaigns growth admin manage" on public.campaigns;
create policy "campaigns growth admin manage"
on public.campaigns
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "analytics rollups growth admin manage" on public.analytics_rollups;
create policy "analytics rollups growth admin manage"
on public.analytics_rollups
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "service plans growth admin manage" on public.service_plans;
create policy "service plans growth admin manage"
on public.service_plans
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "artist subscriptions growth admin manage" on public.artist_subscriptions;
create policy "artist subscriptions growth admin manage"
on public.artist_subscriptions
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');

drop policy if exists "notification channels growth admin manage" on public.notification_channels;
create policy "notification channels growth admin manage"
on public.notification_channels
for all
using (public.can_access_growth_admin() or auth.role() = 'service_role')
with check (public.can_access_growth_admin() or auth.role() = 'service_role');
