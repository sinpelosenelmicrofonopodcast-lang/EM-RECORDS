-- EM Records private financial ledger. Only the authenticated server uses a service client.
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('expense','income')),
  occurred_on date not null default current_date,
  description text not null check (char_length(trim(description)) between 2 and 180),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 999999999999),
  category text not null check (char_length(trim(category)) between 2 and 80),
  artist_id uuid references public.artists(id) on delete set null,
  release_id uuid references public.releases(id) on delete set null,
  project_name text,
  counterparty text,
  payment_method text not null default 'other'
    check (payment_method in ('card','bank','cash','paypal','other')),
  receipt_path text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists finance_transactions_date_idx on public.finance_transactions(occurred_on desc);
create index if not exists finance_transactions_artist_idx on public.finance_transactions(artist_id, occurred_on desc);
create index if not exists finance_transactions_release_idx on public.finance_transactions(release_id, occurred_on desc);
create index if not exists finance_transactions_kind_idx on public.finance_transactions(kind, category);

create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  month date not null check (extract(day from month)=1),
  category text not null check (char_length(trim(category)) between 2 and 80),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 999999999999),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(month, category)
);
create index if not exists finance_budgets_month_idx on public.finance_budgets(month);

alter table public.finance_transactions enable row level security;
alter table public.finance_budgets enable row level security;
-- No authenticated or anonymous Data API access. Every read/write is mediated
-- by an admin-checked Next.js server handler; the service key is server-only.
revoke all on table public.finance_transactions from anon, authenticated;
revoke all on table public.finance_budgets from anon, authenticated;
grant all on table public.finance_transactions to service_role;
grant all on table public.finance_budgets to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('em-finance-receipts', 'em-finance-receipts', false, 8388608,
  array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do update
set public=false, file_size_limit=8388608,
    allowed_mime_types=array['application/pdf','image/png','image/jpeg','image/webp'];
