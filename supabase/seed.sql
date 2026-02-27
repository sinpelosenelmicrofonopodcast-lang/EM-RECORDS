-- Optional sample content for EM Records.
-- Creates/updates admin profile from existing auth user email.

insert into public.profiles (id, email, is_admin)
select id, email, true
from auth.users
where email = 'emrecordsllc@gmail.com'
on conflict (id) do update set
  email = excluded.email,
  is_admin = true;

insert into public.social_links (label, url, sort_order, is_active)
values
  ('Instagram', 'https://www.instagram.com/emrecordsllc', 1, true),
  ('YouTube', 'https://www.youtube.com/@emrecordsllc', 2, true),
  ('Facebook', 'https://www.facebook.com/emrecords020288', 3, true)
on conflict (url) do nothing;

insert into public.artists (
  name, slug, tagline, bio, hero_media_url, avatar_url, booking_email,
  spotify_embed, soundcloud_embed, music_video_embed, interview_url_1, interview_url_2,
  media_kit_url, instagram_url, tiktok_url, x_url, facebook_url, epk_enabled
)
values
  (
    'NOVA K', 'nova-k', 'Neo-reggaeton con precision global.', 'Sample bio for Nova K.',
    '/images/artist-novak.jpg', '/images/artist-novak.jpg', 'booking@emrecords.com',
    'https://open.spotify.com/embed/track/7ouMYWpwJ422jRcDASZB7P',
    'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293',
    'https://www.youtube.com/embed/ScMzIvxBSi4',
    'https://billboard.com', 'https://rollingstone.com',
    '/press/novak-media-kit.zip', 'https://instagram.com', 'https://tiktok.com', 'https://x.com', 'https://facebook.com', true
  ),
  (
    'LUNA VEGA', 'luna-vega', 'Vocals etereos sobre percussion callejera.', 'Sample bio for Luna Vega.',
    '/images/artist-luna.jpg', '/images/artist-luna.jpg', 'booking@emrecords.com',
    'https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3',
    'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/300',
    'https://www.youtube.com/embed/ScMzIvxBSi4',
    'https://complex.com', 'https://vice.com',
    '/press/luna-media-kit.zip', 'https://instagram.com', 'https://tiktok.com', 'https://x.com', 'https://facebook.com', true
  )
on conflict (slug) do nothing;

insert into public.releases (title, format, cover_url, release_date, description, artist_slug, featured, content_status, publish_at)
values
  ('Create It', 'Single', '/images/release-create-it.jpg', '2026-03-21', 'Sample featured release.', 'nova-k', true, 'published', now())
on conflict do nothing;

insert into public.events (title, venue, city, country, starts_at, stripe_price_id, sponsors, status)
values
  ('EM NIGHT: Miami', 'Factory Town', 'Miami', 'USA', now() + interval '30 days', 'price_example_1', array['Monster Energy', 'Sony Music Latin'], 'upcoming')
on conflict do nothing;

insert into public.next_up_submissions (stage_name, legal_name, email, phone, city, demo_url, social_links, artist_bio, status)
values
  ('RAY KILLEEN', 'Ray Morales', 'ray@example.com', '+1 254-555-0192', 'Killeen, TX', 'https://soundcloud.com', 'https://instagram.com/raykilleen', 'Latin trap artist from Killeen.', 'approved')
on conflict do nothing;

insert into public.next_up_competitors (stage_name, city, photo_url, demo_url, social_links, artist_bio, status)
values
  ('RAY KILLEEN', 'Killeen, TX', '/images/artist-novak.jpg', 'https://soundcloud.com', 'https://instagram.com/raykilleen', 'Latin trap artist from Killeen.', 'approved'),
  ('LA MUSA 254', 'Harker Heights, TX', '/images/artist-luna.jpg', 'https://www.youtube.com/watch?v=ScMzIvxBSi4', 'https://instagram.com/lamusa254', 'Urban latin singer-songwriter.', 'approved')
on conflict do nothing;

insert into public.next_up_settings (id, live_final_at, voting_enabled, voting_starts_at, voting_ends_at)
values ('default', null, false, '2026-03-13T00:00:00-05:00'::timestamptz, '2026-04-03T23:59:59-05:00'::timestamptz)
on conflict (id) do update set
  voting_enabled = excluded.voting_enabled,
  voting_starts_at = excluded.voting_starts_at,
  voting_ends_at = excluded.voting_ends_at;
