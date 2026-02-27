alter table if exists public.artists
add column if not exists spotify_embed text,
add column if not exists soundcloud_embed text,
add column if not exists music_video_embed text,
add column if not exists interview_url_1 text,
add column if not exists interview_url_2 text;
