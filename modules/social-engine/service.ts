import { createCipheriv, createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatchSocialJobById, getSocialPublishingEnvStatus } from "@/lib/social-publishing";
import type {
  ApprovalState,
  ArtistGrowthProfile,
  AutomationSettingsRecord,
  ContentQueueRecord,
  GeneratedContent,
  LearningMemoryRecord,
  PlatformTarget,
  PublishOutcome,
  QueueContentType,
  QueueStatus,
  SocialAccountRecord,
  SocialEngineDashboard,
  ViralContentRecord
} from "@/modules/growth-engine/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

const DEFAULT_AUTOMATION_SETTINGS: AutomationSettingsRecord = {
  id: "default",
  enabled: true,
  postsPerDay: 4,
  platformsEnabled: ["instagram", "facebook", "tiktok", "youtube_shorts", "x"],
  contentMix: {
    song: 0.3,
    reel: 0.25,
    artist_story: 0.15,
    promo: 0.15,
    viral: 0.15
  },
  tone: "urban latino",
  language: "es",
  bestPostingWindows: [11, 15, 19],
  learningAppliedAt: null,
  lastRunAt: null
};

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

function normalizePlatformTarget(value: unknown): PlatformTarget | null {
  if (value === "instagram" || value === "facebook" || value === "tiktok" || value === "youtube_shorts" || value === "x") {
    return value;
  }
  return null;
}

function normalizePlatforms(value: unknown): PlatformTarget[] {
  const array = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(array.map((item) => normalizePlatformTarget(String(item).trim())).filter(Boolean))) as PlatformTarget[];
}

function normalizeContentMix(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_AUTOMATION_SETTINGS.contentMix };
  }

  const output: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      output[key] = parsed;
    }
  }

  return Object.keys(output).length > 0 ? output : { ...DEFAULT_AUTOMATION_SETTINGS.contentMix };
}

function normalizeNumberArray(value: unknown): number[] {
  const array = Array.isArray(value) ? value : [];
  return array
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.min(23, Math.max(0, Math.round(item))));
}

function mapAutomationSettings(row: any): AutomationSettingsRecord {
  return {
    id: String(row?.id ?? DEFAULT_AUTOMATION_SETTINGS.id),
    enabled: typeof row?.enabled === "boolean" ? row.enabled : DEFAULT_AUTOMATION_SETTINGS.enabled,
    postsPerDay: Number.isFinite(Number(row?.posts_per_day)) ? Math.min(20, Math.max(1, Number(row.posts_per_day))) : DEFAULT_AUTOMATION_SETTINGS.postsPerDay,
    platformsEnabled: normalizePlatforms(row?.platforms_enabled).length > 0 ? normalizePlatforms(row?.platforms_enabled) : DEFAULT_AUTOMATION_SETTINGS.platformsEnabled,
    contentMix: normalizeContentMix(row?.content_mix),
    tone: typeof row?.tone === "string" && row.tone.trim() ? row.tone.trim() : DEFAULT_AUTOMATION_SETTINGS.tone,
    language: typeof row?.language === "string" && row.language.trim() ? row.language.trim() : DEFAULT_AUTOMATION_SETTINGS.language,
    bestPostingWindows: normalizeNumberArray(row?.best_posting_windows).length > 0 ? normalizeNumberArray(row?.best_posting_windows) : DEFAULT_AUTOMATION_SETTINGS.bestPostingWindows,
    learningAppliedAt: row?.learning_applied_at ? String(row.learning_applied_at) : null,
    lastRunAt: row?.last_run_at ? String(row.last_run_at) : null
  };
}

function mapSocialAccount(row: any): SocialAccountRecord {
  return {
    id: String(row.id),
    platform: normalizePlatformTarget(row.platform) ?? "instagram",
    accountLabel: row.account_label ? String(row.account_label) : null,
    accountIdentifier: row.account_identifier ? String(row.account_identifier) : null,
    active: Boolean(row.active ?? true),
    tokenConfigured: Boolean(row.access_token),
    tokenExpiresAt: row.token_expires_at ? String(row.token_expires_at) : null,
    metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {}
  };
}

