-- Retire legacy Killeen Next Up intake while preserving historical data.

update public.next_up_settings
set voting_enabled = false,
    updated_at = now()
where voting_enabled is distinct from false;

create or replace function private.reject_retired_next_up_submission()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Killeen Next Up submissions are retired';
end;
$$;

drop trigger if exists block_retired_next_up_submissions
on public.next_up_submissions;

create trigger block_retired_next_up_submissions
before insert on public.next_up_submissions
for each row
execute function private.reject_retired_next_up_submission();
