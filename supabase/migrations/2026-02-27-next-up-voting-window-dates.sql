alter table if exists public.next_up_settings
add column if not exists voting_ends_at timestamptz;

update public.next_up_settings
set voting_starts_at = coalesce(voting_starts_at, '2026-03-13T00:00:00-05:00'::timestamptz),
    voting_ends_at = coalesce(voting_ends_at, '2026-04-03T23:59:59-05:00'::timestamptz),
    voting_enabled = coalesce(voting_enabled, false)
where id = 'default';

insert into public.next_up_settings (id, live_final_at, voting_enabled, voting_starts_at, voting_ends_at)
values ('default', null, false, '2026-03-13T00:00:00-05:00'::timestamptz, '2026-04-03T23:59:59-05:00'::timestamptz)
on conflict (id) do update set
  voting_enabled = excluded.voting_enabled,
  voting_starts_at = excluded.voting_starts_at,
  voting_ends_at = excluded.voting_ends_at;
