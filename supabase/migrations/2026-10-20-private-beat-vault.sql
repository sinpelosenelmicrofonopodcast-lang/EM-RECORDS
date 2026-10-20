-- Private Beat Vault: one-time high-entropy invitation keys and revocable listening sessions.
-- All access goes through trusted server endpoints; no anon/authenticated Data API access.
create table if not exists public.beat_vault_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 80),
  code_hash text not null unique check (char_length(code_hash)=64),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.beat_vault_sessions (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.beat_vault_keys(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash)=64),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists beat_vault_sessions_key_idx on public.beat_vault_sessions(key_id);
create table if not exists public.beat_vault_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null check (char_length(ip_hash)=64),
  created_at timestamptz not null default now()
);
create index if not exists beat_vault_attempts_limit_idx on public.beat_vault_attempts(ip_hash,created_at desc);
alter table public.beat_vault_keys enable row level security;
alter table public.beat_vault_sessions enable row level security;
alter table public.beat_vault_attempts enable row level security;
revoke all on public.beat_vault_keys,public.beat_vault_sessions,public.beat_vault_attempts from anon,authenticated;
grant all on public.beat_vault_keys,public.beat_vault_sessions,public.beat_vault_attempts to service_role;
grant usage, select on sequence public.beat_vault_attempts_id_seq to service_role;
comment on table public.beat_vault_keys is 'Access codes are generated with 144 bits entropy and stored only as SHA256 digests.';
comment on table public.beat_vault_sessions is 'Revocable HttpOnly sessions; random tokens are only stored as SHA256 digests.';
