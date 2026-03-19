import { createServiceClient } from "@/lib/supabase/service";
import { getSocialPublishingEnvStatus, publishManualSocialPosts } from "@/lib/social-publishing";
import { absoluteUrl, normalizeImageUrl, normalizeYouTubeEmbedUrl, slugifyText } from "@/lib/utils";
import type { SocialPostJob } from "@/lib/types";
import type {
  AiGeneratedPost,
  ContentHubItem,
  SocialMediaContentType,
  SocialMediaDashboardData,
  SocialMediaPlatform,
  SocialMediaPostStatus,
  SocialPostRecord,
  UpsertSocialPostInput
} from "@/modules/social-media/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

type ArtistRow = {
  id: string;
  name: string;
  stage_name?: string | null;
  slug: string;
  bio?: string | null;
  tagline?: string | null;
  avatar_url?: string | null;
  hero_image_url?: string | null;
  hero_media_url?: string | null;
  is_published?: boolean | null;
  published_at?: string | null;
  active?: boolean | null;
};

type SongRow = {
  id: string;
  artist_id: string;
  release_id?: string | null;
  title: string;
  slug?: string | null;
  links?: Record<string, unknown> | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ReleaseRow = {
  id: string;
  slug?: string | null;
  title: string;
  artist_name?: string | null;
  artist_slug?: string | null;
  cover_url?: string | null;
  description?: string | null;
  youtube_embed?: string | null;
  video_title?: string | null;
  video_thumbnail_url?: string | null;
  content_status?: string | null;
  publish_at?: string | null;
  release_date?: string | null;
  is_published?: boolean | null;
};

type NewsRow = {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  hero_url?: string | null;
  content_status?: string | null;
  publish_at?: string | null;
  published_at?: string | null;
};

type BlogRow = {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  hero_url?: string | null;
  cover_url?: string | null;
  content?: string | null;
  content_status?: string | null;
  publish_at?: string | null;
  published_at?: string | null;
};

type AutomationSettingsRow = {
  best_posting_windows?: unknown;
};

function isMissingRelationError(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message ?? "");
  return message.includes("relation") || message.includes("schema cache");
}

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message ?? "");
  return message.includes("column") || message.includes("schema cache");
}

function isDateLive(value: string | null | undefined): boolean {
  if (!value) return true;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return true;
  return timestamp <= Date.now();
}

function isContentLive(status?: string | null, publishAt?: string | null, fallbackDate?: string | null): boolean {
  if (String(status ?? "published") === "draft") return false;
  if (String(status ?? "published") === "scheduled") return isDateLive(publishAt ?? fallbackDate ?? null);
  return isDateLive(publishAt ?? fallbackDate ?? null);
}

function fallbackSongSlug(song: Pick<SongRow, "id" | "title">): string {
  const base = slugifyText(song.title || "song", 56) || "song";
  return `${base}-${song.id.slice(0, 8)}`;
}

function fallbackReleaseSlug(release: Pick<ReleaseRow, "id" | "title">): string {
  const base = slugifyText(release.title || "video", 56) || "video";
  return `${base}-${release.id.slice(0, 8)}`;
}

