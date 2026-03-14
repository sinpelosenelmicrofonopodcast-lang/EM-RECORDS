import { createServiceClient } from "@/lib/supabase/service";
import type { SocialPostJob, SocialPublishingSettings } from "@/lib/types";
import {
  absoluteUrl,
  formatDate,
  normalizeAppleMusicEmbedUrl,
  normalizeImageUrl,
  normalizeSpotifyEmbedUrl,
  normalizeYouTubeEmbedUrl
} from "@/lib/utils";

type ServiceClient = ReturnType<typeof createServiceClient>;
type SocialPlatform = SocialPostJob["platform"];
type SocialJobStatus = SocialPostJob["status"];
type SocialContentType = SocialPostJob["contentType"];

type ArtistRow = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatar_url?: string | null;
  hero_image_url?: string | null;
  hero_media_url?: string | null;
  is_published?: boolean | null;
  published_at?: string | null;
};

type ReleaseRow = {
  id: string;
  slug?: string | null;
  title: string;
  artist_name?: string | null;
  artist_slug?: string | null;
  description: string;
  featuring?: string | null;
  cover_url: string;
  release_date: string;
  pre_save_url?: string | null;
  spotify_embed?: string | null;
  apple_embed?: string | null;
  youtube_embed?: string | null;
  video_title?: string | null;
  video_thumbnail_url?: string | null;
  content_status?: string | null;
  publish_at?: string | null;
  is_published?: boolean | null;
};

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  hero_url?: string | null;
  published_at?: string | null;
  content_status?: string | null;
  publish_at?: string | null;
};

type SocialJobInsert = {
  platform: SocialPlatform;
  status?: SocialJobStatus;
  contentType: SocialContentType;
  triggerType: string;
  contentId?: string | null;
  title?: string | null;
  message: string;
  linkUrls: string[];
  primaryLinkUrl?: string | null;
  mediaUrl?: string | null;
  metadata?: Record<string, unknown>;
};

type ManualPreset = "custom" | "random_releases" | "latest_release" | "latest_video" | "latest_artist" | "latest_news";

type ManualPublishInput = {
  message: string;
  linkUrls: string[];
  mediaUrl?: string | null;
  title?: string | null;
  preset: ManualPreset;
  itemCount?: number;
  postToFacebook: boolean;
  postToInstagram: boolean;
};

type PublishResult = {
  ok: boolean;
  skipped?: boolean;
  externalPostId?: string | null;
  response?: unknown;
  error?: string;
};

const GRAPH_API_VERSION = "v24.0";
const DEFAULT_RELEASE_TEMPLATE = "Nuevo release: {{title}} - {{artistName}}{{featuringText}}.\n{{descriptionShort}}\n{{links}}";
const DEFAULT_ARTIST_TEMPLATE = "Update de artista: {{artistName}}.\n{{bioShort}}\n{{artistUrl}}";
const DEFAULT_VIDEO_TEMPLATE = "Nuevo video: {{videoTitle}} - {{artistName}}.\n{{links}}";
const DEFAULT_NEWS_TEMPLATE = "Nueva noticia en EM Records: {{title}}.\n{{excerptShort}}\n{{newsUrl}}";
const DEFAULT_RANDOM_TEMPLATE = "Selecciones de EM Records:\n{{items}}";

export const DEFAULT_SOCIAL_PUBLISHING_SETTINGS: SocialPublishingSettings = {
  id: "default",
  facebookEnabled: true,
  instagramEnabled: true,
  autoReleaseFacebook: true,
  autoReleaseInstagram: true,
  autoArtistFacebook: true,
  autoArtistInstagram: false,
  autoVideoFacebook: true,
  autoVideoInstagram: false,
  autoNewsFacebook: true,
  autoNewsInstagram: true,
  randomBundleSize: 3,
  releaseTemplate: DEFAULT_RELEASE_TEMPLATE,
  artistTemplate: DEFAULT_ARTIST_TEMPLATE,
  videoTemplate: DEFAULT_VIDEO_TEMPLATE,
  newsTemplate: DEFAULT_NEWS_TEMPLATE,
  randomTemplate: DEFAULT_RANDOM_TEMPLATE
};

