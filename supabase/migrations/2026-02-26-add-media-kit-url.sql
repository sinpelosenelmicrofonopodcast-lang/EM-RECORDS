alter table if exists public.artists
add column if not exists media_kit_url text;
