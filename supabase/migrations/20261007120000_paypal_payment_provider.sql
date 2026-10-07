-- Migrate payment persistence from Stripe-only fields to provider-neutral PayPal-ready fields.
-- Existing Stripe history is preserved; new orders default to PayPal.

alter table public.orders
  alter column stripe_session_id drop not null;

alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text;

update public.orders
set payment_provider = case
  when stripe_session_id is not null then 'stripe'
  else 'paypal'
end
where payment_provider is null;

alter table public.orders
  alter column payment_provider set default 'paypal',
  alter column payment_provider set not null;

create unique index if not exists orders_paypal_order_id_key
  on public.orders(paypal_order_id)
  where paypal_order_id is not null;

create unique index if not exists orders_paypal_capture_id_key
  on public.orders(paypal_capture_id)
  where paypal_capture_id is not null;

alter table public.ticket_orders
  alter column stripe_session_id drop not null;

alter table public.ticket_orders
  add column if not exists payment_provider text,
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text;

update public.ticket_orders
set payment_provider = case
  when stripe_session_id is not null then 'stripe'
  else 'paypal'
end
where payment_provider is null;

alter table public.ticket_orders
  alter column payment_provider set default 'paypal',
  alter column payment_provider set not null;

create unique index if not exists ticket_orders_paypal_order_id_key
  on public.ticket_orders(paypal_order_id)
  where paypal_order_id is not null;

create unique index if not exists ticket_orders_paypal_capture_id_key
  on public.ticket_orders(paypal_capture_id)
  where paypal_capture_id is not null;

alter table public.events
  add column if not exists ticket_price_cents integer,
  add column if not exists ticket_currency text not null default 'USD';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='events_ticket_price_cents_nonnegative'
      and conrelid='public.events'::regclass
  ) then
    alter table public.events
      add constraint events_ticket_price_cents_nonnegative
      check (ticket_price_cents is null or ticket_price_cents >= 0);
  end if;
end $$;

create table if not exists public.paypal_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  paypal_order_id text not null unique,
  paypal_capture_id text unique,
  kind text not null check (kind in ('ticket','beat')),
  event_id uuid references public.events(id) on delete restrict,
  beat_id uuid references public.beats(id) on delete restrict,
  license_type text,
  buyer_email text,
  quantity integer not null default 1 check (quantity > 0),
  amount_total integer not null check (amount_total >= 0),
  currency text not null default 'USD',
  status text not null default 'created'
    check (status in ('created','approved','captured','completed','cancelled','denied','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

alter table public.paypal_payment_sessions enable row level security;

create index if not exists paypal_payment_sessions_status_idx
  on public.paypal_payment_sessions(status, created_at desc);

create index if not exists paypal_payment_sessions_event_idx
  on public.paypal_payment_sessions(event_id)
  where event_id is not null;

create index if not exists paypal_payment_sessions_beat_idx
  on public.paypal_payment_sessions(beat_id)
  where beat_id is not null;


create unique index if not exists paypal_active_exclusive_beat_session_key
  on public.paypal_payment_sessions(beat_id)
  where kind='beat'
    and lower(coalesce(license_type,''))='exclusive'
    and status in ('created','approved','captured');


drop policy if exists "paypal sessions deny client access"
on public.paypal_payment_sessions;

create policy "paypal sessions deny client access"
on public.paypal_payment_sessions
for all
to anon, authenticated
using (false)
with check (false);