function fallbackNewsSlug(row: Pick<NewsRow | BlogRow, "id" | "title">): string {
  const base = slugifyText(row.title || "story", 56) || "story";
  return `${base}-${row.id.slice(0, 8)}`;
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

function cleanText(value: string | null | undefined, maxLength = 180): string | null {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizePlatforms(platforms: Array<string | null | undefined>): SocialMediaPlatform[] {
  const seen = new Set<SocialMediaPlatform>();
  const safe: SocialMediaPlatform[] = [];
  for (const value of platforms) {
    if (value === "facebook" || value === "instagram" || value === "tiktok" || value === "x" || value === "youtube") {
      if (!seen.has(value)) {
        seen.add(value);
        safe.push(value);
      }
    }
  }
  return safe;
}

function uniqueHashtags(values: string[]): string[] {
  const seen = new Set<string>();
  const safe: string[] = [];
  for (const raw of values) {
    const normalized = raw
      .trim()
      .replace(/\s+/g, "")
      .replace(/^#*/, "")
      .toLowerCase();
    if (!normalized) continue;
    const hashtag = `#${normalized}`;
    if (seen.has(hashtag)) continue;
    seen.add(hashtag);
    safe.push(hashtag);
  }
  return safe;
}

export function attachContentLink(content: { publicLink?: string | null }, caption: string): string {
  const link = String(content.publicLink ?? "").trim();
  const baseCaption = caption.trim();
  if (!link) return baseCaption;
  if (baseCaption.includes(link)) return baseCaption;
  return [baseCaption, link].filter(Boolean).join("\n\n").trim();
}

function mapSocialPost(row: any): SocialPostRecord {
  return {
    id: String(row.id),
    contentId: row.content_id ? String(row.content_id) : null,
    contentType: String(row.content_type ?? "custom") as SocialMediaContentType,
    title: row.title ? String(row.title) : null,
    caption: String(row.caption ?? ""),
    platforms: normalizePlatforms(Array.isArray(row.platforms) ? row.platforms.map((item: unknown) => String(item)) : []),
    mediaUrl: row.media_url ? String(row.media_url) : null,
    link: row.link ? String(row.link) : null,
    status: String(row.status ?? "draft") as SocialMediaPostStatus,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    metaPostId: row.meta_post_id ? String(row.meta_post_id) : null,
    publishLog: Array.isArray(row.publish_log) ? row.publish_log : [],
    metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {},
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: row.updated_at ? String(row.updated_at) : null
  };
}

async function readRows<T>(
  promiseLike: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
  fallback: T[] = []
): Promise<T[]> {
  const { data, error } = await promiseLike;
  if (error) {
    if (isMissingRelationError(error) || isMissingColumnError(error)) return fallback;
    throw new Error(error.message ?? "Failed to read rows.");
  }
  return Array.isArray(data) ? data : fallback;
}

async function readArtists(service: ServiceClient): Promise<ArtistRow[]> {
  return readRows<ArtistRow>(service.from("artists").select("*").order("created_at", { ascending: false }));
}

async function readSongs(service: ServiceClient): Promise<SongRow[]> {
  return readRows<SongRow>(service.from("songs").select("*").order("updated_at", { ascending: false }));
}

async function readReleases(service: ServiceClient): Promise<ReleaseRow[]> {
  return readRows<ReleaseRow>(service.from("releases").select("*").order("release_date", { ascending: false }));
}

async function readNews(service: ServiceClient): Promise<NewsRow[]> {
  return readRows<NewsRow>(service.from("news_posts").select("*").order("published_at", { ascending: false }));
}

async function readBlogs(service: ServiceClient): Promise<BlogRow[]> {
  try {
    return await readRows<BlogRow>(service.from("blog_posts").select("*").order("published_at", { ascending: false }));
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}

async function readSocialPosts(service: ServiceClient): Promise<SocialPostRecord[]> {
  try {
    const rows = await readRows<any>(service.from("social_posts").select("*").order("created_at", { ascending: false }).limit(120));
    return rows.map(mapSocialPost);
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}

async function readBestPostingWindows(service: ServiceClient): Promise<number[]> {
  try {
    const { data, error } = await service.from("automation_settings").select("best_posting_windows").eq("id", "default").maybeSingle<AutomationSettingsRow>();
    if (error || !data) return [11, 15, 19];
    const raw = Array.isArray(data.best_posting_windows) ? data.best_posting_windows : [];
    const windows = raw.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value <= 23);
    return windows.length > 0 ? windows : [11, 15, 19];
  } catch {
    return [11, 15, 19];
  }
}

async function backfillSongSlugs(service: ServiceClient, songs: SongRow[]) {
  const pending = songs.filter((song) => !String(song.slug ?? "").trim());
  for (const song of pending) {
    const slug = fallbackSongSlug(song);
    try {
      await service.from("songs").update({ slug }).eq("id", song.id);
      song.slug = slug;
    } catch (error) {
      if (isMissingColumnError(error)) return;
    }
  }
}

function buildSongItems(songs: SongRow[], artists: ArtistRow[], releases: ReleaseRow[]): ContentHubItem[] {
  const artistMap = new Map(artists.map((artist) => [artist.id, artist]));
  const releaseMap = new Map(releases.map((release) => [release.id, release]));

  return songs.map((song) => {
    const artist = artistMap.get(song.artist_id);
    const release = song.release_id ? releaseMap.get(song.release_id) : undefined;
    const slug = String(song.slug ?? "").trim() || fallbackSongSlug(song);
    const publicLink = absoluteUrl(`/song/${slug}`);
    const status = release ? (isContentLive(release.content_status, release.publish_at, release.release_date) ? "published" : "draft") : "published";
    const thumbnail = normalizeImageUrl(
      release?.cover_url || artist?.avatar_url || artist?.hero_image_url || artist?.hero_media_url || ""
    ) || null;

    return {
      id: `song:${song.id}`,
      title: song.title,
      type: "song",
      status,
      slug,
      publicLink,
      thumbnail,
      mediaUrl: thumbnail,
      excerpt: cleanText(release?.description),
      artistName: artist?.stage_name ?? artist?.name ?? null,
      subtitle: release?.title ?? artist?.slug ?? null,
      contentId: song.id,
      metadata: {
        artistId: artist?.id ?? null,
        releaseId: release?.id ?? null
      }
    };
  });
}

function buildNewsItems(rows: NewsRow[]): ContentHubItem[] {
  return rows.map((row) => {
    const slug = String(row.slug ?? "").trim() || fallbackNewsSlug(row);
    return {
      id: `news:${row.id}`,
      title: row.title,
      type: "news",
      status: isContentLive(row.content_status, row.publish_at, row.published_at) ? "published" : "draft",
      slug,
      publicLink: absoluteUrl(`/news/${slug}`),
      thumbnail: normalizeImageUrl(row.hero_url || "") || null,
      mediaUrl: normalizeImageUrl(row.hero_url || "") || null,
      excerpt: cleanText(row.excerpt),
      artistName: null,
      subtitle: "News",
      contentId: row.id,
      metadata: {}
    };
  });
}

function buildBlogItems(rows: BlogRow[]): ContentHubItem[] {
  return rows.map((row) => {
    const slug = String(row.slug ?? "").trim() || fallbackNewsSlug(row);
    const thumbnail = normalizeImageUrl(row.hero_url || row.cover_url || "") || null;
    return {
      id: `blog:${row.id}`,
      title: row.title,
      type: "blog",
      status: isContentLive(row.content_status, row.publish_at, row.published_at) ? "published" : "draft",
      slug,
      publicLink: absoluteUrl(`/blog/${slug}`),
      thumbnail,
      mediaUrl: thumbnail,
      excerpt: cleanText(row.excerpt || row.content),
      artistName: null,
      subtitle: "Blog",
      contentId: row.id,
      metadata: {}
    };
  });
}

function buildVideoItems(releases: ReleaseRow[]): ContentHubItem[] {
  return releases
    .filter((release) => Boolean(toYouTubeWatchUrl(release.youtube_embed)))
    .map((release) => {
      const slug = String(release.slug ?? "").trim() || fallbackReleaseSlug(release);
      const thumbnail = normalizeImageUrl(release.video_thumbnail_url || toYouTubeThumb(release.youtube_embed) || release.cover_url || "") || null;
      return {
        id: `video:${release.id}`,
        title: String(release.video_title ?? release.title).trim() || release.title,
        type: "video",
        status: isContentLive(release.content_status, release.publish_at, release.release_date) ? "published" : "draft",
        slug,
        publicLink: absoluteUrl(`/video/${slug}`),
        thumbnail,
        mediaUrl: thumbnail,
        excerpt: cleanText(release.description),
        artistName: cleanText(release.artist_name, 80),
        subtitle: "Video",
        contentId: release.id,
        metadata: {
          releaseSlug: slug,
          youtubeUrl: toYouTubeWatchUrl(release.youtube_embed)
        }
      };
    });
}

function buildArtistItems(rows: ArtistRow[]): ContentHubItem[] {
  return rows.map((artist) => {
    const thumbnail = normalizeImageUrl(artist.avatar_url || artist.hero_image_url || artist.hero_media_url || "") || null;
    return {
      id: `artist:${artist.id}`,
      title: artist.stage_name ?? artist.name,
      type: "artist",
      status: artist.is_published === false || !isDateLive(artist.published_at) ? "draft" : "published",
      slug: artist.slug,
      publicLink: absoluteUrl(`/artists/${artist.slug}`),
      thumbnail,
      mediaUrl: thumbnail,
      excerpt: cleanText(artist.bio || artist.tagline),
      artistName: artist.stage_name ?? artist.name,
      subtitle: artist.slug,
      contentId: artist.id,
      metadata: {}
    };
  });
}

function summarizePosts(posts: SocialPostRecord[]) {
  return {
    contentItems: 0,
    drafts: posts.filter((post) => post.status === "draft").length,
    scheduled: posts.filter((post) => post.status === "scheduled").length,
    published: posts.filter((post) => post.status === "published").length,
    failed: posts.filter((post) => post.status === "failed").length,
    readyForManual: posts.filter((post) => post.status === "ready_for_manual").length
  };
}

export async function getSocialMediaDashboardData(): Promise<SocialMediaDashboardData> {
  const service = createServiceClient();
  const [artists, songs, releases, news, blogs, posts, bestPostingWindows] = await Promise.all([
    readArtists(service),
    readSongs(service),
    readReleases(service),
    readNews(service),
    readBlogs(service),
    readSocialPosts(service),
    readBestPostingWindows(service)
  ]);

  await backfillSongSlugs(service, songs);

  const contentHub = [
    ...buildSongItems(songs, artists, releases),
    ...buildBlogItems(blogs),
    ...buildNewsItems(news),
    ...buildVideoItems(releases),
    ...buildArtistItems(artists)
  ].sort((a, b) => a.title.localeCompare(b.title));

  const summary = summarizePosts(posts);
  summary.contentItems = contentHub.length;

  return {
    contentHub,
    posts,
    bestPostingWindows,
    envStatus: getSocialPublishingEnvStatus(),
    summary
  };
}

export async function generateAiSocialPost(input: {
  contentId?: string | null;
  contentType: SocialMediaContentType;
  title: string;
  publicLink?: string | null;
  artistName?: string | null;
  excerpt?: string | null;
  mediaUrl?: string | null;
}): Promise<AiGeneratedPost> {
  const type = input.contentType;
  const title = cleanText(input.title, 90) ?? "contenido nuevo";
  const artistName = cleanText(input.artistName, 60);
  const excerpt = cleanText(input.excerpt, 120);
  const link = String(input.publicLink ?? "").trim() || null;

  const hookMap: Record<SocialMediaContentType, string> = {
    song: artistName
      ? `SI TODAVIA NO TIENES ${title.toUpperCase()} DE ${artistName.toUpperCase()} EN ROTACION, VAS TARDE.`
      : `SI TODAVIA NO TIENES ${title.toUpperCase()} EN ROTACION, VAS TARDE.`,
    video: `EL VISUAL DE ${title.toUpperCase()} YA ESTA HACIENDO RUIDO. NO TE QUEDES AFUERA.`,
    news: `ESTO YA ESTA PASANDO EN EM RECORDS. EL QUE NO SE ENTERA, SE QUEDA ATRAS.`,
    blog: `HAY MOVIDA NUEVA Y SI ESTAS CONSTRUYENDO CULTURA, ESTO TE IMPORTA.`,
    artist: artistName
      ? `${artistName.toUpperCase()} ESTA EN MOMENTO DE PRESION. SI AUN NO LO TIENES EN EL RADAR, DESPIERTA.`
      : `ESTE ARTISTA YA ESTA MOVIENDO LA CALLE. DESPIERTA.`,
    custom: `ESTO ES LO QUE ESTA SONANDO Y MOVIENDOSE AHORA MISMO.`
  };

  const ctaMap: Record<SocialMediaContentType, string> = {
    song: "Entra al link, escuchalo completo y compártelo antes que todos.",
    video: "Mira el visual completo, comenta tu parte favorita y suéltalo al combo.",
    news: "Lee la nota completa y mantente conectado con lo que viene.",
    blog: "Abre el link, léelo completo y súmate a la conversación.",
    artist: "Abre el perfil, síguelo y súbete temprano al movimiento.",
    custom: "Abre el link, entra temprano y no llegues tarde a la conversación."
  };

  const baseTags = uniqueHashtags([
    "emrecords",
    "musicalatina",
    "nuevamusica",
    type === "song" ? "estrenolatino" : "",
    type === "video" ? "videoclip" : "",
    type === "news" || type === "blog" ? "musicnews" : "",
    artistName ? artistName.replace(/[^a-zA-Z0-9]/g, "") : "",
    title.replace(/[^a-zA-Z0-9]/g, "")
  ]).slice(0, 7);

  const caption = [
    hookMap[type],
    excerpt ? excerpt : artistName ? `${artistName} sigue empujando catalogo, visuales y conversación real.` : "EM Records sigue empujando contenido con visión de marca y momentum.",
    ctaMap[type],
    baseTags.join(" "),
    link
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    hook: hookMap[type],
    caption,
    hashtags: baseTags,
    link,
    mediaUrl: input.mediaUrl ?? null
  };
}

function buildPublishLogEntry(job: SocialPostJob): Record<string, unknown> {
  return {
    platform: job.platform,
    status: job.status,
    postId: job.externalPostId ?? null,
    error: job.lastError ?? null,
    timestamp: job.postedAt ?? new Date().toISOString()
  };
}

function buildManualLogEntry(platform: SocialMediaPlatform): Record<string, unknown> {
  return {
    platform,
    status: "ready_for_manual",
    postId: null,
    error: "API unavailable in this workspace. Manual publish required.",
    timestamp: new Date().toISOString()
  };
}

function resolvePublishStatus(results: SocialPostJob[], manualPlatforms: SocialMediaPlatform[]): SocialMediaPostStatus {
  const hasFailure = results.some((job) => job.status === "failed");
  if (hasFailure) return "failed";
  if (manualPlatforms.length > 0) return "ready_for_manual";
  return "published";
}

async function createOrUpdatePostRecord(
  service: ServiceClient,
  input: UpsertSocialPostInput & {
    status: SocialMediaPostStatus;
    publishedAt?: string | null;
    metaPostId?: string | null;
    publishLog?: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
  }
): Promise<SocialPostRecord> {
  const payload = {
    id: input.id ?? undefined,
    content_id: input.contentId ?? null,
    content_type: input.contentType,
    title: input.title ?? null,
    caption: input.caption,
    platforms: input.platforms,
    media_url: input.mediaUrl ?? null,
    link: input.link ?? null,
    status: input.status,
    scheduled_at: input.scheduledAt ?? null,
    published_at: input.publishedAt ?? null,
    meta_post_id: input.metaPostId ?? null,
    publish_log: input.publishLog ?? [],
    metadata: input.metadata ?? {},
    created_by: input.createdBy ?? null
  };

  const { data, error } = await service.from("social_posts").upsert(payload).select("*").maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Social post was not returned after save.");
  }

  return mapSocialPost(data);
}

export async function saveSocialPostDraft(service: ServiceClient, input: UpsertSocialPostInput, userId?: string | null) {
  const finalCaption = attachContentLink({ publicLink: input.link }, input.caption);
  return createOrUpdatePostRecord(service, {
    ...input,
    caption: finalCaption,
    status: "draft",
    createdBy: userId ?? null
  });
}

export async function scheduleSocialPost(service: ServiceClient, input: UpsertSocialPostInput, userId?: string | null) {
  if (!String(input.scheduledAt ?? "").trim()) {
    throw new Error("Choose a schedule date before sending this post to the queue.");
  }
  const finalCaption = attachContentLink({ publicLink: input.link }, input.caption);
  return createOrUpdatePostRecord(service, {
    ...input,
    caption: finalCaption,
    status: "scheduled",
    createdBy: userId ?? null
  });
}

export async function publishSocialPostNow(service: ServiceClient, input: UpsertSocialPostInput, userId?: string | null) {
  const finalCaption = attachContentLink({ publicLink: input.link }, input.caption);
  const platforms = normalizePlatforms(input.platforms);
  if (platforms.length === 0) {
    throw new Error("Select at least one platform.");
  }

  const supportedPlatforms = platforms.filter((platform) => platform === "facebook" || platform === "instagram");
  const manualPlatforms = platforms.filter((platform) => platform !== "facebook" && platform !== "instagram");
  const manualLog = manualPlatforms.map(buildManualLogEntry);

  let jobs: SocialPostJob[] = [];
  if (supportedPlatforms.length > 0) {
    jobs = await publishManualSocialPosts(service, {
      preset: "custom",
      title: input.title ?? null,
      message: finalCaption,
      mediaUrl: input.mediaUrl ?? null,
      linkUrls: input.link ? [input.link] : [],
      itemCount: 1,
      postToFacebook: supportedPlatforms.includes("facebook"),
      postToInstagram: supportedPlatforms.includes("instagram")
    });
  }

  const publishLog = [...jobs.map(buildPublishLogEntry), ...manualLog];
  const metaPostId = jobs.find((job) => job.externalPostId)?.externalPostId ?? null;
  const status = resolvePublishStatus(jobs, manualPlatforms);
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  return createOrUpdatePostRecord(service, {
    ...input,
    caption: finalCaption,
    status,
    publishedAt,
    metaPostId,
    publishLog,
    metadata: {
      supportedPlatforms,
      manualPlatforms
    },
    createdBy: userId ?? null
  });
}

export async function duplicateSocialPost(service: ServiceClient, postId: string, userId?: string | null) {
  const { data, error } = await service.from("social_posts").select("*").eq("id", postId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Social post not found.");
  }

  const post = mapSocialPost(data);
  return createOrUpdatePostRecord(service, {
    contentId: post.contentId,
    contentType: post.contentType,
    title: post.title ? `${post.title} (copy)` : null,
    caption: post.caption,
    platforms: post.platforms,
    mediaUrl: post.mediaUrl,
    link: post.link,
    status: "draft",
    createdBy: userId ?? null,
    metadata: {
      duplicatedFrom: post.id
    }
  });
}

export async function repostSocialPost(service: ServiceClient, postId: string, userId?: string | null) {
  const { data, error } = await service.from("social_posts").select("*").eq("id", postId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Social post not found.");
  }

  const post = mapSocialPost(data);
  return publishSocialPostNow(
    service,
    {
      contentId: post.contentId,
      contentType: post.contentType,
      title: post.title,
      caption: post.caption,
      platforms: post.platforms,
      mediaUrl: post.mediaUrl,
      link: post.link
    },
    userId ?? null
  );
}

export async function getPublicSongPageData(slug: string) {
  const service = createServiceClient();
  const [artists, songs, releases] = await Promise.all([readArtists(service), readSongs(service), readReleases(service)]);
  await backfillSongSlugs(service, songs);

  const artistMap = new Map(artists.map((artist) => [artist.id, artist]));
  const releaseMap = new Map(releases.map((release) => [release.id, release]));
  const song = songs.find((item) => (String(item.slug ?? "").trim() || fallbackSongSlug(item)) === slug) ?? null;
  if (!song) return null;

  const artist = artistMap.get(song.artist_id) ?? null;
  const release = song.release_id ? releaseMap.get(song.release_id) ?? null : null;
  if (artist?.is_published === false) return null;
  if (release && !isContentLive(release.content_status, release.publish_at, release.release_date)) return null;

  const rawLinks = typeof song.links === "object" && song.links ? (song.links as Record<string, unknown>) : {};
  const links = Object.entries(rawLinks)
    .filter(([, value]) => typeof value === "string" && String(value).trim())
    .map(([label, value]) => ({ label, url: String(value) }));

  return {
    title: song.title,
    slug,
    artistName: artist?.stage_name ?? artist?.name ?? "EM Records Artist",
    artistSlug: artist?.slug ?? null,
    coverUrl: normalizeImageUrl(release?.cover_url || artist?.avatar_url || artist?.hero_image_url || artist?.hero_media_url || "") || null,
    releaseTitle: release?.title ?? null,
    releaseSlug: release ? String(release.slug ?? "").trim() || fallbackReleaseSlug(release) : null,
    description: cleanText(release?.description, 240),
    links
  };
}

export async function getPublicBlogPostBySlug(slug: string) {
  const service = createServiceClient();
  const blogs = await readBlogs(service);
  const row = blogs.find((item) => (String(item.slug ?? "").trim() || fallbackNewsSlug(item)) === slug) ?? null;
  if (!row) return null;
  if (!isContentLive(row.content_status, row.publish_at, row.published_at)) return null;

  return {
    title: row.title,
    excerpt: cleanText(row.excerpt, 240),
    content: String(row.content ?? "").trim(),
    heroUrl: normalizeImageUrl(row.hero_url || row.cover_url || "") || null
  };
}