function isMissingRelationError(error: unknown): boolean {
  return String((error as { message?: string } | null)?.message ?? "").includes("relation");
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function coerceString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function coerceNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripMarkup(text: string): string {
  return text
    .replace(/[#*_`>\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstParagraph(text: string): string {
  const cleaned = stripMarkup(text);
  if (!cleaned) return "";
  const split = cleaned.split(/\n\n|\n|\.(\s|$)/).filter(Boolean);
  return String(split[0] ?? cleaned).trim().replace(/\.$/, "");
}

function truncateText(text: string, maxLength = 180): string {
  const cleaned = stripMarkup(text);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeAbsoluteUrl(url: string | null | undefined): string | null {
  const value = String(url ?? "").trim();
  if (!value) return null;

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const value of urls) {
    const url = normalizeAbsoluteUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    resolved.push(url);
  }

  return resolved;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  const usesLinks = template.includes("{{links}}");
  let rendered = template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => vars[key] ?? "");
  rendered = rendered.replace(/\n{3,}/g, "\n\n").trim();

  if (!usesLinks && vars.links && (!vars.primaryLink || !rendered.includes(vars.primaryLink))) {
    rendered = [rendered, vars.links].filter(Boolean).join("\n\n").trim();
  }

  return rendered;
}

function toSpotifyUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  return normalizeSpotifyEmbedUrl(embedUrl).replace("/embed/", "/");
}

function toAppleMusicUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  return normalizeAppleMusicEmbedUrl(embedUrl).replace("embed.music.apple.com", "music.apple.com");
}

function toYouTubeWatchUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  const normalized = normalizeYouTubeEmbedUrl(embedUrl);
  const match = normalized.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (!match?.[1]) return null;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function toYouTubeThumb(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  const normalized = normalizeYouTubeEmbedUrl(embedUrl);
  const match = normalized.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (!match?.[1]) return null;
  return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
}

function isPublishedFlag(value: boolean | null | undefined): boolean {
  return value !== false;
}

function isDateLive(value: string | null | undefined): boolean {
  if (!value) return true;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return true;
  return timestamp <= Date.now();
}

function isArtistPublic(artist: ArtistRow): boolean {
  return isPublishedFlag(artist.is_published) && isDateLive(artist.published_at);
}

function isReleaseAnnounceable(release: ReleaseRow): boolean {
  return isPublishedFlag(release.is_published) && String(release.content_status ?? "published") !== "draft";
}

function isNewsLive(news: NewsRow): boolean {
  if (String(news.content_status ?? "published") === "draft") return false;
  return isDateLive(news.publish_at) && isDateLive(news.published_at);
}

function getArtistProfileUrl(artist: ArtistRow): string {
  return absoluteUrl(`/artists/${artist.slug}`);
}

function getReleasePublicUrl(release: ReleaseRow): string {
  return absoluteUrl(`/music/${release.slug ?? release.id}`);
}

function getNewsPublicUrl(news: NewsRow): string {
  return absoluteUrl(`/news/${news.slug}`);
}

function buildReleaseLinks(release: ReleaseRow): string[] {
  const releaseUrl = getReleasePublicUrl(release);
  const upcoming = Date.parse(release.release_date) > Date.now();

  return uniqueUrls([
    upcoming ? release.pre_save_url : null,
    releaseUrl,
    toSpotifyUrl(release.spotify_embed),
    toAppleMusicUrl(release.apple_embed),
    toYouTubeWatchUrl(release.youtube_embed)
  ]);
}

function buildReleasePostPayload(settings: SocialPublishingSettings, release: ReleaseRow): Omit<SocialJobInsert, "platform" | "triggerType"> {
  const linkUrls = buildReleaseLinks(release);
  const artistName = String(release.artist_name ?? "EM Records Artist").trim() || "EM Records Artist";
  const releaseUrl = getReleasePublicUrl(release);
  const vars = {
    title: release.title,
    artistName,
    featuringText: release.featuring ? ` feat. ${release.featuring}` : "",
    descriptionShort: truncateText(release.description, 180),
    releaseUrl,
    primaryLink: linkUrls[0] ?? releaseUrl,
    links: linkUrls.join("\n"),
    releaseDate: formatDate(release.release_date)
  };

  return {
    contentType: "release",
    contentId: release.id,
    title: release.title,
    message: renderTemplate(settings.releaseTemplate || DEFAULT_RELEASE_TEMPLATE, vars),
    linkUrls,
    primaryLinkUrl: linkUrls[0] ?? releaseUrl,
    mediaUrl: normalizeImageUrl(release.cover_url) || null,
    metadata: {
      artistSlug: release.artist_slug ?? null,
      releaseUrl
    }
  };
}

