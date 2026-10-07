alter table public.beats
  add column if not exists display_title text,
  add column if not exists preview_start_seconds integer not null default 15,
  add column if not exists preview_duration_seconds integer not null default 45;

insert into public.beat_categories(name,slug) values
  ('Reggaeton','reggaeton'),
  ('Perreo / Neo Perreo','perreo-neo-perreo'),
  ('Trap Latino','trap-latino'),
  ('Bachata','bachata'),
  ('Afrobeat','afrobeat'),
  ('Drill','drill'),
  ('Reggae / Roots','reggae-roots'),
  ('Pop Urbano / Melodic','pop-urbano-melodic'),
  ('Fusion / Alternative','fusion-alternative')
on conflict (slug) do update set name=excluded.name;

delete from public.beat_categories
where slug='melodic'
  and not exists(select 1 from public.beats where category_id=beat_categories.id);

with classified as (
  select b.id,
    case
      when lower(b.title) like '%bachata%' then 'bachata'
      when lower(b.title) like '%afrobeat%' or lower(b.title) like '% rbeld afro %' then 'afrobeat'
      when lower(b.title) like '%drill%' then 'drill'
      when lower(b.title) ~ '(^|[^a-z])reggae([^a-z]|$)' then 'reggae-roots'
      when lower(b.title) like '%neo perreo%' or lower(b.title) like '%perreo%' then 'perreo-neo-perreo'
      when lower(b.title) like '%trap%' or lower(coalesce(b.genre,''))='trap'
        or exists(select 1 from unnest(coalesce(b.tags,array[]::text[])) t where lower(t) like '%trap latino%')
        then 'trap-latino'
      when lower(coalesce(b.genre,'')) like '%latin pop%'
        or lower(b.title) like '%nostalgia%'
        or lower(b.title) like '%falling for the echo%'
        or lower(b.title) like '%sombra en la luz%'
        or lower(b.title) like '%urban fuego en la noche%'
        or lower(b.title) like '%urban a minor%'
        or lower(b.title) like '%rbeld urban%'
        then 'pop-urbano-melodic'
      when lower(b.title) like '%retro futurism%'
        or lower(b.title) like '%transformer%'
        or lower(b.title) like '%transfomer%'
        or lower(b.title) like '%algarete%'
        or lower(b.title) like '%hybrid trap reggaeton%'
        then 'fusion-alternative'
      else 'reggaeton'
    end as slug
  from public.beats b
)
update public.beats b
set category_id=c.id
from classified x
join public.beat_categories c on c.slug=x.slug
where b.id=x.id;

update public.beats
set bpm=(regexp_match(title,'([0-9]{2,3})\s*[Bb][Pp][Mm]'))[1]::int
where coalesce(bpm,0)=0 and title ~* '([0-9]{2,3})\s*BPM';

update public.beats
set key=replace(replace(
  (regexp_match(title,'([A-G](?:#|♯|b|♭)?\s+(?:Major|Minor))','i'))[1],
  '♯','#'),'♭','b')
where title ~* '([A-G](?:#|♯|b|♭)?\s+(?:Major|Minor))';

update public.beats
set display_title=nullif(trim(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(title,'^\s*[0-9]+\s+','','i'),
        '\s*\|\s*Beat\s+Urbano\s+Latino.*$','','i'
      ),
      '\s+[A-G](?:#|♯|b|♭)?\s+(?:Major|Minor)(?:\s*[,\-]?\s*[0-9]{2,3}\s*BPM\.?)?\s*$','','i'
    ),
    '\s+[0-9]{2,3}\s*BPM\.?\s*$','','i'
  )
),'')
where display_title is null or btrim(display_title)='';

update public.beats
set display_title=trim(regexp_replace(display_title,'^Rbeld\s+','','i'))
where display_title ~* '^Rbeld\s+';

update public.beats
set display_title=trim(regexp_replace(
  display_title,
  '\s+[A-G](?:#|♯|b|♭)?\s+(?:Major|Minor)\s+[0-9]{2,3}\s*$',
  '',
  'i'
))
where display_title ~* '[A-G](#|♯|b|♭)?\s+(Major|Minor)\s+[0-9]{2,3}\s*$';

with numbered as (
  select id,title,display_title,(regexp_match(title,'^\s*([0-9]+)'))[1] as n
  from public.beats
)
update public.beats b
set display_title=case
  when lower(n.display_title)='rbeld' then 'Beat '||n.n
  when lower(n.display_title) in ('bachata','afro','urban','reggaeton') then initcap(lower(n.display_title))||' '||n.n
  when n.display_title ~* '^[A-G](#|♯|b|♭)?\s+(major|minor)$' then 'Beat '||n.n
  else n.display_title
end
from numbered n
where b.id=n.id and n.n is not null;

with dup as (
  select display_title from public.beats group by display_title having count(*)>1
), numbered as (
  select b.id,b.display_title,(regexp_match(b.title,'^\s*([0-9]+)'))[1] as n
  from public.beats b join dup d using(display_title)
)
update public.beats b
set display_title=n.display_title||' '||n.n
from numbered n
where b.id=n.id and n.n is not null;

update public.beats set display_title='Beat 40' where title='40 A♯ Minor 91 BPM';
update public.beats set display_title='Trap 30' where title='30 Trap F Minor 51 BPM';
