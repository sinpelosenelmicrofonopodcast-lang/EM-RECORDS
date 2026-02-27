alter table public.releases
add column if not exists artist_slug text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'releases_artist_slug_fkey'
  ) then
    alter table public.releases
    add constraint releases_artist_slug_fkey
    foreign key (artist_slug)
    references public.artists(slug)
    on update cascade
    on delete set null;
  end if;
end
$$;
