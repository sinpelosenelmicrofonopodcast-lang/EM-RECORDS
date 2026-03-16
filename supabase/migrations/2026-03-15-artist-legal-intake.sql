alter table if exists public.artist_profiles
  add column if not exists professional_email text,
  add column if not exists government_id text,
  add column if not exists nationality text,
  add column if not exists residence_city text,
  add column if not exists residence_country text,
  add column if not exists residence_state_region text,
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists postal_code text,
  add column if not exists primary_genre text,
  add column if not exists representing_country text,
  add column if not exists manager_name text,
  add column if not exists manager_email text,
  add column if not exists manager_phone text;

alter table if exists public.artist_leads
  add column if not exists professional_email text,
  add column if not exists government_id text,
  add column if not exists nationality text,
  add column if not exists residence_city text,
  add column if not exists residence_country text,
  add column if not exists residence_state_region text,
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text,
  add column if not exists postal_code text,
  add column if not exists primary_genre text,
  add column if not exists representing_country text,
  add column if not exists manager_name text,
  add column if not exists manager_email text,
  add column if not exists manager_phone text;

update public.artist_profiles
set
  government_name = coalesce(nullif(government_name, ''), legal_name),
  residence_country = coalesce(nullif(residence_country, ''), nullif(country, '')),
  residence_state_region = coalesce(nullif(residence_state_region, ''), nullif(state, ''))
where true;

update public.artist_leads
set
  government_name = coalesce(nullif(government_name, ''), legal_name),
  residence_country = coalesce(nullif(residence_country, ''), nullif(country, '')),
  residence_state_region = coalesce(nullif(residence_state_region, ''), nullif(state, ''))
where true;

create index if not exists artist_profiles_professional_email_idx
  on public.artist_profiles (lower(professional_email))
  where professional_email is not null;

create index if not exists artist_leads_professional_email_idx
  on public.artist_leads (lower(professional_email))
  where professional_email is not null;
