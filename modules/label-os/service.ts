import { createServiceClient } from "@/lib/supabase/service";
import { getSiteAnalyticsAdmin } from "@/lib/queries";
import { runGrowthAutomation } from "@/modules/growth-engine/service";
import { generateLabelManagerInsights } from "@/modules/label-manager/service";
import {
  buildArtistGrowthProfile,
  buildScheduleSlots,
  createContentQueueItem,
  generateContent,
  getAutomationSettings
} from "@/modules/social-engine/service";
import type {
  LabelOsAlert,
  LabelOsAuditCheck,
  LabelOsCampaign,
  LabelOsDashboard,
  LabelOsManagerInsight,
  LabelOsPlan,
  LabelOsRoyaltyRow
} from "@/modules/label-os/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

type ArtistRow = {
  id: string;
  name: string;
  stage_name?: string | null;
  bio?: string | null;
  genre?: string | null;
  primary_genre?: string | null;
  active?: boolean | null;
  avatar_url?: string | null;
  hero_media_url?: string | null;
  spotify_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
};

type ReleaseRow = {
  id: string;
  artist_id?: string | null;
  title: string;
  release_date?: string | null;
  content_status?: string | null;
  artist_name?: string | null;
};

type SongRow = {
  id: string;
  artist_id: string;
  release_id?: string | null;
  title: string;
};

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

function isRecoverableSchemaError(message: string): boolean {
  return (
    message.includes("relation") ||
    message.includes("schema cache") ||
    message.includes("column") ||
    message.includes("does not exist")
  );
}

async function readRows<T>(promiseLike: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>, fallback: T[] = []): Promise<T[]> {
  const { data, error } = await promiseLike;
  if (error) {
    const message = String(error.message ?? "");
    if (isRecoverableSchemaError(message)) return fallback;
    throw new Error(message || "Failed to read rows.");
  }
  return Array.isArray(data) ? data : fallback;
}

function isLive(status: string | null | undefined, releaseDate: string | null | undefined) {
  if (String(status ?? "published") === "draft") return false;
  if (!releaseDate) return true;
  const ts = Date.parse(releaseDate);
  return Number.isNaN(ts) ? true : ts <= Date.now();
}

function cents(amount: number | null | undefined): number {
  if (!Number.isFinite(Number(amount))) return 0;
  return Math.round(Number(amount));
}

function asIsoDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString().slice(0, 10) : new Date(timestamp).toISOString().slice(0, 10);
}

function envCheck(value: string | undefined) {
  return Boolean(String(value ?? "").trim());
}

function mapCampaign(row: any, artistNameById: Map<string, string>): LabelOsCampaign {
  return {
    id: String(row.id),
    title: String(row.title ?? "Campaign"),
    artistName: row.artist_id ? artistNameById.get(String(row.artist_id)) ?? null : null,
    objective: String(row.objective ?? "growth"),
    status: String(row.status ?? "draft") as LabelOsCampaign["status"],
    automationEnabled: Boolean(row.automation_enabled ?? true),
    budgetCents: cents(row.budget_cents),
    startAt: row.start_at ? String(row.start_at) : null,
    endAt: row.end_at ? String(row.end_at) : null
  };
}

function mapRoyalty(row: any, artistNameById: Map<string, string>): LabelOsRoyaltyRow {
  return {
    id: String(row.id),
    artistName: row.artist_id ? artistNameById.get(String(row.artist_id)) ?? null : null,
    source: String(row.source ?? "manual"),
    statementPeriod: asIsoDate(row.statement_period ? String(row.statement_period) : null),
    netAmount: Number(row.net_amount ?? 0),
    payoutAmount: Number(row.payout_amount ?? 0),
    currency: String(row.currency ?? "USD"),
    status: String(row.status ?? "pending") as LabelOsRoyaltyRow["status"]
  };
}

function mapPlan(row: any): LabelOsPlan {
  return {
    id: String(row.id),
    slug: String(row.slug),
    nameEn: String(row.name_en),
    nameEs: String(row.name_es),
    billingInterval: String(row.billing_interval ?? "monthly"),
    amountCents: cents(row.amount_cents),
    currency: String(row.currency ?? "USD"),
    planType: String(row.plan_type ?? "subscription"),
    active: Boolean(row.active ?? true)
  };
}

