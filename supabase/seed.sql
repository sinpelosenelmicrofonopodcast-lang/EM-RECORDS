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

-- =====================================================
-- Artist Hub seed (requires 2026-03-04-artist-hub.sql migration)
-- =====================================================

insert into public.profiles (id, email, full_name, is_admin)
select id, email, 'EM Admin', true from auth.users where email = 'emrecordsllc@gmail.com'
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, is_admin = true;

insert into public.profiles (id, email, full_name, is_admin)
select id, email, 'EM Artist Demo', false from auth.users where email = 'artist@emrecords.com'
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.profiles (id, email, full_name, is_admin)
select id, email, 'EM Manager Demo', false from auth.users where email = 'manager@emrecords.com'
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.profiles (id, email, full_name, is_admin)
select id, email, 'EM Booking Demo', false from auth.users where email = 'booking@emrecords.com'
on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;

insert into public.user_roles (user_id, role)
select id, 'admin'::public.hub_role from auth.users where email = 'emrecordsllc@gmail.com'
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select id, 'artist'::public.hub_role from auth.users where email = 'artist@emrecords.com'
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select id, 'manager'::public.hub_role from auth.users where email = 'manager@emrecords.com'
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select id, 'booking'::public.hub_role from auth.users where email = 'booking@emrecords.com'
on conflict (user_id, role) do nothing;

with demo_artist as (
  select id from public.artists where slug = 'nova-k' limit 1
)
insert into public.artist_members (artist_id, user_id, role, permissions)
select da.id, u.id, 'artist'::public.hub_role, '{"can_approve_content": false}'::jsonb
from demo_artist da
join auth.users u on u.email = 'artist@emrecords.com'
on conflict (artist_id, user_id, role) do nothing;

with demo_artist as (
  select id from public.artists where slug = 'nova-k' limit 1
)
insert into public.artist_members (artist_id, user_id, role, permissions)
select da.id, u.id, 'manager'::public.hub_role, '{"can_approve_content": true}'::jsonb
from demo_artist da
join auth.users u on u.email = 'manager@emrecords.com'
on conflict (artist_id, user_id, role) do nothing;

with demo_artist as (
  select id from public.artists where slug = 'nova-k' limit 1
)
insert into public.artist_members (artist_id, user_id, role, permissions)
select da.id, u.id, 'booking'::public.hub_role, '{"can_approve_content": true}'::jsonb
from demo_artist da
join auth.users u on u.email = 'booking@emrecords.com'
on conflict (artist_id, user_id, role) do nothing;

with demo_artist as (
  select id from public.artists where slug = 'nova-k' limit 1
), demo_release as (
  select id, artist_id from public.releases where title = 'Create It' limit 1
)
insert into public.songs (artist_id, release_id, title, isrc, explicit, language, bpm, key, links)
select da.id, dr.id, 'Create It', 'QM4TX2699001', false, 'es', 95, 'Gm',
       '{"spotify":"https://open.spotify.com/track/7ouMYWpwJ422jRcDASZB7P","youtube":"https://youtu.be/ScMzIvxBSi4"}'::jsonb
from demo_artist da
left join demo_release dr on dr.artist_id = da.id
where not exists (
  select 1 from public.songs s where s.artist_id = da.id and lower(s.title) = lower('Create It')
);

insert into public.media_kits (artist_id, headline, one_liner, highlights, press_quotes, stats, contacts, featured_tracks)
select
  a.id,
  'EM Records Artist',
  'Latino urban sound with global projection.',
  '["Top local performer","Festival-ready show","Strong streaming growth"]'::jsonb,
  '["\"A new voice with major label discipline.\""]'::jsonb,
  '{"monthly_listeners":"120k","instagram":"@emrecordsllc"}'::jsonb,
  '{"manager":"manager@emrecords.com","booking":"booking@emrecords.com"}'::jsonb,
  '["Create It"]'::jsonb
