create table if not exists public.beat_inquiries (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references public.beats(id) on delete restrict,
  requester_name text not null check (char_length(requester_name) between 1 and 120),
  requester_email text not null check (char_length(requester_email) between 3 and 320),
  license_type text not null default 'unsure'
    check (license_type in ('basic','standard','premium','exclusive','unsure')),
  status text not null default 'new'
    check (status in ('new','in_review','awaiting_customer','negotiating','closed','declined')),
  access_token_hash text not null unique,
  assigned_to uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beat_inquiries_status_last_message_idx
  on public.beat_inquiries(status, last_message_at desc);
create index if not exists beat_inquiries_beat_idx
  on public.beat_inquiries(beat_id);
create index if not exists beat_inquiries_email_idx
  on public.beat_inquiries(lower(requester_email));

create table if not exists public.beat_inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.beat_inquiries(id) on delete cascade,
  sender_kind text not null check (sender_kind in ('customer','staff')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists beat_inquiry_messages_inquiry_created_idx
  on public.beat_inquiry_messages(inquiry_id, created_at);

alter table public.beat_inquiries enable row level security;
alter table public.beat_inquiry_messages enable row level security;

revoke all on public.beat_inquiries from anon, authenticated;
revoke all on public.beat_inquiry_messages from anon, authenticated;

grant select, insert, update, delete on public.beat_inquiries to service_role;
grant select, insert, update, delete on public.beat_inquiry_messages to service_role;
