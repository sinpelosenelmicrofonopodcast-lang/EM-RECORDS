# EM Records LLC Website

Official dark premium website + admin dashboard for EM Records LLC.

## Stack
- Next.js 16 (App Router + TypeScript)
- Tailwind CSS
- Supabase (Auth, Postgres, Storage, RLS)
- Stripe (Checkout + Webhook)

## Features included
- Cinematic homepage with autoplay video and optional ambient audio toggle
- Public sections: Artists, Music, Videos, Events, Press, Publishing, Licensing, Join, Legacy, Legal
- Dynamic artist pages with embeds, media, press kit and booking contact
- Private admin login + role-based dashboard
- Admin CRUD for artists, releases, events, news
- Social publishing dashboard: direct Facebook/Instagram posting, random release bundles, auto-posts for releases, artist bio updates, videos and news
- Direct upload for artist press kits and media kits to Supabase Storage (`press-kits` bucket)
- Artist social links management (Instagram, TikTok, X, Facebook) from admin
- Artist profile media fields from admin: Spotify Embed, SoundCloud, Music Video URL/Embed, Interview links
- Demo submission workflow with upload and status review (pending/approved/rejected)
- Ticketing flow with Stripe Checkout + webhook order persistence
- QR ticket validation API endpoint
- Sponsors application form
- Newsletter form
- SEO autopilot: canonical metadata templates, schema.org JSON-LD, dynamic sitemap index/sub-sitemaps, robots, SEO queue, GSC endpoints and cron jobs

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
- Then run all SQL files in `supabase/migrations/` in chronological order (including `2026-03-07-seo-autopilot.sql`)

4. Create an admin user:
```bash
pnpm admin:seed
```
Default admin email is `emrecordsllc@gmail.com` if `ADMIN_EMAIL` is not set.

5. Start dev server:
```bash
pnpm dev
```

## SEO autopilot env vars
Add these to `.env.local` and Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://emrecordsmusic.com
GSC_SITE_URL=sc-domain:emrecordsmusic.com
GSC_SITEMAP_URL=https://emrecordsmusic.com/sitemap.xml
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CRON_SECRET=your-long-random-secret
```

## Social publishing env vars
Add these to `.env.local` and Vercel to enable Meta posting from `/admin/social-publishing`:

```bash
META_PAGE_ID=...
META_SYSTEM_USER_TOKEN=...
META_IG_BUSINESS_ACCOUNT_ID=...
```

Architecture note:
- Use only a permanent Meta System User Token
- The app fetches `/me/accounts` before each publish request
- It derives the Page Access Token dynamically and uses it immediately
- It does not store Page Access Tokens

Run migration:
- [2026-03-14-social-publishing.sql](/Users/gabriel/em records llc/supabase/migrations/2026-03-14-social-publishing.sql)

Admin SEO routes:
- `POST /api/seo/submit-sitemaps`
- `POST /api/seo/process-queue`
- `GET /api/seo/performance?range=28`

Cron routes:
- `GET /api/cron/seo` (every 6h via `vercel.json`)
- `GET /api/cron/seo-daily` (daily via `vercel.json`)
- `GET /api/cron/social` (every 15m via `vercel.json`)

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

## Artist Signing System
Production-ready artist contract and onboarding workflow for EM Records.

### What it includes
- Artist lead pipeline with stages:
  - `lead_received`, `internal_review`, `offer_sent`, `artist_viewed_offer`, `artist_signed`, `label_counter_signed`, `fully_executed`, `archived`, `declined`, `expired`
- Configurable contract template engine with variable merge + clause toggles
- Contract versioning and draft regeneration
- Secure invite flow with token hashing, expiry and revocation
- Native e-sign UX (draw or typed signature) with explicit consent checkbox
- Audit trail across invites, views, signatures, countersignature and execution
- Admin signing suite + artist signing portal
- Executed contract locking at DB trigger level
- In-app notifications + transactional email hooks

### New routes
- Admin:
  - `/admin/signing`
  - `/admin/signing/artists`
  - `/admin/signing/deals`
  - `/admin/signing/contracts`
  - `/admin/signing/contracts/[contractId]`
  - `/admin/signing/audit-logs`
  - `/admin/signing/templates`
  - `/admin/signing/settings`
- Artist:
  - `/dashboard/signing`
  - `/dashboard/signing/agreement`
  - `/dashboard/signing/documents`
  - `/dashboard/signing/profile`
  - `/dashboard/signing/messages`
  - `/dashboard/signing/checklist`
- Secure invite:
  - `/sign/[token]`
- API downloads:
  - `GET /api/signing/contracts/[contractId]/pdf`
  - `GET /api/signing/invite/[token]/pdf?email=...`

### Database migrations and schema
Run migration:
- [2026-03-12-artist-signing-system.sql](/Users/gabriel/em records llc/supabase/migrations/2026-03-12-artist-signing-system.sql)

Core tables added:
- `artist_profiles`
- `artist_leads`
- `deal_offers`
- `contract_templates`
- `contracts`
- `contract_versions`
- `contract_signers`
- `signature_events`
- `audit_logs`
- `artist_documents`
- `onboarding_tasks`
- `messages`
- `invite_tokens`
- `notifications`

Storage buckets added:
- `signing-contracts`
- `signing-documents`
- `signing-signatures`

### Environment variables (signing)
- `EM_RECORDS_LEGAL_ENTITY` (default: `EM Records LLC`)
- `SIGNING_LABEL_SIGNER_EMAIL` (default fallback `legal@emrecordsmusic.com`)
- `SIGNING_EMAIL_FROM` (optional)
- `RESEND_API_KEY` (optional, for Resend delivery)
- `SIGNING_EMAIL_WEBHOOK_URL` (optional, provider-agnostic webhook fallback)
- `NEXT_PUBLIC_SITE_URL` (required for absolute invite links in production)

### Signing flow summary
1. Admin creates artist lead.
2. Admin creates 50/50 offer terms.
3. Admin generates contract draft from active template.
4. Admin sends secure invite link.
5. Artist verifies invite email, reviews terms, accepts e-sign consent, signs.
6. Admin countersigns.
7. Executed PDF is generated, stored, and contract is locked.
8. Artist completes onboarding tasks and document uploads in portal.

### Manual test checklist
1. Create lead in `/admin/signing/artists`.
2. Create offer in `/admin/signing/deals`.
3. Generate draft contract from template.
4. Send invite and verify `invite_tokens` row is created with hashed token.
5. Open `/sign/[token]`, verify email, mark viewed, sign with consent.
6. Confirm `contract_signers` and `signature_events` records for artist.
7. Countersign in `/admin/signing/contracts/[contractId]`.
8. Confirm status transitions to `fully_executed` and `locked_at` set.
9. Download executed PDF from admin and artist views.
10. Upload artist documents + complete checklist items in `/dashboard/signing/*`.
11. Verify corresponding `audit_logs` and `notifications` entries.