function buildArtistPostPayload(settings: SocialPublishingSettings, artist: ArtistRow): Omit<SocialJobInsert, "platform" | "triggerType"> {
  const artistUrl = getArtistProfileUrl(artist);
  const linkUrls = uniqueUrls([artistUrl]);
  const vars = {
    artistName: artist.name,
    bioShort: truncateText(firstParagraph(artist.bio), 180),
    artistUrl,
    primaryLink: artistUrl,
    links: linkUrls.join("\n")
  };

  return {
    contentType: "artist",
    contentId: artist.id,
    title: artist.name,
    message: renderTemplate(settings.artistTemplate || DEFAULT_ARTIST_TEMPLATE, vars),
    linkUrls,
    primaryLinkUrl: artistUrl,
    mediaUrl: normalizeImageUrl(artist.avatar_url || artist.hero_image_url || artist.hero_media_url || "") || null,
    metadata: {
      artistSlug: artist.slug
    }
  };
}

function hasReleaseVideo(release: ReleaseRow): boolean {
  return Boolean(toYouTubeWatchUrl(release.youtube_embed));
}

function buildVideoPostPayload(settings: SocialPublishingSettings, release: ReleaseRow): Omit<SocialJobInsert, "platform" | "triggerType"> {
  const artistName = String(release.artist_name ?? "EM Records Artist").trim() || "EM Records Artist";
  const videoTitle = String(release.video_title ?? release.title).trim() || release.title;
  const videoUrl = toYouTubeWatchUrl(release.youtube_embed);
  const releaseUrl = getReleasePublicUrl(release);
  const linkUrls = uniqueUrls([videoUrl, releaseUrl]);
  const vars = {
    artistName,
    videoTitle,
    releaseUrl,
    videoUrl: videoUrl ?? releaseUrl,
    primaryLink: linkUrls[0] ?? releaseUrl,
    links: linkUrls.join("\n")
  };

  return {
    contentType: "video",
    contentId: release.id,
    title: videoTitle,
    message: renderTemplate(settings.videoTemplate || DEFAULT_VIDEO_TEMPLATE, vars),
    linkUrls,
    primaryLinkUrl: linkUrls[0] ?? releaseUrl,
    mediaUrl: normalizeImageUrl(release.video_thumbnail_url || toYouTubeThumb(release.youtube_embed) || release.cover_url) || null,
    metadata: {
      artistSlug: release.artist_slug ?? null,
      releaseSlug: release.slug ?? null
    }
  };
}

function buildNewsPostPayload(settings: SocialPublishingSettings, news: NewsRow): Omit<SocialJobInsert, "platform" | "triggerType"> {
  const newsUrl = getNewsPublicUrl(news);
  const linkUrls = uniqueUrls([newsUrl]);
  const vars = {
    title: news.title,
    excerptShort: truncateText(news.excerpt, 180),
    newsUrl,
    primaryLink: newsUrl,
    links: linkUrls.join("\n")
  };

  return {
    contentType: "news",
    contentId: news.id,
    title: news.title,
    message: renderTemplate(settings.newsTemplate || DEFAULT_NEWS_TEMPLATE, vars),
    linkUrls,
    primaryLinkUrl: newsUrl,
    mediaUrl: normalizeImageUrl(news.hero_url || "") || null,
    metadata: {
      newsSlug: news.slug
    }
  };
}