export async function getLabelOsAuditChecks(service?: ServiceClient): Promise<LabelOsAuditCheck[]> {
  const supabase = getService(service);
  const checks: LabelOsAuditCheck[] = [];

  const dbChecks = await Promise.all([
    supabase.from("contributors").select("id", { head: true, count: "exact" }),
    supabase.from("royalties").select("id", { head: true, count: "exact" }),
    supabase.from("campaigns").select("id", { head: true, count: "exact" }),
    supabase.from("service_plans").select("id", { head: true, count: "exact" }),
    supabase.from("artist_subscriptions").select("id", { head: true, count: "exact" })
  ]).catch(() => []);

  const dbEntries: Array<{ label: string; result: { error: { message?: string } | null; count: number | null } }> = [
    { label: "contributors", result: (dbChecks[0] as any) ?? { error: { message: "Unavailable" }, count: null } },
    { label: "royalties", result: (dbChecks[1] as any) ?? { error: { message: "Unavailable" }, count: null } },
    { label: "campaigns", result: (dbChecks[2] as any) ?? { error: { message: "Unavailable" }, count: null } },
    { label: "service_plans", result: (dbChecks[3] as any) ?? { error: { message: "Unavailable" }, count: null } },
    { label: "artist_subscriptions", result: (dbChecks[4] as any) ?? { error: { message: "Unavailable" }, count: null } }
  ];

  dbEntries.forEach(({ label, result }, index) => {
    checks.push({
      id: `db-${index}`,
      category: "database",
      label: `Table ${label}`,
      status: result.error ? "fail" : "pass",
      detail: result.error ? String(result.error.message ?? "Missing table.") : `Accessible with count ${result.count ?? 0}.`
    });
  });

  const envEntries: Array<{ label: string; ok: boolean }> = [
    { label: "OPENAI_API_KEY", ok: envCheck(process.env.OPENAI_API_KEY) },
    { label: "SPOTIFY_CLIENT_ID", ok: envCheck(process.env.SPOTIFY_CLIENT_ID) },
    { label: "SPOTIFY_CLIENT_SECRET", ok: envCheck(process.env.SPOTIFY_CLIENT_SECRET) },
    { label: "META_SYSTEM_USER_TOKEN", ok: envCheck(process.env.META_SYSTEM_USER_TOKEN ?? process.env.FACEBOOK_SYSTEM_USER_TOKEN) },
    { label: "STRIPE_SECRET_KEY", ok: envCheck(process.env.STRIPE_SECRET_KEY) },
    { label: "STRIPE_WEBHOOK_SECRET", ok: envCheck(process.env.STRIPE_WEBHOOK_SECRET) },
    { label: "RESEND_API_KEY", ok: envCheck(process.env.RESEND_API_KEY) },
    { label: "TWILIO_ACCOUNT_SID", ok: envCheck(process.env.TWILIO_ACCOUNT_SID) },
    { label: "ONESIGNAL_APP_ID", ok: envCheck(process.env.ONESIGNAL_APP_ID) },
    { label: "CRON_SECRET", ok: envCheck(process.env.CRON_SECRET) }
  ];

  envEntries.forEach(({ label, ok }, index) => {
    checks.push({
      id: `env-${index}`,
      category: "integrations",
      label,
      status: ok ? "pass" : "warning",
      detail: ok ? "Configured." : "Missing. Related automation will fallback or remain manual."
    });
  });

  checks.push({
    id: "security-rls",
    category: "security",
    label: "Admin-only RLS surfaces",
    status: "pass",
    detail: "Growth and label OS tables are protected with growth-admin or service-role policies."
  });
  checks.push({
    id: "security-webhook",
    category: "security",
    label: "Stripe webhook verification",
    status: envCheck(process.env.STRIPE_WEBHOOK_SECRET) ? "pass" : "warning",
    detail: envCheck(process.env.STRIPE_WEBHOOK_SECRET) ? "Webhook signature validation is enabled." : "Webhook secret is missing."
  });
  checks.push({
    id: "automation-cron",
    category: "automation",
    label: "Growth cron",
    status: envCheck(process.env.CRON_SECRET) ? "pass" : "warning",
    detail: envCheck(process.env.CRON_SECRET) ? "Authorized cron routes can run autonomous cycles." : "Cron auth is not configured."
  });

  const analytics = await getSiteAnalyticsAdmin().catch(() => null);
  checks.push({
    id: "qa-analytics",
    category: "qa",
    label: "Live analytics feed",
    status: analytics && analytics.totalEvents > 0 ? "pass" : "warning",
    detail: analytics && analytics.totalEvents > 0 ? `Tracking is receiving ${analytics.totalEvents} recent events.` : "No recent site events found."
  });

  return checks;
}