function mapQueueRecord(row: any): ContentQueueRecord {
  const artistRelation = Array.isArray(row.artists) ? row.artists[0] : row.artists;

  return {
    id: String(row.id),
    artistId: row.artist_id ? String(row.artist_id) : null,
    contentType: String(row.content_type) as QueueContentType,
    title: row.title ? String(row.title) : null,
    hook: row.hook ? String(row.hook) : null,
    caption: String(row.caption ?? ""),
    hashtags: Array.isArray(row.hashtags) ? row.hashtags.map((item: unknown) => String(item)) : [],
    mediaUrl: row.media_url ? String(row.media_url) : null,
    videoData: typeof row.video_data === "object" && row.video_data ? (row.video_data as Record<string, unknown>) : {},
    imagePrompt: row.image_prompt ? String(row.image_prompt) : null,
    videoPrompt: row.video_prompt ? String(row.video_prompt) : null,
    overlayText: row.overlay_text ? String(row.overlay_text) : null,
    platformTargets: normalizePlatforms(row.platform_targets),
    status: String(row.status ?? "draft") as QueueStatus,
    approvalState: String(row.approval_state ?? "pending") as ApprovalState,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    queuePosition: Number(row.queue_position ?? 1000),
    aiGenerated: Boolean(row.ai_generated ?? true),
    readyForManual: Boolean(row.ready_for_manual ?? false),
    failureReason: row.failure_reason ? String(row.failure_reason) : null,
    metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {},
    artistName: artistRelation?.stage_name ? String(artistRelation.stage_name) : artistRelation?.name ? String(artistRelation.name) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null
  };
}

function mapLearningMemory(row: any): LearningMemoryRecord {
  return {
    id: String(row.id),
    pattern: String(row.pattern ?? ""),
    confidenceScore: Number(row.confidence_score ?? 0),
    patternType: String(row.pattern_type ?? "insight"),
    metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {},
    createdAt: row.created_at ? String(row.created_at) : null
  };
}

function mapViralContent(row: any): ViralContentRecord {
  return {
    id: String(row.id),
    source: String(row.source ?? "unknown"),
    contentUrl: String(row.content_url ?? ""),
    caption: row.caption ? String(row.caption) : null,
    performanceScore: Number(row.performance_score ?? 0),
    reusable: Boolean(row.reusable ?? true),
    repurposedCaption: row.repurposed_caption ? String(row.repurposed_caption) : null,
    metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {},
    createdAt: row.created_at ? String(row.created_at) : null
  };
}

function toHashtagToken(value: string): string {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "");
  return cleaned ? `#${cleaned}` : "";
}