function mapSettings(row: any): SocialPublishingSettings {
  return {
    id: coerceString(row?.id, "default"),
    facebookEnabled: coerceBoolean(row?.facebook_enabled, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.facebookEnabled),
    instagramEnabled: coerceBoolean(row?.instagram_enabled, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.instagramEnabled),
    autoReleaseFacebook: coerceBoolean(row?.auto_release_facebook, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoReleaseFacebook),
    autoReleaseInstagram: coerceBoolean(row?.auto_release_instagram, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoReleaseInstagram),
    autoArtistFacebook: coerceBoolean(row?.auto_artist_facebook, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoArtistFacebook),
    autoArtistInstagram: coerceBoolean(row?.auto_artist_instagram, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoArtistInstagram),
    autoVideoFacebook: coerceBoolean(row?.auto_video_facebook, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoVideoFacebook),
    autoVideoInstagram: coerceBoolean(row?.auto_video_instagram, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoVideoInstagram),
    autoNewsFacebook: coerceBoolean(row?.auto_news_facebook, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoNewsFacebook),
    autoNewsInstagram: coerceBoolean(row?.auto_news_instagram, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoNewsInstagram),
    randomBundleSize: Math.min(Math.max(coerceNumber(row?.random_bundle_size, DEFAULT_SOCIAL_PUBLISHING_SETTINGS.randomBundleSize), 1), 6),
    releaseTemplate: coerceString(row?.release_template, DEFAULT_RELEASE_TEMPLATE),
    artistTemplate: coerceString(row?.artist_template, DEFAULT_ARTIST_TEMPLATE),
    videoTemplate: coerceString(row?.video_template, DEFAULT_VIDEO_TEMPLATE),
    newsTemplate: coerceString(row?.news_template, DEFAULT_NEWS_TEMPLATE),
    randomTemplate: coerceString(row?.random_template, DEFAULT_RANDOM_TEMPLATE),
    createdAt: row?.created_at ? String(row.created_at) : undefined,
    updatedAt: row?.updated_at ? String(row.updated_at) : undefined
  };
}

function mapJob(row: any): SocialPostJob {
  return {
    id: String(row.id),
    platform: String(row.platform) as SocialPlatform,
    status: String(row.status) as SocialJobStatus,
    contentType: String(row.content_type) as SocialContentType,
    triggerType: String(row.trigger_type),
    contentId: row.content_id ? String(row.content_id) : null,
    title: row.title ? String(row.title) : null,
    message: String(row.message ?? ""),
    linkUrls: Array.isArray(row.link_urls) ? row.link_urls.map((item: unknown) => String(item)) : [],
    primaryLinkUrl: row.primary_link_url ? String(row.primary_link_url) : null,
    mediaUrl: row.media_url ? String(row.media_url) : null,
    metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {},
    attemptCount: Number(row.attempt_count ?? 0),
    lastError: row.last_error ? String(row.last_error) : null,
    externalPostId: row.external_post_id ? String(row.external_post_id) : null,
    postedAt: row.posted_at ? String(row.posted_at) : null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined
  };
}

export async function getSocialPublishingSettingsRecord(service: ServiceClient): Promise<SocialPublishingSettings> {
  try {
    const { data, error } = await service.from("social_publish_settings").select("*").eq("id", "default").maybeSingle();
    if (error) {
      if (isMissingRelationError(error)) return DEFAULT_SOCIAL_PUBLISHING_SETTINGS;
      throw new Error(error.message);
    }

    if (!data) {
      const insertPayload = {
        id: "default",
        facebook_enabled: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.facebookEnabled,
        instagram_enabled: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.instagramEnabled,
        auto_release_facebook: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoReleaseFacebook,
        auto_release_instagram: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoReleaseInstagram,
        auto_artist_facebook: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoArtistFacebook,
        auto_artist_instagram: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoArtistInstagram,
        auto_video_facebook: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoVideoFacebook,
        auto_video_instagram: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoVideoInstagram,
        auto_news_facebook: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoNewsFacebook,
        auto_news_instagram: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.autoNewsInstagram,
        random_bundle_size: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.randomBundleSize,
        release_template: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.releaseTemplate,
        artist_template: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.artistTemplate,
        video_template: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.videoTemplate,
        news_template: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.newsTemplate,
        random_template: DEFAULT_SOCIAL_PUBLISHING_SETTINGS.randomTemplate
      };

      const { data: created, error: insertError } = await service.from("social_publish_settings").upsert(insertPayload).select("*").maybeSingle();
      if (insertError) {
        if (isMissingRelationError(insertError)) return DEFAULT_SOCIAL_PUBLISHING_SETTINGS;
        throw new Error(insertError.message);
      }

      return mapSettings(created);
    }

    return mapSettings(data);
  } catch (error) {
    if (isMissingRelationError(error)) return DEFAULT_SOCIAL_PUBLISHING_SETTINGS;
    throw error;
  }
}

