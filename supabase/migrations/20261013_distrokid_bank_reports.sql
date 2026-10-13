-- Historical DistroKid statements are snapshots, not cash-flow ledger entries.
-- No financial details are committed to the public source repository.
create table if not exists public.finance_distrokid_reports (
  id uuid primary key default gen_random_uuid(),
  source_file_name text not null,
  source_sha256 text not null unique check (source_sha256 ~ '^[0-9a-f]{64}$'),
  captured_on date not null,
  earnings_from date not null,
  earnings_through date not null check (earnings_through >= earnings_from),
  streaming_earnings_cents bigint not null check (streaming_earnings_cents >= 0),
  withdrawals_cents bigint not null check (withdrawals_cents >= 0),
  adjustments_cents bigint not null,
  owed_cents bigint not null,
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services)='array'),
  withdrawals jsonb not null default '[]'::jsonb check (jsonb_typeof(withdrawals)='array'),
  adjustments jsonb not null default '[]'::jsonb check (jsonb_typeof(adjustments)='array'),
  note text,
  imported_at timestamptz not null default now(),
  constraint distrokid_report_reconciles check
    (streaming_earnings_cents + adjustments_cents - withdrawals_cents = owed_cents)
);
create index if not exists finance_distrokid_reports_captured_idx
  on public.finance_distrokid_reports (captured_on desc, imported_at desc);
alter table public.finance_distrokid_reports enable row level security;
revoke all on table public.finance_distrokid_reports from anon, authenticated;
grant all on table public.finance_distrokid_reports to service_role;
