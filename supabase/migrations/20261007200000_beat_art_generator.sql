alter table public.beats
  add column if not exists art_mode text not null default 'generated',
  add column if not exists art_style text not null default 'signature',
  add column if not exists art_seed integer not null default 1,
  add column if not exists art_version integer not null default 1,
  add column if not exists art_updated_at timestamptz;

update public.beats
set art_mode='generated',
    art_style=case
      when lower(coalesce(genre,'')) like '%trap%' then 'noir'
      when lower(coalesce(genre,'')) like '%bachata%' then 'luxury'
      when lower(coalesce(genre,'')) like '%r&b%' or lower(coalesce(genre,'')) like '%soul%' then 'velvet'
      when lower(coalesce(genre,'')) like '%reggaeton%' or lower(coalesce(genre,'')) like '%urban%' then 'neon'
      else 'signature'
    end,
    art_updated_at=now()
where art_mode is distinct from 'generated' or art_updated_at is null;