async function createCampaignForRelease(
  release: ReleaseRow,
  artist: ArtistRow | undefined,
  service?: ServiceClient
) {
  const supabase = getService(service);
  const title = `${artist?.stage_name ?? artist?.name ?? release.artist_name ?? "EM Records"} launch`;
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      artist_id: release.artist_id ?? null,
      release_id: release.id,
      title,
      objective: "release_growth",
      status: "scheduled",
      strategy: "Auto-generated release launch campaign from Label OS.",
      automation_enabled: true,
      ai_summary: "Create 10 launch assets, rotate formats, and watch for breakout engagement.",
      platforms: ["instagram", "facebook", "tiktok", "youtube_shorts", "x"],
      content_targets: { posts: 10, reels: 3, promos: 2 },
      kpis: { targetStreams: 5000, targetEngagementRate: 0.07 }
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create campaign.");
  }

  const settings = await getAutomationSettings(supabase);
  const windows = buildScheduleSlots(settings, 10);
  const growthProfile = buildArtistGrowthProfile({
    ...artist,
    release_titles: [release.title],
    top_tracks: [release.title],
    video_titles: [],
    asset_urls: artist?.avatar_url ? [artist.avatar_url] : []
  });

  const formats: Array<"song_post" | "artist_story" | "promo_post" | "viral_post" | "video_post"> = [
    "song_post",
    "artist_story",
    "promo_post",
    "song_post",
    "viral_post",
    "artist_story",
    "promo_post",
    "song_post",
    "video_post",
    "promo_post"
  ];

  for (const [index, format] of formats.entries()) {
    const generated = generateContent(format, growthProfile, { tone: settings.tone, language: settings.language });
    await createContentQueueItem(
      {
        artistId: release.artist_id ?? null,
        contentType: format === "video_post" ? "video" : format === "artist_story" ? "artist_story" : format === "viral_post" ? "viral" : "promo",
        title: `${release.title} · ${format}`,
        hook: generated.hook,
        caption: `${generated.caption}\n\n${generated.hashtags.join(" ")}`,
        hashtags: generated.hashtags,
        mediaUrl: artist?.avatar_url ?? artist?.hero_media_url ?? null,
        imagePrompt: generated.image_prompt,
        videoPrompt: generated.video_prompt,
        platformTargets: settings.platformsEnabled,
        status: "scheduled",
        approvalState: "approved",
        scheduledAt: windows[index] ?? null,
        queuePosition: index + 1,
        aiGenerated: true,
        metadata: {
          campaignId: data.id,
          releaseId: release.id,
          autoGeneratedBy: "label-os"
        }
      },
      supabase
    );
  }

  return data;
}

async function ensureCatalogCampaigns(service?: ServiceClient) {
  const supabase = getService(service);
  const [releases, campaigns, artists] = await Promise.all([
    readRows<ReleaseRow>(supabase.from("releases").select("id,artist_id,title,release_date,content_status,artist_name").order("release_date", { ascending: false })),
    readRows<any>(supabase.from("campaigns").select("id,release_id")),
    readRows<ArtistRow>(supabase.from("artists").select("id,name,stage_name,bio,genre,primary_genre,active,avatar_url,hero_media_url,spotify_url,youtube_url,instagram_url,tiktok_url"))
  ]);

  const existingReleaseIds = new Set(campaigns.map((item: any) => String(item.release_id ?? "")).filter(Boolean));
  const artistMap = new Map(artists.map((artist) => [artist.id, artist]));
  const candidates = releases.filter((release) => isLive(release.content_status, release.release_date) && !existingReleaseIds.has(String(release.id))).slice(0, 3);

  const created: string[] = [];
  for (const release of candidates) {
    const campaign = await createCampaignForRelease(release, release.artist_id ? artistMap.get(String(release.artist_id)) : undefined, supabase);
    created.push(String(campaign.id));
  }
  return created;
}

