-- Release pre-save support for coming soon cards

alter table if exists public.releases
  add column if not exists pre_save_url text;

do $$
begin
  if to_regclass('public.smartlinks') is not null then
    update public.releases as r
    set pre_save_url = coalesce(
      nullif(trim(r.pre_save_url), ''),
      nullif(trim((s.presave ->> 'url')), '')
    )
    from public.smartlinks as s
    where s.release_id = r.id
      and (r.pre_save_url is null or length(trim(r.pre_save_url)) = 0);
  end if;
end
$$;
