-- Optional sample content for EM Records.
-- Creates/updates admin profile from existing auth user email.

insert into public.profiles (id, email, is_admin)
select id, email, true
from auth.users
where email = 'emrecordsllc@gmail.com'
on conflict (id) do update set
  email = excluded.email,
  is_admin = true;

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

insert into public.releases (title, format, cover_url, release_date, description, featured, content_status, publish_at)
values
  ('Create It', 'Single', '/images/release-create-it.jpg', '2026-03-21', 'Sample featured release.', true, 'published', now())
on conflict do nothing;

insert into public.events (title, venue, city, country, starts_at, stripe_price_id, sponsors, status)
values
  ('EM NIGHT: Miami', 'Factory Town', 'Miami', 'USA', now() + interval '30 days', 'price_example_1', array['Monster Energy', 'Sony Music Latin'], 'upcoming')
on conflict do nothing;