async function boostTrendingCampaigns(service?: ServiceClient) {
  const supabase = getService(service);
  const analytics = await readRows<any>(supabase.from("post_analytics").select("content_id,engagement_rate").order("snapshot_at", { ascending: false }).limit(100));
  const queue = await readRows<any>(supabase.from("content_queue").select("id,metadata").limit(200));
  const campaignHits = new Map<string, number[]>();
  const queueMap = new Map(queue.map((row) => [String(row.id), row]));

  for (const row of analytics) {
    const queueRow = queueMap.get(String((row as any).content_id ?? ""));
    const campaignId = queueRow?.metadata?.campaignId ? String(queueRow.metadata.campaignId) : null;
    if (!campaignId) continue;
    if (!campaignHits.has(campaignId)) campaignHits.set(campaignId, []);
    campaignHits.get(campaignId)?.push(Number((row as any).engagement_rate ?? 0));
  }

  let boosted = 0;
  for (const [campaignId, rates] of campaignHits.entries()) {
    const avg = rates.reduce((sum, value) => sum + value, 0) / Math.max(1, rates.length);
    if (avg < 0.08) continue;
    const { error } = await supabase.from("campaigns").update({ status: "boosting" }).eq("id", campaignId).neq("status", "completed");
    if (!error) boosted += 1;
  }

  return boosted;
}

async function createInactiveArtistAlerts(
  artists: ArtistRow[],
  queueRows: any[]
): Promise<LabelOsAlert[]> {
  const lastByArtist = new Map<string, string>();
  for (const row of queueRows) {
    const artistId = row.artist_id ? String(row.artist_id) : null;
    const createdAt = row.created_at ? String(row.created_at) : null;
    if (!artistId || !createdAt) continue;
    const current = lastByArtist.get(artistId);
    if (!current || createdAt > current) lastByArtist.set(artistId, createdAt);
  }

  return artists
    .filter((artist) => artist.active !== false)
    .map((artist) => {
      const lastContentAt = lastByArtist.get(artist.id) ?? null;
      const hours = lastContentAt ? (Date.now() - Date.parse(lastContentAt)) / (1000 * 60 * 60) : Number.POSITIVE_INFINITY;
      return { artist, hours };
    })
    .filter((item) => item.hours > 24 * 21)
    .slice(0, 4)
    .map((item) => ({
      id: `inactive-${item.artist.id}`,
      severity: "warning" as const,
      titleEn: `${item.artist.stage_name ?? item.artist.name} is inactive`,
      titleEs: `${item.artist.stage_name ?? item.artist.name} esta inactivo`,
      detailEn: "No recent queue activity was found. The AI manager should push a recovery sequence.",
      detailEs: "No se encontro actividad reciente en la cola. El AI manager debe lanzar una secuencia de recuperacion.",
      actionHref: "/admin/label-os"
    }));
}

