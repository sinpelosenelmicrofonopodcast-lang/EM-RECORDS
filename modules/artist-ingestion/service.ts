import { createServiceClient } from "@/lib/supabase/service";
import { slugifyText } from "@/lib/utils";
import type { ArtistGrowthProfile } from "@/modules/growth-engine/types";
import { buildArtistGrowthProfile } from "@/modules/social-engine/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

type SpotifyContent = {
  latestReleases: Array<{ title: string; url: string | null; cover: string | null; metadata: Record<string, unknown> }>;
  topTracks: Array<{ title: string; url: string | null; cover: string | null; metadata: Record<string, unknown> }>;
  covers: string[];
  source: "spotify" | "internal";
};

type YouTubeContent = {
  videos: Array<{ title: string; url: string | null; thumbnail: string | null; metadata: Record<string, unknown> }>;
  shorts: Array<{ title: string; url: string | null; thumbnail: string | null; metadata: Record<string, unknown> }>;
  thumbnails: string[];
  source: "youtube" | "internal";
};

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

function extractSpotifyArtistId(url: string | null | undefined): string | null {
  const value = String(url ?? "").trim();
  const match = value.match(/spotify\.com\/artist\/([a-zA-Z0-9]+)/i);
  return match?.[1] ? match[1] : null;
}

function extractYouTubeChannelId(url: string | null | undefined): string | null {
  const value = String(url ?? "").trim();
  const match = value.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i);
  return match?.[1] ? match[1] : null;
}

function extractYouTubeVideoId(url: string | null | undefined): string | null {
  const value = String(url ?? "").trim();
  const embedMatch = value.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (embedMatch?.[1]) return embedMatch[1];
  const watchMatch = value.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch?.[1]) return watchMatch[1];
  return null;
}

function toCacheUrl(artistId: string, type: string, title: string, url: string | null | undefined): string {
  const resolved = String(url ?? "").trim();
  return resolved || `em://cache/${artistId}/${type}/${slugifyText(title || type)}`;
}

async function getSpotifyAppToken(): Promise<string | null> {
  const clientId = String(process.env.SPOTIFY_CLIENT_ID ?? "").trim();
  const clientSecret = String(process.env.SPOTIFY_CLIENT_SECRET ?? "").trim();
  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store"
  }).catch(() => null);

  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null);
  return payload?.access_token ? String(payload.access_token) : null;
}