export function getSocialPublishingEnvStatus() {
  const facebookPageId = String(process.env.META_PAGE_ID ?? process.env.FACEBOOK_PAGE_ID ?? "").trim();
  const pageAccessToken = String(process.env.META_PAGE_ACCESS_TOKEN ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "").trim();
  const instagramBusinessId = String(process.env.META_IG_BUSINESS_ACCOUNT_ID ?? process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "").trim();

  return {
    facebookPageIdConfigured: Boolean(facebookPageId),
    pageAccessTokenConfigured: Boolean(pageAccessToken),
    instagramBusinessIdConfigured: Boolean(instagramBusinessId),
    facebookConfigured: Boolean(facebookPageId && pageAccessToken),
    instagramConfigured: Boolean(facebookPageId && pageAccessToken && instagramBusinessId)
  };
}

function getMetaConfig() {
  const facebookPageId = String(process.env.META_PAGE_ID ?? process.env.FACEBOOK_PAGE_ID ?? "").trim();
  const pageAccessToken = String(process.env.META_PAGE_ACCESS_TOKEN ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "").trim();
  const instagramBusinessId = String(process.env.META_IG_BUSINESS_ACCOUNT_ID ?? process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "").trim();

  return {
    facebookPageId,
    pageAccessToken,
    instagramBusinessId
  };
}

