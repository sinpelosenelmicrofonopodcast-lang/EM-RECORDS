-- Artist Signing System for EM Records
-- Adds lead pipeline, contract templating, e-sign flow, onboarding, and audit trail.

create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'is_admin'
  ) then
    alter table public.profiles
      add column if not exists role text not null default 'artist';

    alter table public.profiles
      drop constraint if exists profiles_role_check;

    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'staff', 'artist'));

    update public.profiles
    set role = 'admin'
    where is_admin = true;
  end if;
end
$$;

do $$ begin
  create type public.signing_pipeline_stage as enum (
    'lead_received',
    'internal_review',
    'offer_sent',
    'artist_viewed_offer',
    'artist_signed',
    'label_counter_signed',
    'fully_executed',
    'archived',
    'declined',
    'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signing_pro_affiliation as enum ('BMI', 'ASCAP', 'SESAC', 'none');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signing_offer_status as enum (
    'draft',
    'sent',
    'viewed',
    'accepted',
    'declined',
    'expired',
    'revoked'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signing_contract_status as enum (
    'draft',
    'offer_sent',
    'artist_viewed_offer',
    'artist_signed',
    'label_counter_signed',
    'fully_executed',
    'archived',
    'declined',
    'expired',
    'revoked'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.signer_role as enum ('artist', 'label');
exception when duplicate_object then null; end $$;

create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  legal_name text not null,
  stage_name text,
  email text not null,
  phone text,
  country text,
  state text,
  date_of_birth date,
  government_name text,
  pro_affiliation public.signing_pro_affiliation not null default 'none',
  ipi_number text,
  social_links jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists artist_profiles_email_unique_idx
  on public.artist_profiles (lower(email));
create index if not exists artist_profiles_user_idx on public.artist_profiles (user_id);

create table if not exists public.artist_leads (
  id uuid primary key default gen_random_uuid(),
  artist_profile_id uuid references public.artist_profiles(id) on delete set null,
  legal_name text not null,
  stage_name text,
  email text not null,
  phone text,
  country text,
  state text,
  date_of_birth date,
  government_name text,
  pro_affiliation public.signing_pro_affiliation not null default 'none',
  ipi_number text,
  social_links jsonb not null default '{}'::jsonb,
  notes text,
  status public.signing_pipeline_stage not null default 'lead_received',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artist_leads_status_idx on public.artist_leads (status);
create index if not exists artist_leads_assigned_idx on public.artist_leads (assigned_to);
create index if not exists artist_leads_profile_idx on public.artist_leads (artist_profile_id);
create unique index if not exists artist_leads_email_open_unique_idx
  on public.artist_leads (lower(email))
  where status not in ('archived', 'declined', 'expired');

create table if not exists public.deal_offers (
  id uuid primary key default gen_random_uuid(),
  artist_lead_id uuid not null references public.artist_leads(id) on delete cascade,
  offer_type text not null default '50_50_artist_deal',
  royalty_split_label numeric(5,2) not null default 50.00,
  royalty_split_artist numeric(5,2) not null default 50.00,
  advance_amount numeric(12,2),
  term_months integer,
  term_description text,
  territory text not null default 'Worldwide',
  includes_360 boolean not null default false,
  includes_publishing boolean not null default false,
  status public.signing_offer_status not null default 'draft',
  sent_at timestamptz,
  expires_at timestamptz,
  clause_overrides jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_offers_split_total_check
    check (round(royalty_split_label + royalty_split_artist, 2) = 100.00)
);

create index if not exists deal_offers_lead_idx on public.deal_offers (artist_lead_id);
create index if not exists deal_offers_status_idx on public.deal_offers (status);

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version_name text not null,
  body_markdown text not null,
  clause_schema jsonb not null default '{}'::jsonb,
  default_variables jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists contract_templates_name_version_idx
  on public.contract_templates (name, version_name);
create index if not exists contract_templates_active_idx
  on public.contract_templates (active, created_at desc);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  artist_lead_id uuid not null references public.artist_leads(id) on delete cascade,
  deal_offer_id uuid references public.deal_offers(id) on delete set null,
  contract_template_id uuid not null references public.contract_templates(id) on delete restrict,
  current_version_id uuid,
  contract_version_number integer not null default 1,
  rendered_markdown text,
  rendered_html text,
  draft_pdf_path text,
  executed_pdf_path text,
  status public.signing_contract_status not null default 'draft',
  viewed_at timestamptz,
  artist_signed_at timestamptz,
  label_signed_at timestamptz,
  fully_executed_at timestamptz,
  locked_at timestamptz,
  invite_last_sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_lead_idx on public.contracts (artist_lead_id);
create index if not exists contracts_status_idx on public.contracts (status);
create index if not exists contracts_created_at_idx on public.contracts (created_at desc);

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version_number integer not null,
  template_snapshot text not null,
  variables_snapshot jsonb not null default '{}'::jsonb,
  rendered_markdown text not null,
  rendered_html text not null,
  pdf_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (contract_id, version_number)
);

alter table public.contracts
  drop constraint if exists contracts_current_version_id_fkey;

alter table public.contracts
  add constraint contracts_current_version_id_fkey
  foreign key (current_version_id)
  references public.contract_versions(id)
  on update cascade
  on delete set null;

create table if not exists public.contract_signers (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  signer_role public.signer_role not null,
  signer_name text not null,
  signer_email text not null,
  signature_data text,
  signature_path text,
  signed_at timestamptz,
  ip_address inet,
  user_agent text,
  consent_accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (contract_id, signer_role)
);

create index if not exists contract_signers_email_idx on public.contract_signers (lower(signer_email));

create table if not exists public.signature_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  signer_role public.signer_role,
  event_type text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signature_events_contract_idx on public.signature_events (contract_id, created_at desc);
create index if not exists signature_events_type_idx on public.signature_events (event_type, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  artist_lead_id uuid references public.artist_leads(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_lead_idx on public.audit_logs (artist_lead_id, created_at desc);
create index if not exists audit_logs_contract_idx on public.audit_logs (contract_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

create table if not exists public.artist_documents (
  id uuid primary key default gen_random_uuid(),
  artist_lead_id uuid not null references public.artist_leads(id) on delete cascade,
  type text not null,
  file_path text not null,
  file_name text,
  status text not null default 'uploaded',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists artist_documents_lead_idx on public.artist_documents (artist_lead_id, created_at desc);
create index if not exists artist_documents_type_idx on public.artist_documents (type);

create table if not exists public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  artist_lead_id uuid not null references public.artist_leads(id) on delete cascade,
  task_key text not null,
  title text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (artist_lead_id, task_key)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  artist_lead_id uuid not null references public.artist_leads(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  sender_user_id uuid references auth.users(id) on delete set null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_role text not null default 'artist',
  subject text,
  body text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_lead_idx on public.messages (artist_lead_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_user_id, status);

create table if not exists public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invite_tokens_contract_idx on public.invite_tokens (contract_id, created_at desc);
create index if not exists invite_tokens_email_idx on public.invite_tokens (lower(email));
create index if not exists invite_tokens_expiry_idx on public.invite_tokens (expires_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  artist_lead_id uuid references public.artist_leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_lead_idx on public.notifications (artist_lead_id, created_at desc);

drop trigger if exists set_artist_profiles_updated_at on public.artist_profiles;
create trigger set_artist_profiles_updated_at
before update on public.artist_profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists set_artist_leads_updated_at on public.artist_leads;
create trigger set_artist_leads_updated_at
before update on public.artist_leads
for each row
execute function public.handle_updated_at();

drop trigger if exists set_deal_offers_updated_at on public.deal_offers;
create trigger set_deal_offers_updated_at
before update on public.deal_offers
for each row
execute function public.handle_updated_at();

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at
before update on public.contracts
for each row
execute function public.handle_updated_at();

create or replace function public.signing_is_staff()
returns boolean
language sql
stable
as $$
  select
    coalesce(public.is_admin(), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'staff')
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role in ('admin', 'manager', 'booking', 'staff')
    );
$$;

create or replace function public.signing_user_can_access_lead(target_lead_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.signing_is_staff()
    or exists (
      select 1
      from public.artist_leads al
      join public.artist_profiles ap on ap.id = al.artist_profile_id
      where al.id = target_lead_id
        and ap.user_id = auth.uid()
    );
$$;

create or replace function public.signing_user_can_access_contract(target_contract_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.signing_is_staff()
    or exists (
      select 1
      from public.contracts c
      where c.id = target_contract_id
        and public.signing_user_can_access_lead(c.artist_lead_id)
    );
$$;

create or replace function public.prevent_locked_contract_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.locked_at is not null and (to_jsonb(new) - 'updated_at') <> (to_jsonb(old) - 'updated_at') then
    raise exception 'Executed contracts are locked and cannot be modified.';
  end if;

  if old.status = 'fully_executed' and (to_jsonb(new) - 'updated_at') <> (to_jsonb(old) - 'updated_at') then
    raise exception 'Fully executed contracts are immutable.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_locked_contract_mutation on public.contracts;
create trigger trg_prevent_locked_contract_mutation
before update on public.contracts
for each row
execute function public.prevent_locked_contract_mutation();

create or replace function public.sync_contract_milestones()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'artist_viewed_offer' and old.viewed_at is null then
    new.viewed_at = now();
  end if;

  if new.status = 'artist_signed' and old.artist_signed_at is null then
    new.artist_signed_at = coalesce(new.artist_signed_at, now());
  end if;

  if new.status = 'label_counter_signed' and old.label_signed_at is null then
    new.label_signed_at = coalesce(new.label_signed_at, now());
  end if;

  if new.status = 'fully_executed' and old.fully_executed_at is null then
    new.fully_executed_at = now();
    new.locked_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_contract_milestones on public.contracts;
create trigger trg_sync_contract_milestones
before update on public.contracts
for each row
execute function public.sync_contract_milestones();

alter table public.artist_profiles enable row level security;
alter table public.artist_leads enable row level security;
alter table public.deal_offers enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contract_versions enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_signers enable row level security;
alter table public.signature_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.artist_documents enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.messages enable row level security;
alter table public.invite_tokens enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "artist_profiles select own or staff" on public.artist_profiles;
create policy "artist_profiles select own or staff"
on public.artist_profiles
for select
using (public.signing_is_staff() or user_id = auth.uid());

drop policy if exists "artist_profiles insert own or staff" on public.artist_profiles;
create policy "artist_profiles insert own or staff"
on public.artist_profiles
for insert
with check (public.signing_is_staff() or user_id = auth.uid());

drop policy if exists "artist_profiles update own or staff" on public.artist_profiles;
create policy "artist_profiles update own or staff"
on public.artist_profiles
for update
using (public.signing_is_staff() or user_id = auth.uid())
with check (public.signing_is_staff() or user_id = auth.uid());

drop policy if exists "artist_profiles delete staff" on public.artist_profiles;
create policy "artist_profiles delete staff"
on public.artist_profiles
for delete
using (public.signing_is_staff());

drop policy if exists "artist_leads select scoped" on public.artist_leads;
create policy "artist_leads select scoped"
on public.artist_leads
for select
using (public.signing_is_staff() or public.signing_user_can_access_lead(id));

drop policy if exists "artist_leads insert staff" on public.artist_leads;
create policy "artist_leads insert staff"
on public.artist_leads
for insert
with check (public.signing_is_staff());

drop policy if exists "artist_leads update scoped" on public.artist_leads;
create policy "artist_leads update scoped"
on public.artist_leads
for update
using (public.signing_is_staff() or public.signing_user_can_access_lead(id))
with check (public.signing_is_staff() or public.signing_user_can_access_lead(id));

drop policy if exists "artist_leads delete staff" on public.artist_leads;
create policy "artist_leads delete staff"
on public.artist_leads
for delete
using (public.signing_is_staff());

drop policy if exists "deal_offers select scoped" on public.deal_offers;
create policy "deal_offers select scoped"
on public.deal_offers
for select
using (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id));

drop policy if exists "deal_offers write staff" on public.deal_offers;
create policy "deal_offers write staff"
on public.deal_offers
for all
using (public.signing_is_staff())
with check (public.signing_is_staff());

drop policy if exists "contract_templates read staff" on public.contract_templates;
create policy "contract_templates read staff"
on public.contract_templates
for select
using (public.signing_is_staff());

drop policy if exists "contract_templates write staff" on public.contract_templates;
create policy "contract_templates write staff"
on public.contract_templates
for all
using (public.signing_is_staff())
with check (public.signing_is_staff());

drop policy if exists "contract_versions select scoped" on public.contract_versions;
create policy "contract_versions select scoped"
on public.contract_versions
for select
using (public.signing_is_staff() or public.signing_user_can_access_contract(contract_id));

drop policy if exists "contract_versions write staff" on public.contract_versions;
create policy "contract_versions write staff"
on public.contract_versions
for all
using (public.signing_is_staff())
with check (public.signing_is_staff());

drop policy if exists "contracts select scoped" on public.contracts;
create policy "contracts select scoped"
on public.contracts
for select
using (public.signing_is_staff() or public.signing_user_can_access_contract(id));

drop policy if exists "contracts write staff" on public.contracts;
create policy "contracts write staff"
on public.contracts
for all
using (public.signing_is_staff())
with check (public.signing_is_staff());

drop policy if exists "contract_signers select scoped" on public.contract_signers;
create policy "contract_signers select scoped"
on public.contract_signers
for select
using (public.signing_is_staff() or public.signing_user_can_access_contract(contract_id));

drop policy if exists "contract_signers insert scoped" on public.contract_signers;
create policy "contract_signers insert scoped"
on public.contract_signers
for insert
with check (
  public.signing_is_staff()
  or public.signing_user_can_access_contract(contract_id)
);

drop policy if exists "contract_signers update staff" on public.contract_signers;
create policy "contract_signers update staff"
on public.contract_signers
for update
using (public.signing_is_staff())
with check (public.signing_is_staff());

drop policy if exists "contract_signers delete staff" on public.contract_signers;
create policy "contract_signers delete staff"
on public.contract_signers
for delete
using (public.signing_is_staff());

drop policy if exists "signature_events select scoped" on public.signature_events;
create policy "signature_events select scoped"
on public.signature_events
for select
using (public.signing_is_staff() or public.signing_user_can_access_contract(contract_id));

drop policy if exists "signature_events insert scoped" on public.signature_events;
create policy "signature_events insert scoped"
on public.signature_events
for insert
with check (
  public.signing_is_staff()
  or public.signing_user_can_access_contract(contract_id)
);

drop policy if exists "audit_logs select scoped" on public.audit_logs;
create policy "audit_logs select scoped"
on public.audit_logs
for select
using (
  public.signing_is_staff()
  or (artist_lead_id is not null and public.signing_user_can_access_lead(artist_lead_id))
);

drop policy if exists "audit_logs insert scoped" on public.audit_logs;
create policy "audit_logs insert scoped"
on public.audit_logs
for insert
with check (
  public.signing_is_staff()
  or (artist_lead_id is not null and public.signing_user_can_access_lead(artist_lead_id))
);

drop policy if exists "artist_documents select scoped" on public.artist_documents;
create policy "artist_documents select scoped"
on public.artist_documents
for select
using (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id));

drop policy if exists "artist_documents insert scoped" on public.artist_documents;
create policy "artist_documents insert scoped"
on public.artist_documents
for insert
with check (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id));

drop policy if exists "artist_documents update scoped" on public.artist_documents;
create policy "artist_documents update scoped"
on public.artist_documents
for update
using (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id))
with check (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id));

drop policy if exists "artist_documents delete staff" on public.artist_documents;
create policy "artist_documents delete staff"
on public.artist_documents
for delete
using (public.signing_is_staff());

drop policy if exists "onboarding_tasks select scoped" on public.onboarding_tasks;
create policy "onboarding_tasks select scoped"
on public.onboarding_tasks
for select
using (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id));

drop policy if exists "onboarding_tasks insert scoped" on public.onboarding_tasks;
create policy "onboarding_tasks insert scoped"
on public.onboarding_tasks
for insert
with check (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id));

drop policy if exists "onboarding_tasks update scoped" on public.onboarding_tasks;
create policy "onboarding_tasks update scoped"
on public.onboarding_tasks
for update
using (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id))
with check (public.signing_is_staff() or public.signing_user_can_access_lead(artist_lead_id));

drop policy if exists "messages select scoped" on public.messages;
create policy "messages select scoped"
on public.messages
for select
using (
  public.signing_is_staff()
  or public.signing_user_can_access_lead(artist_lead_id)
  or recipient_user_id = auth.uid()
);

drop policy if exists "messages insert scoped" on public.messages;
create policy "messages insert scoped"
on public.messages
for insert
with check (
  public.signing_is_staff()
  or public.signing_user_can_access_lead(artist_lead_id)
);

drop policy if exists "messages update scoped" on public.messages;
create policy "messages update scoped"
on public.messages
for update
using (
  public.signing_is_staff()
  or recipient_user_id = auth.uid()
)
with check (
  public.signing_is_staff()
  or recipient_user_id = auth.uid()
);

drop policy if exists "invite_tokens select staff" on public.invite_tokens;
create policy "invite_tokens select staff"
on public.invite_tokens
for select
using (public.signing_is_staff());

drop policy if exists "invite_tokens write staff" on public.invite_tokens;
create policy "invite_tokens write staff"
on public.invite_tokens
for all
using (public.signing_is_staff())
with check (public.signing_is_staff());

drop policy if exists "notifications select own or staff" on public.notifications;
create policy "notifications select own or staff"
on public.notifications
for select
using (public.signing_is_staff() or user_id = auth.uid());

drop policy if exists "notifications insert staff" on public.notifications;
create policy "notifications insert staff"
on public.notifications
for insert
with check (public.signing_is_staff());

drop policy if exists "notifications update own or staff" on public.notifications;
create policy "notifications update own or staff"
on public.notifications
for update
using (public.signing_is_staff() or user_id = auth.uid())
with check (public.signing_is_staff() or user_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('signing-contracts', 'signing-contracts', false),
  ('signing-documents', 'signing-documents', false),
  ('signing-signatures', 'signing-signatures', false)
on conflict (id) do nothing;

drop policy if exists "signing storage read" on storage.objects;
create policy "signing storage read"
on storage.objects
for select
using (
  bucket_id in ('signing-contracts', 'signing-documents', 'signing-signatures')
  and (
    public.signing_is_staff()
    or (
      array_length(storage.foldername(name), 1) >= 1
      and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
      and public.signing_user_can_access_lead((storage.foldername(name))[1]::uuid)
    )
  )
);

drop policy if exists "signing storage write" on storage.objects;
create policy "signing storage write"
on storage.objects
for all
using (
  bucket_id in ('signing-contracts', 'signing-documents', 'signing-signatures')
  and (
    public.signing_is_staff()
    or (
      array_length(storage.foldername(name), 1) >= 1
      and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
      and public.signing_user_can_access_lead((storage.foldername(name))[1]::uuid)
    )
  )
)
with check (
  bucket_id in ('signing-contracts', 'signing-documents', 'signing-signatures')
  and (
    public.signing_is_staff()
    or (
      array_length(storage.foldername(name), 1) >= 1
      and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
      and public.signing_user_can_access_lead((storage.foldername(name))[1]::uuid)
    )
  )
);

insert into public.contract_templates (
  name,
  version_name,
  body_markdown,
  clause_schema,
  default_variables,
  active
)
values (
  'EM Records 50/50 Artist Deal',
  'v1.0',
  $template$
# EM RECORDS ARTIST AGREEMENT (50/50)

This Artist Agreement ("Agreement") is entered into on **{{effective_date}}** between **{{label_legal_entity}}** ("Label") and **{{artist_legal_name}}**, professionally known as **{{artist_stage_name}}** ("Artist").

## 1. Term and Territory
- Term: {{term}}
- Territory: {{territory}}

## 2. Revenue Participation
- Net revenue split: Label {{royalty_split_label}}% / Artist {{royalty_split_artist}}%.
- Accounting frequency: {{accounting_frequency}}.
- Advance (if any): {{advance_amount}}.
- Recoupment terms: {{recoupment_terms}}.

## 3. Ownership and Rights
- Master ownership: {{master_ownership_language}}.
- Exploitation rights: {{exploitation_rights_clause}}.
- Anti-bypass: {{anti_bypass_clause}}.
- Exclusivity: {{exclusivity}}.
- Revenue participation scope: {{revenue_participation}}.

[if:includes_publishing]
## 4. Publishing
{{publishing_language}}
[/if:includes_publishing]

[if:includes_360]
## 5. 360 Participation
{{clause_360_language}}
[/if:includes_360]

[if:perpetual_master_rights]
## 6. Perpetual Master Rights
{{perpetual_master_rights_clause}}
[/if:perpetual_master_rights]

## 7. Delivery and Creative Obligations
- Production obligations: {{production_obligations}}.
- Video/content obligations: {{video_content_obligations}}.
- Delivery obligations: {{delivery_obligations}}.

## 8. Legal and Performance
- Termination / breach: {{termination_breach_language}}.
- Additional terms: This Agreement is designed for professional e-sign workflows and is supported by an auditable event log.

## 9. Signatures
By signing, each party acknowledges consent to conduct business electronically.
$template$,
  '{
    "includes_publishing": true,
    "includes_360": false,
    "perpetual_master_rights": false
  }'::jsonb,
  '{
    "label_legal_entity": "EM Records LLC",
    "effective_date": "",
    "term": "24 months",
    "territory": "Worldwide",
    "royalty_split_label": "50",
    "royalty_split_artist": "50",
    "advance_amount": "$0.00",
    "recoupment_terms": "Advance, recording, marketing and approved direct costs are recoupable from Artist share.",
    "master_ownership_language": "Label shall own all Masters created under this Agreement.",
    "publishing_language": "Publishing participation only applies where explicitly approved in writing by Label.",
    "production_obligations": "Artist will deliver commercially satisfactory recordings as scheduled by Label.",
    "video_content_obligations": "Artist will participate in agreed visual content campaigns and promotional shoots.",
    "delivery_obligations": "Artist will deliver stems, metadata and required assets per Label standards.",
    "exclusivity": "Artist records exclusively for Label during the Term.",
    "revenue_participation": "Revenue participation includes exploitation of Masters across DSP, sync, UGC and direct channels.",
    "accounting_frequency": "Quarterly",
    "termination_breach_language": "Material breach not cured within 30 days may result in termination by non-breaching party.",
    "anti_bypass_clause": "Artist will not circumvent Label relationships introduced under this Agreement.",
    "exploitation_rights_clause": "Label has exclusive right to market, distribute, license and monetize Masters.",
    "clause_360_language": "Label shares participation in approved ancillary entertainment income tied to Artist brand activities.",
    "perpetual_master_rights_clause": "Label retains perpetual ownership in Masters delivered under this Agreement."
  }'::jsonb,
  true
)
on conflict (name, version_name) do nothing;

