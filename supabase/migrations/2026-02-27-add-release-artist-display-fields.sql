alter table public.releases
add column if not exists artist_name text,
add column if not exists featuring text;

update public.releases as r
set artist_name = a.name
from public.artists as a
where r.artist_slug = a.slug
  and coalesce(nullif(trim(r.artist_name), ''), '') = '';