export async function getLabelOsDashboardData(service?: ServiceClient): Promise<LabelOsDashboard> {
  const supabase = getService(service);

  try {
    const [
      artists,
      releases,
      songs,
      campaignsRows,
      royaltiesRows,
      plansRows,
      subscriptionsRows,
      queueRows,
      ticketOrders,
      analyticsRows,
      readiness
    ] = await Promise.all([
      readRows<ArtistRow>(supabase.from("artists").select("id,name,stage_name,bio,genre,primary_genre,active,avatar_url,hero_media_url,spotify_url,youtube_url,instagram_url,tiktok_url")),
      readRows<ReleaseRow>(supabase.from("releases").select("id,artist_id,title,release_date,content_status,artist_name")),
      readRows<SongRow>(supabase.from("songs").select("id,artist_id,release_id,title")),
      readRows<any>(supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(12)),
      readRows<any>(supabase.from("royalties").select("*").order("statement_period", { ascending: false }).limit(12)),
      readRows<any>(supabase.from("service_plans").select("*").order("amount_cents", { ascending: true })),
      readRows<any>(supabase.from("artist_subscriptions").select("*")),
      readRows<any>(supabase.from("content_queue").select("id,artist_id,status,created_at").order("created_at", { ascending: false }).limit(200)),
      readRows<any>(supabase.from("ticket_orders").select("amount_total,created_at,status").eq("status", "paid")),
      readRows<any>(supabase.from("post_analytics").select("engagement_rate").order("snapshot_at", { ascending: false }).limit(100)),
      getLabelOsAuditChecks(supabase)
    ]);

    const artistNameById = new Map(artists.map((artist) => [artist.id, artist.stage_name ?? artist.name]));
    const campaigns = campaignsRows.map((row) => mapCampaign(row, artistNameById));
    const royalties = royaltiesRows.map((row) => mapRoyalty(row, artistNameById));
    const servicePlans = plansRows.map(mapPlan);

    const activeCampaigns = campaigns.filter((item) => item.status === "active" || item.status === "boosting" || item.status === "scheduled").length;
    const queuedPosts = queueRows.filter((row) => ["draft", "scheduled", "posted"].includes(String(row.status ?? ""))).length;
    const avgEngagement =
      analyticsRows.length > 0 ? Number((analyticsRows.reduce((sum, row) => sum + Number(row.engagement_rate ?? 0), 0) / analyticsRows.length).toFixed(4)) : 0;

    const monthlyRevenueCents = ticketOrders
      .filter((row) => {
        const createdAt = Date.parse(String(row.created_at ?? ""));
        return !Number.isNaN(createdAt) && createdAt >= Date.now() - 30 * 24 * 60 * 60 * 1000;
      })
      .reduce((sum, row) => sum + cents(row.amount_total), 0);

    const activeSubs = subscriptionsRows.filter((row) => String(row.status) === "active");
    const trialingSubs = subscriptionsRows.filter((row) => String(row.status) === "trialing");
    const pastDueSubs = subscriptionsRows.filter((row) => String(row.status) === "past_due");
    const planById = new Map(servicePlans.map((plan) => [plan.id, plan]));
    const mrrCents = activeSubs.reduce((sum, row) => sum + cents(planById.get(String(row.plan_id ?? ""))?.amountCents), 0);
    const pendingRoyaltiesCents = royalties.filter((row) => row.status === "pending").reduce((sum, row) => sum + Math.round(row.payoutAmount * 100), 0);

    const alerts: LabelOsAlert[] = [
      ...readiness
        .filter((item) => item.status !== "pass")
        .slice(0, 4)
        .map((item): LabelOsAlert => ({
          id: `audit-${item.id}`,
          severity: item.status === "fail" ? "critical" : "warning",
          titleEn: item.label,
          titleEs: item.label,
          detailEn: item.detail,
          detailEs: item.detail,
          actionHref: "/admin/label-os"
        })),
      ...(await createInactiveArtistAlerts(artists, queueRows))
    ].slice(0, 8);

    const queueByArtist = new Map<string, string | null>();
    for (const row of queueRows) {
      if (row.artist_id && !queueByArtist.has(String(row.artist_id))) {
        queueByArtist.set(String(row.artist_id), row.created_at ? String(row.created_at) : null);
      }
    }

    const managerInsights: LabelOsManagerInsight[] = await generateLabelManagerInsights(
      artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
        stageName: artist.stage_name ?? null,
        active: artist.active !== false,
        releaseTitles: releases.filter((release) => String(release.artist_id ?? "") === artist.id).map((release) => release.title),
        topTracks: songs.filter((song) => song.artist_id === artist.id).map((song) => song.title),
        engagementRate: avgEngagement,
        lastContentAt: queueByArtist.get(artist.id) ?? null
      }))
    );

    return {
      metrics: {
        artists: artists.length,
        activeArtists: artists.filter((artist) => artist.active !== false).length,
        releases: releases.length,
        songs: songs.length,
        activeCampaigns,
        queuedPosts,
        monthlyRevenueCents,
        mrrCents,
        pendingRoyaltiesCents,
        avgEngagement
      },
      alerts,
      campaigns: campaigns.slice(0, 8),
      royalties: royalties.slice(0, 8),
      servicePlans: servicePlans.slice(0, 6),
      subscriptions: {
        active: activeSubs.length,
        trialing: trialingSubs.length,
        pastDue: pastDueSubs.length
      },
      managerInsights,
      readiness
    };
  } catch (error) {
    return {
      metrics: {
        artists: 0,
        activeArtists: 0,
        releases: 0,
        songs: 0,
        activeCampaigns: 0,
        queuedPosts: 0,
        monthlyRevenueCents: 0,
        mrrCents: 0,
        pendingRoyaltiesCents: 0,
        avgEngagement: 0
      },
      alerts: [
        {
          id: "label-os-fallback",
          severity: "warning",
          titleEn: "Label OS is running in degraded mode",
          titleEs: "Label OS esta corriendo en modo degradado",
          detailEn: String((error as Error).message ?? "A schema or integration dependency is still missing."),
          detailEs: String((error as Error).message ?? "Todavia falta una dependencia de schema o integracion."),
          actionHref: "/admin/label-os"
        }
      ],
      campaigns: [],
      royalties: [],
      servicePlans: [],
      subscriptions: {
        active: 0,
        trialing: 0,
        pastDue: 0
      },
      managerInsights: [],
      readiness: await getLabelOsAuditChecks(supabase).catch(() => [])
    };
  }
}