async function postToFacebookPage(job: SocialPostJob): Promise<PublishResult> {
  const config = getMetaConfig();
  if (!config.facebookPageId || !config.pageAccessToken) {
    return { ok: false, skipped: true, error: "Missing META_PAGE_ID or META_PAGE_ACCESS_TOKEN." };
  }

  const body = new URLSearchParams();
  body.set("message", job.message);
  body.set("access_token", config.pageAccessToken);

  if (job.primaryLinkUrl) {
    body.set("link", job.primaryLinkUrl);
  }

  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${config.facebookPageId}/feed`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      error: String((payload as { error?: { message?: string } } | null)?.error?.message ?? `Facebook post failed (${response.status}).`),
      response: payload
    };
  }

  return {
    ok: true,
    externalPostId: String((payload as { id?: string } | null)?.id ?? ""),
    response: payload
  };
}

async function postToInstagram(job: SocialPostJob): Promise<PublishResult> {
  const config = getMetaConfig();
  if (!config.instagramBusinessId || !config.pageAccessToken) {
    return { ok: false, skipped: true, error: "Missing META_IG_BUSINESS_ACCOUNT_ID or META_PAGE_ACCESS_TOKEN." };
  }

  if (!job.mediaUrl) {
    return { ok: false, skipped: true, error: "Instagram requires a public image URL." };
  }

  const createBody = new URLSearchParams();
  createBody.set("image_url", job.mediaUrl);
  createBody.set("caption", job.message);
  createBody.set("access_token", config.pageAccessToken);

  const containerResponse = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${config.instagramBusinessId}/media`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: createBody
  });
  const containerPayload = await containerResponse.json().catch(() => null);

  if (!containerResponse.ok) {
    return {
      ok: false,
      error: String((containerPayload as { error?: { message?: string } } | null)?.error?.message ?? `Instagram container failed (${containerResponse.status}).`),
      response: containerPayload
    };
  }

  const creationId = String((containerPayload as { id?: string } | null)?.id ?? "");
  if (!creationId) {
    return { ok: false, error: "Instagram did not return a creation id.", response: containerPayload };
  }

  const publishBody = new URLSearchParams();
  publishBody.set("creation_id", creationId);
  publishBody.set("access_token", config.pageAccessToken);

  const publishResponse = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${config.instagramBusinessId}/media_publish`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: publishBody
  });
  const publishPayload = await publishResponse.json().catch(() => null);

  if (!publishResponse.ok) {
    return {
      ok: false,
      error: String((publishPayload as { error?: { message?: string } } | null)?.error?.message ?? `Instagram publish failed (${publishResponse.status}).`),
      response: publishPayload
    };
  }

  return {
    ok: true,
    externalPostId: String((publishPayload as { id?: string } | null)?.id ?? creationId),
    response: { container: containerPayload, publish: publishPayload }
  };
}

async function deliverSocialPost(job: SocialPostJob): Promise<PublishResult> {
  if (job.platform === "facebook") return postToFacebookPage(job);
  return postToInstagram(job);
}

export async function dispatchSocialJobById(service: ServiceClient, jobId: string): Promise<SocialPostJob | null> {
  const { data, error } = await service.from("social_post_jobs").select("*").eq("id", jobId).maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const job = mapJob(data);
  const settings = await getSocialPublishingSettingsRecord(service);
  if ((job.platform === "facebook" && !settings.facebookEnabled) || (job.platform === "instagram" && !settings.instagramEnabled)) {
    const { data: skipped } = await service
      .from("social_post_jobs")
      .update({
        status: "skipped",
        last_error: `Platform ${job.platform} is disabled in social settings.`,
        updated_at: new Date().toISOString()
      })
      .eq("id", job.id)
      .select("*")
      .maybeSingle();

    return skipped ? mapJob(skipped) : { ...job, status: "skipped", lastError: `Platform ${job.platform} is disabled in social settings.` };
  }

  const nextAttemptCount = job.attemptCount + 1;
  await service
    .from("social_post_jobs")
    .update({
      status: "processing",
      attempt_count: nextAttemptCount,
      updated_at: new Date().toISOString()
    })
    .eq("id", job.id);

  const result = await deliverSocialPost(job);
  const nextStatus: SocialJobStatus = result.ok ? "sent" : result.skipped ? "skipped" : "failed";

  const { data: updated, error: updateError } = await service
    .from("social_post_jobs")
    .update({
      status: nextStatus,
      attempt_count: nextAttemptCount,
      last_error: result.ok ? null : result.error ?? null,
      external_post_id: result.ok ? result.externalPostId ?? null : null,
      posted_at: result.ok ? new Date().toISOString() : null,
      response_payload: result.response ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", job.id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updated ? mapJob(updated) : null;
}

async function queueAndDispatchSocialPosts(service: ServiceClient, jobs: SocialJobInsert[]): Promise<SocialPostJob[]> {
  if (jobs.length === 0) return [];

  const insertPayload = jobs.map((job) => ({
    platform: job.platform,
    status: job.status ?? "pending",
    content_type: job.contentType,
    trigger_type: job.triggerType,
    content_id: job.contentId ?? null,
    title: job.title ?? null,
    message: job.message,
    link_urls: job.linkUrls,
    primary_link_url: job.primaryLinkUrl ?? null,
    media_url: job.mediaUrl ?? null,
    metadata: job.metadata ?? {}
  }));

  const { data, error } = await service.from("social_post_jobs").insert(insertPayload).select("*");
  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  const queued = Array.isArray(data) ? data.map(mapJob) : [];
  const dispatched: SocialPostJob[] = [];
  for (const job of queued) {
    const delivered = await dispatchSocialJobById(service, job.id);
    dispatched.push(delivered ?? job);
  }
  return dispatched;
}

export async function processSocialPublishingQueue(options?: { limit?: number }) {
  const service = createServiceClient();
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const { data, error } = await service
    .from("social_post_jobs")
    .select("id")
    .in("status", ["pending", "failed"])
    .lt("attempt_count", 5)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) {
      return { processed: 0, sent: 0, failed: 0, skipped: 0 };
    }
    throw new Error(error.message);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of data ?? []) {
    const job = await dispatchSocialJobById(service, String(row.id));
    if (!job) continue;
    if (job.status === "sent") sent += 1;
    else if (job.status === "skipped") skipped += 1;
    else failed += 1;
  }

  return {
    processed: (data ?? []).length,
    sent,
    failed,
    skipped
  };
}

export async function maybeAutoQueueArtistPosts(params: {
  service: ServiceClient;
  previousArtist?: ArtistRow | null;
  nextArtist?: ArtistRow | null;
}) {
  const { service, previousArtist, nextArtist } = params;
  if (!nextArtist || !isArtistPublic(nextArtist)) return [];

  const created = !previousArtist;
  const bioChanged = String(previousArtist?.bio ?? "").trim() !== String(nextArtist.bio ?? "").trim();
  if (!created && !bioChanged) return [];

  const settings = await getSocialPublishingSettingsRecord(service);
  const targets: SocialPlatform[] = [];
  if (settings.autoArtistFacebook) targets.push("facebook");
  if (settings.autoArtistInstagram) targets.push("instagram");
  if (targets.length === 0) return [];

  const payload = buildArtistPostPayload(settings, nextArtist);
  return queueAndDispatchSocialPosts(
    service,
    targets.map((platform) => ({
      ...payload,
      platform,
      triggerType: created ? "artist_created" : "artist_bio_updated"
    }))
  );
}

export async function maybeAutoQueueReleasePosts(params: {
  service: ServiceClient;
  previousRelease?: ReleaseRow | null;
  nextRelease?: ReleaseRow | null;
}) {
  const { service, previousRelease, nextRelease } = params;
  if (!nextRelease || !isReleaseAnnounceable(nextRelease)) return [];

  const settings = await getSocialPublishingSettingsRecord(service);
  const queuedJobs: SocialJobInsert[] = [];
  const created = !previousRelease;
  const wasAnnounceable = previousRelease ? isReleaseAnnounceable(previousRelease) : false;
  const shouldAnnounceRelease = created || !wasAnnounceable;

  if (shouldAnnounceRelease) {
    const payload = buildReleasePostPayload(settings, nextRelease);
    if (settings.autoReleaseFacebook) {
      queuedJobs.push({ ...payload, platform: "facebook", triggerType: created ? "release_created" : "release_published" });
    }
    if (settings.autoReleaseInstagram) {
      queuedJobs.push({ ...payload, platform: "instagram", triggerType: created ? "release_created" : "release_published" });
    }
  }

  const hadVideoBefore = previousRelease ? hasReleaseVideo(previousRelease) : false;
  const hasVideoNow = hasReleaseVideo(nextRelease);
  const videoChanged = String(previousRelease?.youtube_embed ?? "").trim() !== String(nextRelease.youtube_embed ?? "").trim();
  const shouldAnnounceVideo = hasVideoNow && (created || !hadVideoBefore || videoChanged);

  if (shouldAnnounceVideo) {
    const payload = buildVideoPostPayload(settings, nextRelease);
    if (settings.autoVideoFacebook) {
      queuedJobs.push({ ...payload, platform: "facebook", triggerType: created ? "video_created" : "video_updated" });
    }
    if (settings.autoVideoInstagram) {
      queuedJobs.push({ ...payload, platform: "instagram", triggerType: created ? "video_created" : "video_updated" });
    }
  }

  return queueAndDispatchSocialPosts(service, queuedJobs);
}

export async function maybeAutoQueueNewsPosts(params: {
  service: ServiceClient;
  previousNews?: NewsRow | null;
  nextNews?: NewsRow | null;
}) {
  const { service, previousNews, nextNews } = params;
  if (!nextNews || !isNewsLive(nextNews)) return [];

  const created = !previousNews;
  const wasLive = previousNews ? isNewsLive(previousNews) : false;
  if (!created && wasLive) return [];

  const settings = await getSocialPublishingSettingsRecord(service);
  const payload = buildNewsPostPayload(settings, nextNews);
  const queuedJobs: SocialJobInsert[] = [];

  if (settings.autoNewsFacebook) {
    queuedJobs.push({ ...payload, platform: "facebook", triggerType: created ? "news_created" : "news_published" });
  }
  if (settings.autoNewsInstagram) {
    queuedJobs.push({ ...payload, platform: "instagram", triggerType: created ? "news_created" : "news_published" });
  }

  return queueAndDispatchSocialPosts(service, queuedJobs);
}

async function fetchArtistRows(service: ServiceClient, limit = 24): Promise<ArtistRow[]> {
  const { data, error } = await service
    .from("artists")
    .select("id,name,slug,bio,avatar_url,hero_image_url,hero_media_url,is_published,published_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as ArtistRow[]).filter(isArtistPublic) : [];
}

async function fetchReleaseRows(service: ServiceClient, limit = 32): Promise<ReleaseRow[]> {
  const { data, error } = await service
    .from("releases")
    .select("id,slug,title,artist_name,artist_slug,description,featuring,cover_url,release_date,pre_save_url,spotify_embed,apple_embed,youtube_embed,video_title,video_thumbnail_url,content_status,publish_at,is_published")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as ReleaseRow[]).filter(isReleaseAnnounceable) : [];
}

async function fetchNewsRows(service: ServiceClient, limit = 24): Promise<NewsRow[]> {
  const { data, error } = await service
    .from("news_posts")
    .select("id,title,slug,excerpt,hero_url,published_at,content_status,publish_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as NewsRow[]).filter(isNewsLive) : [];
}

function pickRandomItems<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const resolved: T[] = [];
  while (pool.length > 0 && resolved.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    const [item] = pool.splice(index, 1);
    if (item) resolved.push(item);
  }
  return resolved;
}

async function buildManualPresetPayload(
  service: ServiceClient,
  settings: SocialPublishingSettings,
  preset: ManualPreset,
  itemCount: number
): Promise<Omit<SocialJobInsert, "platform" | "triggerType"> | null> {
  if (preset === "custom") return null;

  if (preset === "latest_release") {
    const [release] = await fetchReleaseRows(service, 1);
    return release ? buildReleasePostPayload(settings, release) : null;
  }

  if (preset === "latest_video") {
    const releases = await fetchReleaseRows(service, 12);
    const release = releases.find(hasReleaseVideo);
    return release ? buildVideoPostPayload(settings, release) : null;
  }

  if (preset === "latest_artist") {
    const [artist] = await fetchArtistRows(service, 1);
    return artist ? buildArtistPostPayload(settings, artist) : null;
  }

  if (preset === "latest_news") {
    const [news] = await fetchNewsRows(service, 1);
    return news ? buildNewsPostPayload(settings, news) : null;
  }

  const releases = await fetchReleaseRows(service, 40);
  const selection = pickRandomItems(releases, Math.max(1, itemCount));
  if (selection.length === 0) return null;

  const linkUrls = selection.map((item) => getReleasePublicUrl(item));
  const items = selection
    .map((item, index) => `${index + 1}. ${item.title} - ${item.artist_name ?? "EM Records Artist"}\n${getReleasePublicUrl(item)}`)
    .join("\n");

  return {
    contentType: "manual",
    contentId: null,
    title: `Random release bundle (${selection.length})`,
    message: renderTemplate(settings.randomTemplate || DEFAULT_RANDOM_TEMPLATE, {
      items,
      primaryLink: linkUrls[0] ?? "",
      links: linkUrls.join("\n")
    }),
    linkUrls,
    primaryLinkUrl: linkUrls[0] ?? null,
    mediaUrl: normalizeImageUrl(selection[0]?.cover_url || "") || null,
    metadata: {
      preset: "random_releases",
      releaseIds: selection.map((item) => item.id)
    }
  };
}

export async function publishManualSocialPosts(service: ServiceClient, input: ManualPublishInput) {
  const settings = await getSocialPublishingSettingsRecord(service);
  const targets: SocialPlatform[] = [];
  if (input.postToFacebook) targets.push("facebook");
  if (input.postToInstagram) targets.push("instagram");
  if (targets.length === 0) {
    throw new Error("Select at least one platform.");
  }

  const presetPayload = await buildManualPresetPayload(service, settings, input.preset, input.itemCount ?? settings.randomBundleSize);
  const linkUrls = uniqueUrls([...(presetPayload?.linkUrls ?? []), ...input.linkUrls]);
  const messageParts = [input.message.trim(), presetPayload?.message ?? ""].filter(Boolean);
  const message = messageParts.join("\n\n").trim();
  const title = input.title?.trim() || presetPayload?.title || null;
  const mediaUrl = normalizeImageUrl(input.mediaUrl || presetPayload?.mediaUrl || "") || null;

  if (!message && linkUrls.length === 0) {
    throw new Error("Add a message or at least one link.");
  }

  const payload: Omit<SocialJobInsert, "platform" | "triggerType"> = {
    contentType: "manual",
    contentId: null,
    title,
    message: message || linkUrls.join("\n"),
    linkUrls,
    primaryLinkUrl: linkUrls[0] ?? null,
    mediaUrl,
    metadata: {
      preset: input.preset,
      itemCount: input.itemCount ?? settings.randomBundleSize
    }
  };

  return queueAndDispatchSocialPosts(
    service,
    targets.map((platform) => ({
      ...payload,
      platform,
      triggerType: input.preset === "custom" ? "manual_publish" : `manual_${input.preset}`
    }))
  );
}

export async function getRecentSocialJobs(service: ServiceClient, limit = 20): Promise<SocialPostJob[]> {
  const { data, error } = await service
    .from("social_post_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.map(mapJob) : [];
}
