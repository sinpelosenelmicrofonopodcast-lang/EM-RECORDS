# Deployment Checklist

## 1. Database

Apply all pending Supabase migrations, especially:

- `supabase/migrations/2026-03-14-social-publishing.sql`
- `supabase/migrations/2026-03-19-ai-growth-engine.sql`
- `supabase/migrations/2026-03-19-social-media-control-center.sql`
- `supabase/migrations/2026-03-19-label-os-foundation.sql`

## 2. Required Environment Variables

### Core

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `CRON_SECRET`

### Social / Growth

- `SOCIAL_TOKEN_ENCRYPTION_KEY`
- `META_PAGE_ID`
- `META_SYSTEM_USER_TOKEN`
- `META_IG_BUSINESS_ACCOUNT_ID`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

### Payments

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Messaging / Notifications

- `RESEND_API_KEY`
- `EMAIL_FROM` or `SIGNING_EMAIL_FROM`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_API_KEY`

### AI

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults to `gpt-5`)

## 3. Cron Jobs

- `/api/cron/growth`
- `/api/cron/label-os`
- `/api/cron/seo-daily`

Recommended cadence:

- Growth: daily
- Label OS: daily or every 12 hours
- SEO: daily

## 4. Pre-Deploy Verification

- `pnpm typecheck`
- Login to `/admin`
- Open `/admin/label-os`
- Open `/admin/social-engine`
- Open `/dashboard/social-media`
- Confirm Stripe webhook secret is set
- Confirm Meta page token is set
- Confirm OpenAI key is set if AI responses should be fully autonomous

## 5. Post-Deploy Smoke Test

- Create or edit an artist
- Confirm a release exists with public route
- Run Label OS cycle from `/admin/label-os`
- Generate a social post from `/dashboard/social-media`
- Process a Meta publish
- Record a royalty entry
- Confirm readiness checks show expected env state