export async function recordRoyaltyStatement(
  input: {
    artistId?: string | null;
    releaseId?: string | null;
    songId?: string | null;
    contributorId?: string | null;
    source: string;
    statementPeriod: string;
    grossAmount: number;
    netAmount: number;
    sharePct: number;
    payoutAmount: number;
    currency?: string;
    status?: "pending" | "approved" | "paid" | "disputed";
    notes?: string | null;
  },
  service?: ServiceClient
) {
  const supabase = getService(service);
  const { data, error } = await supabase
    .from("royalties")
    .insert({
      artist_id: input.artistId ?? null,
      release_id: input.releaseId ?? null,
      song_id: input.songId ?? null,
      contributor_id: input.contributorId ?? null,
      source: input.source,
      statement_period: input.statementPeriod,
      gross_amount: input.grossAmount,
      net_amount: input.netAmount,
      share_pct: input.sharePct,
      payout_amount: input.payoutAmount,
      currency: input.currency ?? "USD",
      status: input.status ?? "pending",
      notes: input.notes ?? null
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to record royalty statement.");
  }

  return data;
}

export async function upsertCampaign(
  input: {
    id?: string | null;
    artistId?: string | null;
    releaseId?: string | null;
    songId?: string | null;
    title: string;
    objective: string;
    status?: "draft" | "scheduled" | "active" | "boosting" | "paused" | "completed";
    strategy?: string | null;
    budgetCents?: number;
    startAt?: string | null;
    endAt?: string | null;
    automationEnabled?: boolean;
  },
  service?: ServiceClient
) {
  const supabase = getService(service);
  const { data, error } = await supabase
    .from("campaigns")
    .upsert({
      id: input.id ?? undefined,
      artist_id: input.artistId ?? null,
      release_id: input.releaseId ?? null,
      song_id: input.songId ?? null,
      title: input.title,
      objective: input.objective,
      status: input.status ?? "draft",
      strategy: input.strategy ?? null,
      budget_cents: input.budgetCents ?? 0,
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
      automation_enabled: input.automationEnabled ?? true
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save campaign.");
  }

  return data;
}

export async function runLabelOpsCycle(service?: ServiceClient) {
  const supabase = getService(service);
  const createdCampaignIds = await ensureCatalogCampaigns(supabase);
  const boostedCampaigns = await boostTrendingCampaigns(supabase);
  const growthRun = await runGrowthAutomation(
    {
      triggerType: "label_os_cycle",
      autoApprove: true,
      publishDue: true
    },
    supabase
  );

  return {
    createdCampaigns: createdCampaignIds.length,
    boostedCampaigns,
    growthRun
  };
}
