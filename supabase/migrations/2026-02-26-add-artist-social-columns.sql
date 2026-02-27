alter table if exists public.artists
add column if not exists instagram_url text,
add column if not exists tiktok_url text,
add column if not exists x_url text,
add column if not exists facebook_url text;