function createTokenKey(): Buffer | null {
  const secret = String(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY ?? "").trim();
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

export function encryptSocialToken(value: string): string {
  const key = createTokenKey();
  if (!key) {
    throw new Error("Missing SOCIAL_TOKEN_ENCRYPTION_KEY.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["enc", "v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export async function getAutomationSettings(service?: ServiceClient): Promise<AutomationSettingsRecord> {
  const supabase = getService(service);
  const { data, error } = await supabase.from("automation_settings").select("*").eq("id", "default").maybeSingle();

  if (error || !data) {
    return DEFAULT_AUTOMATION_SETTINGS;
  }

  return mapAutomationSettings(data);
}

export async function upsertAutomationSettings(
  input: Partial<AutomationSettingsRecord>,
  service?: ServiceClient
): Promise<AutomationSettingsRecord> {
  const supabase = getService(service);
  const existing = await getAutomationSettings(supabase);
  const next = {
    ...existing,
    ...input,
    platformsEnabled: input.platformsEnabled ?? existing.platformsEnabled,
    contentMix: input.contentMix ?? existing.contentMix,
    bestPostingWindows: input.bestPostingWindows ?? existing.bestPostingWindows
  };

  const { data, error } = await supabase
    .from("automation_settings")
    .upsert({
      id: "default",
      enabled: next.enabled,
      posts_per_day: next.postsPerDay,
      platforms_enabled: next.platformsEnabled,
      content_mix: next.contentMix,
      tone: next.tone,
      language: next.language,
      best_posting_windows: next.bestPostingWindows,
      learning_applied_at: next.learningAppliedAt,
      last_run_at: next.lastRunAt
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save automation settings.");
  }

  return mapAutomationSettings(data);
}

export async function getSocialAccounts(service?: ServiceClient): Promise<SocialAccountRecord[]> {
  const supabase = getService(service);
  const { data, error } = await supabase.from("social_accounts").select("*").order("platform", { ascending: true });
  if (error || !data) return [];
  return data.map(mapSocialAccount);
}

export async function upsertSocialAccount(
  input: {
    id?: string | null;
    platform: PlatformTarget;
    accountLabel?: string | null;
    accountIdentifier?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: string | null;
    active: boolean;
  },
  service?: ServiceClient
): Promise<SocialAccountRecord> {
  const supabase = getService(service);
  const payload: Record<string, unknown> = {
    id: input.id ?? undefined,
    platform: input.platform,
    account_label: input.accountLabel ?? null,
    account_identifier: input.accountIdentifier ?? null,
    active: input.active,
    token_expires_at: input.tokenExpiresAt ?? null
  };

  if (input.accessToken && input.accessToken.trim()) {
    payload.access_token = encryptSocialToken(input.accessToken.trim());
  }

  if (input.refreshToken && input.refreshToken.trim()) {
    payload.refresh_token = encryptSocialToken(input.refreshToken.trim());
  }

  const { data, error } = await supabase.from("social_accounts").upsert(payload).select("*").maybeSingle();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save social account.");
  }

  return mapSocialAccount(data);
}

export async function getContentQueue(service?: ServiceClient, limit = 60): Promise<ContentQueueRecord[]> {
  const supabase = getService(service);
  const { data, error } = await supabase
    .from("content_queue")
    .select("*, artists(id,name,stage_name)")
    .order("scheduled_at", { ascending: true, nullsFirst: true })
    .order("queue_position", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapQueueRecord);
}

export async function getLearningMemory(service?: ServiceClient, limit = 10): Promise<LearningMemoryRecord[]> {
  const supabase = getService(service);
  const { data, error } = await supabase
    .from("learning_memory")
    .select("*")
    .order("confidence_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapLearningMemory);
}

export async function getViralPool(service?: ServiceClient, limit = 12): Promise<ViralContentRecord[]> {
  const supabase = getService(service);
  const { data, error } = await supabase
    .from("viral_content_pool")
    .select("*")
    .order("performance_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapViralContent);
}

export function generateContent(
  type: "song_post" | "video_post" | "artist_story" | "promo_post" | "viral_post",
  artistData: ArtistGrowthProfile,
  options?: { tone?: string; language?: string; learningPatterns?: LearningMemoryRecord[] }
): GeneratedContent {
  const displayName = artistData.stageName || artistData.name;
  const genre = artistData.genre || "urban latino";
  const learningPatterns = options?.learningPatterns ?? [];
  const learnedHook = learningPatterns.find((pattern) => pattern.patternType === "hook");
  const urgency = learnedHook?.metadata?.winnerWord ? String(learnedHook.metadata.winnerWord) : "AHORA";

  const hooks: Record<typeof type, string[]> = {
    song_post: [
      `${urgency}: ${displayName} viene a romper.`,
      `Si no tienes a ${displayName} en rotacion, vas tarde.`,
      `Este palo de ${displayName} ya esta pidiendo replay.`
    ],
    video_post: [
      `No es video. Es declaracion de guerra.`,
      `${displayName} no vino a participar, vino a dominar.`,
      `Visual nuevo. Energia de himno.`
    ],
    artist_story: [
      `${displayName} sigue subiendo la vara.`,
      `La historia apenas empieza y ya se siente el impacto.`,
      `Este movimiento no se improvisa.`
    ],
    promo_post: [
      `Esto merece pantalla completa y volumen arriba.`,
      `Tu proximo replay favorito ya esta aqui.`,
      `EM Records no suelta presion.`
    ],
    viral_post: [
      `Todo el mundo lo esta mirando. Nosotros lo empujamos mas duro.`,
      `Si esto esta prendiendo, imagina cuando caiga el drop.`,
      `La vibra es viral. El sello es EM.`
    ]
  };

  const hook = hooks[type][Math.floor(Math.random() * hooks[type].length)] ?? hooks[type][0];
  const cta =
    type === "artist_story"
      ? "Comenta y etiqueta a quien tiene que ponerse al dia."
      : "Dale play, comparte y cae al perfil para no quedarte atras.";

  const bodyByType: Record<typeof type, string> = {
    song_post: `${displayName} trae sonido ${genre} con mentalidad de hit. Esto es para la calle, para los reels y para la gente que reconoce un himno en segundos.`,
    video_post: `La imagen y el sonido de ${displayName} estan hechos para parar el scroll y prender la conversacion.`,
    artist_story: `${displayName} esta construyendo catalogo, presencia y narrativa con constancia real. Esto no es humo.`,
    promo_post: `${displayName} tiene catalogo, vision y un movimiento que merece trafico todos los dias.`,
    viral_post: `Tomamos la energia que ya esta corriendo y la aterrizamos con el sello, el artista y el CTA correcto.`
  };

  const hashtags = Array.from(
    new Set(
      [
        toHashtagToken(displayName),
        toHashtagToken(genre),
        "#EMRecords",
        "#MusicaNueva",
        type === "video_post" ? "#Reels" : "",
        type === "viral_post" ? "#Viral" : "#Latino"
      ].filter(Boolean)
    )
  );

  return {
    hook,
    caption: `${hook}\n\n${bodyByType[type]}\n\n${cta}`,
    hashtags,
    image_prompt: `Create a high-energy ${genre} promotional visual for ${displayName}, bold typography, motion blur, street-luxury atmosphere, label branding, portrait-led composition.`,
    video_prompt: `Create a vertical short-form promo for ${displayName} with fast-paced cuts, dramatic text reveals, aggressive marketing tone, urban latino styling, and a final CTA card for EM Records.`
  };
}

export async function createContentQueueItem(
  input: {
    artistId?: string | null;
    contentType: QueueContentType;
    title?: string | null;
    hook?: string | null;
    caption: string;
    hashtags?: string[];
    mediaUrl?: string | null;
    videoData?: Record<string, unknown>;
    imagePrompt?: string | null;
    videoPrompt?: string | null;
    overlayText?: string | null;
    platformTargets: PlatformTarget[];
    status?: QueueStatus;
    approvalState?: ApprovalState;
    scheduledAt?: string | null;
    queuePosition?: number;
    aiGenerated?: boolean;
    readyForManual?: boolean;
    sourceRef?: string | null;
    metadata?: Record<string, unknown>;
  },
  service?: ServiceClient
): Promise<ContentQueueRecord> {
  const supabase = getService(service);
  const { data, error } = await supabase
    .from("content_queue")
    .insert({
      artist_id: input.artistId ?? null,
      content_type: input.contentType,
      title: input.title ?? null,
      hook: input.hook ?? null,
      caption: input.caption,
      hashtags: input.hashtags ?? [],
      media_url: input.mediaUrl ?? null,
      video_data: input.videoData ?? {},
      image_prompt: input.imagePrompt ?? null,
      video_prompt: input.videoPrompt ?? null,
      overlay_text: input.overlayText ?? null,
      platform_targets: input.platformTargets,
      status: input.status ?? "draft",
      approval_state: input.approvalState ?? "pending",
      scheduled_at: input.scheduledAt ?? null,
      queue_position: input.queuePosition ?? 1000,
      ai_generated: input.aiGenerated ?? true,
      ready_for_manual: input.readyForManual ?? false,
      source_ref: input.sourceRef ?? null,
      metadata: input.metadata ?? {}
    })
    .select("*, artists(id,name,stage_name)")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create content item.");
  }

  return mapQueueRecord(data);
}

export async function updateContentQueueItem(
  id: string,
  patch: Partial<{
    title: string | null;
    caption: string;
    hook: string | null;
    hashtags: string[];
    mediaUrl: string | null;
    scheduledAt: string | null;
    status: QueueStatus;
    approvalState: ApprovalState;
    queuePosition: number;
    readyForManual: boolean;
    failureReason: string | null;
    metadata: Record<string, unknown>;
  }>,
  service?: ServiceClient
): Promise<ContentQueueRecord> {
  const supabase = getService(service);
  const { data, error } = await supabase
    .from("content_queue")
    .update({
      title: patch.title,
      caption: patch.caption,
      hook: patch.hook,
      hashtags: patch.hashtags,
      media_url: patch.mediaUrl,
      scheduled_at: patch.scheduledAt,
      status: patch.status,
      approval_state: patch.approvalState,
      queue_position: patch.queuePosition,
      ready_for_manual: patch.readyForManual,
      failure_reason: patch.failureReason,
      metadata: patch.metadata
    })
    .eq("id", id)
    .select("*, artists(id,name,stage_name)")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update content item.");
  }

  return mapQueueRecord(data);
}

export async function reorderContentQueue(ids: string[], service?: ServiceClient) {
  const supabase = getService(service);
  for (const [index, id] of ids.entries()) {
    await supabase.from("content_queue").update({ queue_position: index + 1 }).eq("id", id);
  }
}

export function buildScheduleSlots(settings: AutomationSettingsRecord, total: number, from = new Date()): string[] {
  const windows = settings.bestPostingWindows.length > 0 ? settings.bestPostingWindows : DEFAULT_AUTOMATION_SETTINGS.bestPostingWindows;
  const slots: string[] = [];
  const base = new Date(from);

  for (let index = 0; index < total; index += 1) {
    const slot = new Date(base);
    const dayOffset = Math.floor(index / windows.length);
    const hour = windows[index % windows.length] ?? 12;
    slot.setDate(base.getDate() + dayOffset);
    slot.setHours(hour, 0, 0, 0);
    if (slot.getTime() <= from.getTime()) {
      slot.setHours(slot.getHours() + 2);
    }
    slots.push(slot.toISOString());
  }

  return slots;
}

export async function publishToPlatform(
  platform: PlatformTarget,
  content: ContentQueueRecord,
  service?: ServiceClient
): Promise<PublishOutcome> {
  const supabase = getService(service);

  if (platform === "facebook" || platform === "instagram") {
    const env = getSocialPublishingEnvStatus();
    const supported = platform === "facebook" ? env.facebookConfigured : env.instagramConfigured;

    if (!supported) {
      return {
        platform,
        status: "ready_for_manual",
        reason: `Missing ${platform} publishing credentials.`
      };
    }

    const { data, error } = await supabase
      .from("social_post_jobs")
      .insert({
        platform,
        status: "pending",
        content_type: "manual",
        trigger_type: "autonomous_growth_engine",
        content_id: content.id,
        title: content.title,
        message: [content.hook, content.caption, content.hashtags.join(" ")].filter(Boolean).join("\n\n"),
        link_urls: [],
        primary_link_url: null,
        media_url: content.mediaUrl,
        metadata: {
          contentQueueId: content.id,
          source: "growth-engine"
        }
      })
      .select("id")
      .maybeSingle();

    if (error || !data?.id) {
      return {
        platform,
        status: "failed",
        reason: error?.message ?? "Failed to enqueue platform publish."
      };
    }

    const result = await dispatchSocialJobById(supabase, String(data.id));
    if (result?.status === "sent") {
      return {
        platform,
        status: "posted",
        externalPostId: result.externalPostId ?? null
      };
    }

    if (result?.status === "skipped") {
      return {
        platform,
        status: "ready_for_manual",
        reason: result.lastError ?? "Publishing was skipped."
      };
    }

    return {
      platform,
      status: "failed",
      reason: result?.lastError ?? "Publishing failed."
    };
  }

  return {
    platform,
    status: "ready_for_manual",
    reason: "Platform adapter is not configured yet."
  };
}

export async function publishSmart(
  options?: { limit?: number; now?: Date },
  service?: ServiceClient
): Promise<{ processed: number; posted: number; manual: number; failed: number }> {
  const supabase = getService(service);
  const now = options?.now ?? new Date();
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 50);

  const { data, error } = await supabase
    .from("content_queue")
    .select("*, artists(id,name,stage_name)")
    .eq("approval_state", "approved")
    .in("status", ["scheduled", "draft", "ready_for_manual"])
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true, nullsFirst: true })
    .order("queue_position", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return { processed: 0, posted: 0, manual: 0, failed: 0 };
  }

  let posted = 0;
  let manual = 0;
  let failed = 0;
  const recentArtists = new Set<string>();

  for (const row of data) {
    const item = mapQueueRecord(row);
    if (item.artistId && recentArtists.has(item.artistId)) {
      continue;
    }

    const outcomes: PublishOutcome[] = [];
    for (const platform of item.platformTargets) {
      outcomes.push(await publishToPlatform(platform, item, supabase));
    }

    const hasPosted = outcomes.some((outcome) => outcome.status === "posted");
    const hasManual = outcomes.some((outcome) => outcome.status === "ready_for_manual");
    const hasFailed = outcomes.some((outcome) => outcome.status === "failed");

    await updateContentQueueItem(
      item.id,
      {
        status: hasPosted ? "posted" : hasManual ? "ready_for_manual" : "failed",
        readyForManual: hasManual,
        failureReason: hasFailed ? outcomes.find((outcome) => outcome.reason)?.reason ?? "Publishing failed." : null,
        metadata: {
          ...item.metadata,
          publishResults: outcomes,
          publishedAt: hasPosted ? new Date().toISOString() : item.metadata.publishedAt
        }
      },
      supabase
    );

    if (item.artistId) {
      recentArtists.add(item.artistId);
    }

    if (hasPosted) posted += 1;
    else if (hasManual) manual += 1;
    else failed += 1;
  }

  return {
    processed: data.length,
    posted,
    manual,
    failed
  };
}

export async function getSocialEngineDashboardData(service?: ServiceClient): Promise<SocialEngineDashboard> {
  const supabase = getService(service);
  const [settings, accounts, queue, viralPool, learningMemory, artistsRes, cacheRes, assetsRes] = await Promise.all([
    getAutomationSettings(supabase),
    getSocialAccounts(supabase),
    getContentQueue(supabase),
    getViralPool(supabase),
    getLearningMemory(supabase),
    supabase.from("artists").select("id,name,stage_name,active").order("name", { ascending: true }),
    supabase.from("artist_content_cache").select("artist_id"),
    supabase.from("artist_assets").select("artist_id")
  ]);

  const cacheCounts = new Map<string, number>();
  for (const row of cacheRes.data ?? []) {
    const artistId = String((row as any).artist_id ?? "");
    cacheCounts.set(artistId, (cacheCounts.get(artistId) ?? 0) + 1);
  }

  const assetCounts = new Map<string, number>();
  for (const row of assetsRes.data ?? []) {
    const artistId = String((row as any).artist_id ?? "");
    assetCounts.set(artistId, (assetCounts.get(artistId) ?? 0) + 1);
  }

  return {
    settings,
    accounts,
    queue,
    viralPool,
    learningMemory,
    artists: (artistsRes.data ?? []).map((artist: any) => ({
      id: String(artist.id),
      name: String(artist.name),
      stageName: artist.stage_name ? String(artist.stage_name) : null,
      cacheItems: cacheCounts.get(String(artist.id)) ?? 0,
      assets: assetCounts.get(String(artist.id)) ?? 0,
      active: Boolean(artist.active ?? true)
    })),
    summary: {
      queued: queue.filter((item) => item.status === "draft").length,
      scheduled: queue.filter((item) => item.status === "scheduled").length,
      posted: queue.filter((item) => item.status === "posted").length,
      readyForManual: queue.filter((item) => item.status === "ready_for_manual").length,
      failed: queue.filter((item) => item.status === "failed").length
    }
  };
}

export function buildArtistGrowthProfile(row: any): ArtistGrowthProfile {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    stageName: row.stage_name ? String(row.stage_name) : null,
    bio: String(row.bio ?? ""),
    genre: row.genre ? String(row.genre) : row.primary_genre ? String(row.primary_genre) : null,
    active: Boolean(row.active ?? true),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    heroMediaUrl: row.hero_media_url ? String(row.hero_media_url) : null,
    spotifyUrl: row.spotify_url ? String(row.spotify_url) : null,
    youtubeUrl: row.youtube_url ? String(row.youtube_url) : null,
    instagramUrl: row.instagram_url ? String(row.instagram_url) : null,
    tiktokUrl: row.tiktok_url ? String(row.tiktok_url) : null,
    profileLinks: {
      instagram: row.profile_instagram ? String(row.profile_instagram) : null,
      tiktok: row.profile_tiktok ? String(row.profile_tiktok) : null,
      youtubeChannel: row.profile_youtube_channel ? String(row.profile_youtube_channel) : null,
      spotifyUrl: row.profile_spotify_url ? String(row.profile_spotify_url) : null
    },
    releaseTitles: Array.isArray(row.release_titles) ? row.release_titles.map((item: unknown) => String(item)) : [],
    topTracks: Array.isArray(row.top_tracks) ? row.top_tracks.map((item: unknown) => String(item)) : [],
    videoTitles: Array.isArray(row.video_titles) ? row.video_titles.map((item: unknown) => String(item)) : [],
    assetUrls: Array.isArray(row.asset_urls) ? row.asset_urls.map((item: unknown) => String(item)) : []
  };
}