from public.artists a
where a.slug = 'nova-k'
on conflict (artist_id) do nothing;

-- =====================================================
-- Artist Signing System seed (requires 2026-03-12-artist-signing-system.sql migration)
-- =====================================================

do $$
declare
  v_artist_user_id uuid;
  v_profile_id uuid;
  v_artist_profile_id uuid;
  v_lead_id uuid;
  v_offer_id uuid;
  v_contract_id uuid;
  v_contract_version_id uuid;
  v_template_id uuid;
begin
  select id into v_artist_user_id from auth.users where email = 'artist@emrecords.com' limit 1;
  select id into v_profile_id from public.profiles where email = 'artist@emrecords.com' limit 1;
  select id into v_template_id
  from public.contract_templates
  where name in ('EM Records Artist Recording Agreement', 'EM Records 50/50 Artist Deal')
  order by case when name = 'EM Records Artist Recording Agreement' then 0 else 1 end, created_at desc
  limit 1;

  if v_template_id is null then
    return;
  end if;

  insert into public.artist_profiles (
    user_id,
    profile_id,
    legal_name,
    stage_name,
    email,
    phone,
    country,
    state,
    government_name,
    pro_affiliation,
    ipi_number,
    social_links,
    notes
  )
  values (
    v_artist_user_id,
    v_profile_id,
    'Adrian Morales',
    'Nova K',
    'artist@emrecords.com',
    '+1 786-555-0177',
    'United States',
    'Florida',
    'Adrian Morales',
    'BMI',
    null,
    '{"instagram":"https://instagram.com/novak","tiktok":"https://tiktok.com/@novak"}'::jsonb,
    'Demo artist profile for signing workflow.'
  )
  on conflict ((lower(email))) do update set
    user_id = excluded.user_id,
    profile_id = excluded.profile_id,
    legal_name = excluded.legal_name,
    stage_name = excluded.stage_name,
    phone = excluded.phone,
    country = excluded.country,
    state = excluded.state,
    government_name = excluded.government_name,
    pro_affiliation = excluded.pro_affiliation,
    social_links = excluded.social_links
  returning id into v_artist_profile_id;

  if v_artist_profile_id is null then
    select id into v_artist_profile_id from public.artist_profiles where lower(email) = 'artist@emrecords.com' limit 1;
  end if;

  insert into public.artist_leads (
    artist_profile_id,
    legal_name,
    stage_name,
    email,
    phone,
    country,
    state,
    government_name,
    pro_affiliation,
    social_links,
    notes,
    status,
    created_by
  )
  values (
    v_artist_profile_id,
    'Adrian Morales',
    'Nova K',
    'artist@emrecords.com',
    '+1 786-555-0177',
    'United States',
    'Florida',
    'Adrian Morales',
    'BMI',
    '{"instagram":"https://instagram.com/novak","tiktok":"https://tiktok.com/@novak"}'::jsonb,
    'Demo lead preloaded for artist signing system.',
    'offer_sent',
    (select id from auth.users where email = 'emrecordsllc@gmail.com' limit 1)
  )
  on conflict ((lower(email))) where status not in ('archived', 'declined', 'expired')
  do update set
    stage_name = excluded.stage_name,
    legal_name = excluded.legal_name,
    phone = excluded.phone,
    country = excluded.country,
    state = excluded.state,
    social_links = excluded.social_links,
    status = excluded.status
  returning id into v_lead_id;

  if v_lead_id is null then
    select id into v_lead_id
    from public.artist_leads
    where lower(email) = 'artist@emrecords.com'
    order by created_at desc
    limit 1;
  end if;

  insert into public.deal_offers (
    artist_lead_id,
    offer_type,
    royalty_split_label,
    royalty_split_artist,
    advance_amount,
    term_months,
    term_description,
    territory,
    includes_360,
    includes_publishing,
    status,
    sent_at,
    created_by
  )
  values (
    v_lead_id,
    '50_50_artist_deal',
    50,
    50,
    0,
    24,
    '24 months',
    'Worldwide',
    false,
    true,
    'sent',
    now(),
    (select id from auth.users where email = 'emrecordsllc@gmail.com' limit 1)
  )
  on conflict do nothing
  returning id into v_offer_id;

  if v_offer_id is null then
    select id into v_offer_id
    from public.deal_offers
    where artist_lead_id = v_lead_id
    order by created_at desc
    limit 1;
  end if;

  insert into public.contracts (
    artist_lead_id,
    deal_offer_id,
    contract_template_id,
    contract_version_number,
    rendered_markdown,
    rendered_html,
    status,
    created_by
  )
  values (
    v_lead_id,
    v_offer_id,
    v_template_id,
    1,
    '# ARTIST RECORDING AGREEMENT
## EM RECORDS LLC

This Artist Recording Agreement ("Agreement") is entered into effective March 12, 2026.',
    '<h1>ARTIST RECORDING AGREEMENT</h1><h2>EM RECORDS LLC</h2><p>This Artist Recording Agreement ("Agreement") is entered into effective March 12, 2026.</p>',
    'offer_sent',
    (select id from auth.users where email = 'emrecordsllc@gmail.com' limit 1)
  )
  on conflict do nothing
  returning id into v_contract_id;

  if v_contract_id is null then
    select id into v_contract_id
    from public.contracts
    where artist_lead_id = v_lead_id
    order by created_at desc
    limit 1;
  end if;

  insert into public.contract_versions (
    contract_id,
    version_number,
    template_snapshot,
    variables_snapshot,
    rendered_markdown,
    rendered_html,
    created_by
  )
  values (
    v_contract_id,
    1,
    '# ARTIST RECORDING AGREEMENT',
    '{"artist_legal_name":"Adrian Morales","artist_stage_name":"Nova K","label_legal_entity":"EM Records LLC","effective_date":"2026-03-12","contract_language":"en"}'::jsonb,
    '# ARTIST RECORDING AGREEMENT
## EM RECORDS LLC

This Artist Recording Agreement ("Agreement") is entered into effective March 12, 2026.',
    '<h1>ARTIST RECORDING AGREEMENT</h1><h2>EM RECORDS LLC</h2><p>This Artist Recording Agreement ("Agreement") is entered into effective March 12, 2026.</p>',
    (select id from auth.users where email = 'emrecordsllc@gmail.com' limit 1)
  )
  on conflict (contract_id, version_number) do update set
    rendered_markdown = excluded.rendered_markdown,
    rendered_html = excluded.rendered_html
  returning id into v_contract_version_id;

  update public.contracts
  set current_version_id = v_contract_version_id
  where id = v_contract_id
    and (current_version_id is null or current_version_id <> v_contract_version_id);

  insert into public.onboarding_tasks (artist_lead_id, task_key, title, completed)
  values
    (v_lead_id, 'complete_profile', 'Complete profile', true),
    (v_lead_id, 'upload_id', 'Upload ID', false),
    (v_lead_id, 'tax_form_placeholder', 'Tax form upload placeholder', false),
    (v_lead_id, 'sign_agreement', 'Sign agreement', false),
    (v_lead_id, 'payment_details_placeholder', 'Add payment details placeholder', false),
    (v_lead_id, 'provide_social_handles', 'Provide social handles', true),
    (v_lead_id, 'press_photos_placeholder', 'Submit press photos placeholder', false)
  on conflict (artist_lead_id, task_key) do nothing;

  insert into public.messages (
    artist_lead_id,
    sender_user_id,
    recipient_role,
    subject,
    body
  )
  values (
    v_lead_id,
    (select id from auth.users where email = 'emrecordsllc@gmail.com' limit 1),
    'artist',
    'Welcome to EM Records signing portal',
    'Your agreement is ready for review. Use your secure invite link to verify your email and sign.'
  )
  on conflict do nothing;
end
$$;