export async function fetchSpotifyArtistData(artist: ArtistGrowthProfile): Promise<SpotifyContent> {
  const artistId = extractSpotifyArtistId(artist.profileLinks.spotifyUrl ?? artist.spotifyUrl);
  const token = artistId ? await getSpotifyAppToken() : null;

  if (artistId && token) {
    const headers = { authorization: `Bearer ${token}` };
    const [albumsRes, tracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=8&market=US`, { headers, cache: "no-store" }).catch(
        () => null
      ),
      fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, { headers, cache: "no-store" }).catch(() => null)
    ]);

    const albumsPayload = albumsRes?.ok ? await albumsRes.json().catch(() => null) : null;
    const tracksPayload = tracksRes?.ok ? await tracksRes.json().catch(() => null) : null;

    const latestReleases = Array.isArray(albumsPayload?.items)
      ? albumsPayload.items.slice(0, 6).map((item: any) => ({
          title: String(item.name ?? "Untitled release"),
          url: item.external_urls?.spotify ? String(item.external_urls.spotify) : null,
          cover: Array.isArray(item.images) && item.images[0]?.url ? String(item.images[0].url) : null,
          metadata: {
            releaseDate: item.release_date ?? null,
            totalTracks: item.total_tracks ?? null
          }
        }))
      : [];

    const topTracks = Array.isArray(tracksPayload?.tracks)
      ? tracksPayload.tracks.slice(0, 5).map((item: any) => ({
          title: String(item.name ?? "Untitled track"),
          url: item.external_urls?.spotify ? String(item.external_urls.spotify) : null,
          cover: Array.isArray(item.album?.images) && item.album.images[0]?.url ? String(item.album.images[0].url) : null,
          metadata: {
            popularity: item.popularity ?? null,
            durationMs: item.duration_ms ?? null
          }
        }))
      : [];

    const covers = Array.from(
      new Set(
        [...latestReleases.map((item: { cover: string | null }) => item.cover), ...topTracks.map((item: { cover: string | null }) => item.cover)].filter(
          Boolean
        )
      )
    ) as string[];

    if (latestReleases.length > 0 || topTracks.length > 0) {
      return {
        latestReleases,
        topTracks,
        covers,
        source: "spotify"
      };
    }
  }

  return {
    latestReleases: artist.releaseTitles.slice(0, 6).map((title, index) => ({
      title,
      url: null,
      cover: artist.assetUrls[index] ?? artist.avatarUrl ?? null,
      metadata: { fallback: true }
    })),
    topTracks: artist.topTracks.slice(0, 5).map((title, index) => ({
      title,
      url: null,
      cover: artist.assetUrls[index] ?? artist.avatarUrl ?? null,
      metadata: { fallback: true }
    })),
    covers: artist.assetUrls.slice(0, 6),
    source: "internal"
  };
}

export async function fetchYouTubeContent(artist: ArtistGrowthProfile): Promise<YouTubeContent> {
  const channelId = extractYouTubeChannelId(artist.profileLinks.youtubeChannel ?? artist.youtubeUrl);

  if (channelId) {
    const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      cache: "no-store"
    }).catch(() => null);

    if (feed?.ok) {
      const xml = await feed.text().catch(() => "");
      const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).slice(0, 8);
      const videos = entries.map((entry) => {
        const block = entry[1] ?? "";
        const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "Untitled video";
        const videoId = block.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1] ?? null;
        const published = block.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? null;
        return {
          title,
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
          thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : artist.avatarUrl ?? null,
          metadata: {
            publishedAt: published
          }
        };
      });

      const shorts = videos.filter((item) => /short/i.test(item.title)).slice(0, 4);
      return {
        videos,
        shorts,
        thumbnails: videos.map((item) => item.thumbnail).filter(Boolean) as string[],
        source: "youtube"
      };
    }
  }

  const fallbackVideoIds = artist.videoTitles.map((title, index) => ({
    title,
    url: null,
    thumbnail: artist.assetUrls[index] ?? artist.avatarUrl ?? null,
    metadata: { fallback: true }
  }));

  return {
    videos: fallbackVideoIds,
    shorts: fallbackVideoIds.filter((item) => /short/i.test(item.title)).slice(0, 4),
    thumbnails: fallbackVideoIds.map((item) => item.thumbnail).filter(Boolean) as string[],
    source: "internal"
  };
}

export async function getArtistAssets(artistId: string, service?: ServiceClient) {
  const supabase = getService(service);
  const [growthAssets, mediaAssets] = await Promise.all([
    supabase.from("artist_assets").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
    supabase.from("media_assets").select("*").eq("artist_id", artistId).order("created_at", { ascending: false })
  ]);

  const normalizedGrowthAssets = (growthAssets.data ?? []).map((asset: any) => ({
    id: String(asset.id),
    artistId,
    type: String(asset.type),
    url: String(asset.url),
    source: String(asset.source),
    metadata: typeof asset.metadata === "object" && asset.metadata ? (asset.metadata as Record<string, unknown>) : {}
  }));

  const normalizedMediaAssets = (mediaAssets.data ?? []).map((asset: any) => ({
    id: String(asset.id),
    artistId,
    type: asset.type === "photo" ? "image" : asset.type === "cover" ? "cover" : asset.type === "logo" ? "logo" : "other",
    url: String(asset.url),
    source: "media_assets",
    metadata: typeof asset.metadata === "object" && asset.metadata ? (asset.metadata as Record<string, unknown>) : {}
  }));

  const deduped = new Map<string, (typeof normalizedGrowthAssets)[number]>();
  for (const asset of [...normalizedGrowthAssets, ...normalizedMediaAssets]) {
    deduped.set(asset.url, asset);
  }

  return Array.from(deduped.values());
}

export async function getArtistsGrowthStatus(service?: ServiceClient) {
  const supabase = getService(service);
  const [artistsRes, profilesRes, cacheRes, assetsRes] = await Promise.all([
    supabase.from("artists").select("id,name,stage_name,active").order("name", { ascending: true }),
    supabase.from("artist_profiles").select("artist_id,instagram,tiktok,youtube_channel,spotify_url"),
    supabase.from("artist_content_cache").select("artist_id"),
    supabase.from("artist_assets").select("artist_id")
  ]);

  const profileMap = new Map<string, any>();
  for (const row of profilesRes.data ?? []) {
    if ((row as any).artist_id) {
      profileMap.set(String((row as any).artist_id), row);
    }
  }

  const cacheCount = new Map<string, number>();
  for (const row of cacheRes.data ?? []) {
    const key = String((row as any).artist_id ?? "");
    cacheCount.set(key, (cacheCount.get(key) ?? 0) + 1);
  }

  const assetCount = new Map<string, number>();
  for (const row of assetsRes.data ?? []) {
    const key = String((row as any).artist_id ?? "");
    assetCount.set(key, (assetCount.get(key) ?? 0) + 1);
  }

  return (artistsRes.data ?? []).map((artist: any) => {
    const profile = profileMap.get(String(artist.id));
    return {
      id: String(artist.id),
      name: String(artist.stage_name ?? artist.name),
      active: Boolean(artist.active ?? true),
      cacheItems: cacheCount.get(String(artist.id)) ?? 0,
      assets: assetCount.get(String(artist.id)) ?? 0,
      spotifyConnected: Boolean(profile?.spotify_url),
      youtubeConnected: Boolean(profile?.youtube_channel),
      instagramConnected: Boolean(profile?.instagram),
      tiktokConnected: Boolean(profile?.tiktok)
    };
  });
}

export async function syncArtistContent(artistId?: string, service?: ServiceClient) {
  const supabase = getService(service);
  let artistsQuery = supabase
    .from("artists")
    .select("id,name,stage_name,bio,genre,primary_genre,active,avatar_url,hero_media_url,spotify_url,youtube_url,instagram_url,tiktok_url,music_video_embed");

  if (artistId) {
    artistsQuery = artistsQuery.eq("id", artistId);
  }

  const artistsRes = await artistsQuery.order("name", { ascending: true });
  const artists = artistsRes.data ?? [];
  if (artists.length === 0) {
    return { syncedArtists: 0, cachedItems: 0, assetsIndexed: 0 };
  }

  const artistIds = artists.map((artist: any) => String(artist.id));
  const [profilesRes, releasesRes, songsRes, mediaAssetsRes] = await Promise.all([
    supabase.from("artist_profiles").select("artist_id,instagram,tiktok,youtube_channel,spotify_url").in("artist_id", artistIds),
    supabase.from("releases").select("artist_id,title,spotify_embed,youtube_embed,cover_url,video_title,video_thumbnail_url").in("artist_id", artistIds),
    supabase.from("songs").select("artist_id,title,links").in("artist_id", artistIds),
    supabase.from("media_assets").select("artist_id,type,source,url,thumb_url,metadata,source_id").in("artist_id", artistIds)
  ]);

  const profilesByArtist = new Map<string, any>();
  for (const profile of profilesRes.data ?? []) {
    if ((profile as any).artist_id) {
      profilesByArtist.set(String((profile as any).artist_id), profile);
    }
  }

  const releasesByArtist = new Map<string, any[]>();
  for (const release of releasesRes.data ?? []) {
    const key = String((release as any).artist_id ?? "");
    if (!releasesByArtist.has(key)) releasesByArtist.set(key, []);
    releasesByArtist.get(key)?.push(release);
  }

  const songsByArtist = new Map<string, any[]>();
  for (const song of songsRes.data ?? []) {
    const key = String((song as any).artist_id ?? "");
    if (!songsByArtist.has(key)) songsByArtist.set(key, []);
    songsByArtist.get(key)?.push(song);
  }

  const mediaAssetsByArtist = new Map<string, any[]>();
  for (const asset of mediaAssetsRes.data ?? []) {
    const key = String((asset as any).artist_id ?? "");
    if (!mediaAssetsByArtist.has(key)) mediaAssetsByArtist.set(key, []);
    mediaAssetsByArtist.get(key)?.push(asset);
  }

  let cachedItems = 0;
  let assetsIndexed = 0;

  for (const row of artists) {
    const id = String((row as any).id);
    const profile = profilesByArtist.get(id);
    const releases = releasesByArtist.get(id) ?? [];
    const songs = songsByArtist.get(id) ?? [];
    const mediaAssets = mediaAssetsByArtist.get(id) ?? [];

    const artist = buildArtistGrowthProfile({
      ...row,
      profile_instagram: profile?.instagram ?? null,
      profile_tiktok: profile?.tiktok ?? null,
      profile_youtube_channel: profile?.youtube_channel ?? null,
      profile_spotify_url: profile?.spotify_url ?? null,
      release_titles: releases.map((release: any) => String(release.title)),
      top_tracks: songs.map((song: any) => String(song.title)),
      video_titles: releases.map((release: any) => String(release.video_title ?? release.title)).filter(Boolean),
      asset_urls: mediaAssets.map((asset: any) => String(asset.thumb_url ?? asset.url)).filter(Boolean)
    });

    const [spotifyData, youtubeData] = await Promise.all([fetchSpotifyArtistData(artist), fetchYouTubeContent(artist)]);

    const artistAssets = [
      ...mediaAssets.map((asset: any) => ({
        artist_id: id,
        type: asset.type === "photo" ? "image" : asset.type === "cover" ? "cover" : asset.type === "logo" ? "logo" : "other",
        url: String(asset.url),
        source: "media_assets",
        source_id: asset.source_id ? String(asset.source_id) : null,
        metadata: {
          thumbUrl: asset.thumb_url ?? null,
          ...(typeof asset.metadata === "object" && asset.metadata ? asset.metadata : {})
        }
      })),
      ...spotifyData.covers.map((cover) => ({
        artist_id: id,
        type: "cover",
        url: cover,
        source: "spotify",
        source_id: null,
        metadata: { provider: spotifyData.source }
      })),
      ...youtubeData.thumbnails.map((thumbnail) => ({
        artist_id: id,
        type: "image",
        url: thumbnail,
        source: "youtube",
        source_id: null,
        metadata: { provider: youtubeData.source }
      }))
    ];

    const uniqueAssetRows = Array.from(new Map(artistAssets.map((asset) => [asset.url, asset])).values());
    if (uniqueAssetRows.length > 0) {
      const assetsResult = await supabase
        .from("artist_assets")
        .upsert(uniqueAssetRows, { onConflict: "artist_id,url", ignoreDuplicates: false })
        .select("id");
      if (!assetsResult.error) {
        assetsIndexed += assetsResult.data?.length ?? uniqueAssetRows.length;
      }
    }

    const contentRows = [
      ...spotifyData.latestReleases.map((item) => ({
        artist_id: id,
        type: "release",
        title: item.title,
        url: toCacheUrl(id, "release", item.title, item.url),
        thumbnail: item.cover,
        metadata: item.metadata,
        last_synced: new Date().toISOString()
      })),
      ...spotifyData.topTracks.map((item) => ({
        artist_id: id,
        type: "track",
        title: item.title,
        url: toCacheUrl(id, "track", item.title, item.url),
        thumbnail: item.cover,
        metadata: item.metadata,
        last_synced: new Date().toISOString()
      })),
      ...youtubeData.videos.map((item) => ({
        artist_id: id,
        type: "video",
        title: item.title,
        url: toCacheUrl(id, "video", item.title, item.url),
        thumbnail: item.thumbnail,
        metadata: item.metadata,
        last_synced: new Date().toISOString()
      })),
      ...youtubeData.shorts.map((item) => ({
        artist_id: id,
        type: "short",
        title: item.title,
        url: toCacheUrl(id, "short", item.title, item.url),
        thumbnail: item.thumbnail,
        metadata: item.metadata,
        last_synced: new Date().toISOString()
      })),
      ...uniqueAssetRows.slice(0, 8).map((asset) => ({
        artist_id: id,
        type: "asset",
        title: `${artist.stageName || artist.name} asset`,
        url: toCacheUrl(id, "asset", `${artist.stageName || artist.name} asset`, asset.url),
        thumbnail: asset.url,
        metadata: asset.metadata,
        last_synced: new Date().toISOString()
      }))
    ];

    if (contentRows.length > 0) {
      const contentResult = await supabase
        .from("artist_content_cache")
        .upsert(contentRows, { onConflict: "artist_id,type,title,url", ignoreDuplicates: false })
        .select("id");
      if (!contentResult.error) {
        cachedItems += contentResult.data?.length ?? contentRows.length;
      }
    }
  }

  return {
    syncedArtists: artists.length,
    cachedItems,
    assetsIndexed
  };
}

export function getYouTubeThumbnailFromEmbed(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}
