# EM Records Label OS

## Core Surfaces

- `app/admin/label-os/page.tsx`
  Unified executive control center for catalog, campaigns, royalties, subscriptions, and readiness.
- `app/admin/social-engine/page.tsx`
  Autonomous content queue, account tokens, automation settings, and approval flow.
- `app/admin/growth-engine/page.tsx`
  Learning, posting windows, top formats, and automation runs.
- `app/dashboard/social-media/page.tsx`
  Operational social media control center for public-link-safe posting.
- `app/dashboard/artist-hub/*`
  Artist-facing workspace for catalog, launch, media kit, documents, PR, and reporting.

## Backend Modules

- `modules/artist-ingestion/service.ts`
  Spotify, YouTube, and asset ingestion.
- `modules/social-engine/service.ts`
  Queue generation, publishing orchestration, token encryption, and scheduling.
- `modules/growth-engine/service.ts`
  Full autonomous growth cycle orchestration.
- `modules/reel-generator/service.ts`
  Reel draft generation from artist sources.
- `modules/viral-engine/service.ts`
  Viral sourcing and repurposing.
- `modules/ai-optimizer/service.ts`
  Post-performance analysis.
- `modules/learning-system/service.ts`
  Pattern capture and learning application.
- `modules/social-media/service.ts`
  Unified content hub and cross-platform post builder logic.
- `modules/label-os/service.ts`
  Label-level aggregation for campaigns, royalties, subscriptions, readiness, and operations cycles.
- `modules/label-manager/service.ts`
  AI label manager insight generation for strategy and automation.

## Data Model Summary

Existing foundations:
- `artists`
- `songs`
- `releases`
- `splits`
- `registrations`
- `documents`
- `social_accounts`
- `content_queue`
- `post_analytics`
- `learning_memory`

New label operating tables:
- `contributors`
- `royalties`
- `campaigns`
- `analytics_rollups`
- `service_plans`
- `artist_subscriptions`
- `notification_channels`

## Automation Flows

1. New release with no campaign:
   Label OS creates a campaign and seeds 10 scheduled content items.

2. High engagement detected:
   Campaign is pushed into `boosting` mode.

3. Label cycle:
   `runLabelOpsCycle()` creates missing campaigns, boosts winners, then runs the growth engine.

4. Daily growth cron:
   `app/api/cron/growth/route.ts`

5. Label ops cron:
   `app/api/cron/label-os/route.ts`

## AI Layer

- Optional OpenAI integration via `lib/ai/openai.ts`
- Safe fallback heuristics when `OPENAI_API_KEY` is missing
- Bilingual operator-facing insights through `modules/label-manager/service.ts`

## Security

- Supabase RLS on label OS tables
- Growth-admin or service-role access required
- Stripe webhook signature validation
- Cron authorization with `CRON_SECRET`
- Social token encryption with `SOCIAL_TOKEN_ENCRYPTION_KEY`
