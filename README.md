# EM Records LLC Website

Official dark premium website + admin dashboard for EM Records LLC.

## Stack
- Next.js 16 (App Router + TypeScript)
- Tailwind CSS
- Supabase (Auth, Postgres, Storage, RLS)
- Stripe (Checkout + Webhook)

## Features included
- Cinematic homepage with autoplay video and optional ambient audio toggle
- Public sections: Artists, Releases, Events, News, Gallery, Publishing, Licensing, Join, Legacy, Legal
- Dynamic artist pages with embeds, media, press kit and booking contact
- Private admin login + role-based dashboard
- Admin CRUD for artists, releases, events, news
- Direct upload for artist press kits and media kits to Supabase Storage (`press-kits` bucket)
- Artist social links management (Instagram, TikTok, X, Facebook) from admin
- Artist profile media fields from admin: Spotify Embed, SoundCloud, Music Video URL/Embed, Interview links
- Demo submission workflow with upload and status review (pending/approved/rejected)
- Ticketing flow with Stripe Checkout + webhook order persistence
- QR ticket validation API endpoint
- Sponsors application form
- Newsletter form
- Automatic SEO metadata, sitemap and robots

## Local setup
1. Install dependencies:
```bash
pnpm install
```

2. Configure env:
```bash
cp .env.example .env.local
```
Fill all Supabase/Stripe keys.
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` if you want custom admin credentials.

3. Apply SQL schema in Supabase SQL Editor:
- Run [supabase/schema.sql](/Users/gabriel/em records llc/supabase/schema.sql)
- Optional: run [supabase/seed.sql](/Users/gabriel/em records llc/supabase/seed.sql)

4. Create an admin user:
```bash
pnpm admin:seed
```
Default admin email is `emrecordsllc@gmail.com` if `ADMIN_EMAIL` is not set.

5. Start dev server:
```bash
pnpm dev
```

## Stripe notes
- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- Configure webhook endpoint: `/api/stripe/webhook`
- Create Stripe Price IDs and add them to events in admin

## Media placeholders
Add your assets in:
- `public/videos/em-hero.mp4`
- `public/audio/em-ambient.mp3`
- `public/images/*`

## Security model
- Dashboard routes require authenticated admin role from `profiles.is_admin`
- RLS policies lock write access to admin/service role
- Demo/newsletter/sponsor forms allow public inserts only where needed
