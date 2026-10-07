alter table public.beat_inquiries
  drop constraint if exists beat_inquiries_status_check;

alter table public.beat_inquiries
  add constraint beat_inquiries_status_check
  check (status = any (array[
    'new'::text,
    'in_review'::text,
    'awaiting_customer'::text,
    'negotiating'::text,
    'paid'::text,
    'fulfilled'::text,
    'closed'::text,
    'declined'::text
  ]));
