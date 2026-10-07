import { createServiceClient } from "@/lib/supabase/service";
import { slugifyText } from "@/lib/utils";

type ServiceClient = ReturnType<typeof createServiceClient>;
type Platform = "spotify" | "apple_music" | "youtube";
type ItemType = "release" | "track" | "video";

type ArtistRow = {
  id: string;
  name: string;
  slug: string;
  spotify_artist_id: string | null;
  apple_music_artist_id: string | null;
  youtube_channel_id: string | null;
  catalog_sync_enabled: boolean | null;
};

type ExternalItem = {
  platform: Platform;
  itemType: ItemType;
  platformId: string;
  parentPlatformId?: string | null;
  title: string;
  url?: string | null;
  artworkUrl?: string | null;
  releaseDate?: string | null;
  isrc?: string | null;
  upc?: string | null;
  durationMs?: number | null;
  explicit?: boolean | null;
  releaseType?: "single" | "ep" | "album" | null;
  raw?: Record<string, unknown>;
};

type ProviderResult = {
  platform: Platform;
  configured: boolean;
  completeScan: boolean;
  items: ExternalItem[];
  error?: string | null;
};

type SyncTotals = {
  discovered: number;
  imported: number;
  updated: number;
  conflicts: number;
};

function serviceOrDefault(service?: ServiceClient) {
  return service ?? createServiceClient();
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(feat|ft|featuring)\.?\b.*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDate(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{4}$/.test(text)) return text + "-01-01";
  if (/^\d{4}-\d{2}$/.test(text)) return text + "-01";
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function releaseTypeFromSpotify(albumType: string | null | undefined, totalTracks: number | null | undefined) {
  const type = String(albumType ?? "").toLowerCase();
  if (type === "single" && Number(totalTracks ?? 0) > 1) return "ep" as const;
  if (type === "album") return "album" as const;
  return "single" as const;
}

function releaseFormat(type: "single" | "ep" | "album" | null | undefined) {
  return type === "album" ? "Album" : type === "ep" ? "EP" : "Single";
}

function platformLinkObject(item: ExternalItem) {
  return item.url ? { [item.platform]: item.url } : {};
}

async function spotifyToken() {
  const id = String(process.env.SPOTIFY_CLIENT_ID ?? "").trim();
  const secret = String(process.env.SPOTIFY_CLIENT_SECRET ?? "").trim();
  if (!id || !secret) return null;
  const auth = Buffer.from(id + ":" + secret).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: "Basic " + auth,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Spotify auth failed: " + response.status);
  const payload = await response.json();
  return String(payload.access_token ?? "") || null;
}

async function spotifyJson(url: string, token: string) {
  const response = await fetch(url, { headers: { authorization: "Bearer " + token }, cache: "no-store" });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let detail = body.trim();
    try {
      const parsed = body ? JSON.parse(body) : null;
      detail =
        String(parsed?.error?.message ?? parsed?.message ?? parsed?.reason ?? parsed?.error ?? detail).trim();
    } catch {
      // Keep the raw response text when Spotify does not return JSON.
    }
    const suffix = detail ? " · " + detail.slice(0, 500) : "";
    throw new Error("Spotify request failed " + response.status + " for " + url + suffix);
  }
  return response.json();
}

async function fetchSpotify(artist: ArtistRow): Promise<ProviderResult> {
  if (!artist.spotify_artist_id) return { platform: "spotify", configured: false, completeScan: false, items: [] };
  const token = await spotifyToken().catch(() => null);
  if (!token) return { platform: "spotify", configured: false, completeScan: false, items: [] };

  try {
    const albumMap = new Map<string, any>();
    let next: string | null =
      "https://api.spotify.com/v1/artists/" +
      encodeURIComponent(artist.spotify_artist_id) +
      "/albums?include_groups=album,single&limit=10&market=US";
    let pages = 0;

    while (next && pages < 100) {
      const payload = await spotifyJson(next, token);
      for (const item of Array.isArray(payload.items) ? payload.items : []) {
        if (item?.id) albumMap.set(String(item.id), item);
      }
      next = payload.next ? String(payload.next) : null;
      pages += 1;
    }

    const fullAlbums: any[] = [];
    for (const albumId of Array.from(albumMap.keys())) {
      const album = await spotifyJson(
        "https://api.spotify.com/v1/albums/" + encodeURIComponent(albumId) + "?market=US",
        token
      );
      if (album?.id) fullAlbums.push(album);
    }

    const fullTrackById = new Map<string, any>();
    for (const album of fullAlbums) {
      for (const simple of album?.tracks?.items ?? []) {
        if (!simple?.id) continue;
        const id = String(simple.id);
        try {
          const track = await spotifyJson(
            "https://api.spotify.com/v1/tracks/" + encodeURIComponent(id) + "?market=US",
            token
          );
          if (track?.id) fullTrackById.set(id, track);
        } catch {
          // Keep the simplified album-track object when an individual track lookup is unavailable.
          fullTrackById.set(id, simple);
        }
      }
    }

    const items: ExternalItem[] = [];
    for (const album of fullAlbums) {
      const releaseType = releaseTypeFromSpotify(album.album_type, album.total_tracks);
      items.push({
        platform: "spotify",
        itemType: "release",
        platformId: String(album.id),
        title: String(album.name ?? "Untitled release"),
        url: album.external_urls?.spotify ? String(album.external_urls.spotify) : null,
        artworkUrl: album.images?.[0]?.url ? String(album.images[0].url) : null,
        releaseDate: normalizeDate(album.release_date),
        upc: album.external_ids?.upc ? String(album.external_ids.upc) : null,
        releaseType,
        raw: {
          albumType: album.album_type ?? null,
          totalTracks: album.total_tracks ?? null,
          label: album.label ?? null
        }
      });

      for (const simple of album?.tracks?.items ?? []) {
        const track = fullTrackById.get(String(simple.id)) ?? simple;
        items.push({
          platform: "spotify",
          itemType: "track",
          platformId: String(track.id),
          parentPlatformId: String(album.id),
          title: String(track.name ?? "Untitled track"),
          url: track.external_urls?.spotify ? String(track.external_urls.spotify) : null,
          artworkUrl: album.images?.[0]?.url ? String(album.images[0].url) : null,
          releaseDate: normalizeDate(album.release_date),
          isrc: track.external_ids?.isrc ? String(track.external_ids.isrc) : null,
          upc: album.external_ids?.upc ? String(album.external_ids.upc) : null,
          durationMs: Number.isFinite(Number(track.duration_ms)) ? Number(track.duration_ms) : null,
          explicit: typeof track.explicit === "boolean" ? track.explicit : null,
          raw: { trackNumber: track.track_number ?? null, discNumber: track.disc_number ?? null }
        });
      }
    }

    return { platform: "spotify", configured: true, completeScan: true, items };
  } catch (error) {
    return {
      platform: "spotify",
      configured: true,
      completeScan: false,
      items: [],
      error: String((error as Error)?.message ?? error)
    };
  }
}

function appleArtwork(url: string | null | undefined) {
  const value = String(url ?? "").trim();
  if (!value) return null;
  return value.replace(/100x100bb\.(jpg|png)$/i, "1000x1000bb.$1");
}

async function fetchApple(artist: ArtistRow): Promise<ProviderResult> {
  if (!artist.apple_music_artist_id) return { platform: "apple_music", configured: false, completeScan: false, items: [] };
  try {
    const base = "https://itunes.apple.com/lookup?id=" + encodeURIComponent(artist.apple_music_artist_id) + "&country=US&limit=200";
    const [albumRes, songRes] = await Promise.all([
      fetch(base + "&entity=album", { cache: "no-store" }),
      fetch(base + "&entity=song&sort=recent", { cache: "no-store" })
    ]);
    if (!albumRes.ok || !songRes.ok) throw new Error("Apple catalog lookup failed.");

    const albumsPayload = await albumRes.json();
    const songsPayload = await songRes.json();
    const items: ExternalItem[] = [];
    const albumRows = (albumsPayload.results ?? []).filter((row: any) => row.wrapperType === "collection" && row.collectionType === "Album");
    const songRows = (songsPayload.results ?? []).filter((row: any) => row.wrapperType === "track" && row.kind === "song");

    for (const album of albumRows) {
      const trackCount = Number(album.trackCount ?? 1);
      const collectionType = String(album.collectionExplicitness ?? "");
      void collectionType;
      items.push({
        platform: "apple_music",
        itemType: "release",
        platformId: String(album.collectionId),
        title: String(album.collectionName ?? "Untitled release"),
        url: album.collectionViewUrl ? String(album.collectionViewUrl) : null,
        artworkUrl: appleArtwork(album.artworkUrl100),
        releaseDate: normalizeDate(album.releaseDate),
        releaseType: trackCount > 6 ? "album" : trackCount > 1 ? "ep" : "single",
        raw: {
          trackCount,
          primaryGenreName: album.primaryGenreName ?? null,
          copyright: album.copyright ?? null
        }
      });
    }

    for (const track of songRows) {
      items.push({
        platform: "apple_music",
        itemType: "track",
        platformId: String(track.trackId),
        parentPlatformId: track.collectionId ? String(track.collectionId) : null,
        title: String(track.trackName ?? "Untitled track"),
        url: track.trackViewUrl ? String(track.trackViewUrl) : null,
        artworkUrl: appleArtwork(track.artworkUrl100),
        releaseDate: normalizeDate(track.releaseDate),
        durationMs: Number.isFinite(Number(track.trackTimeMillis)) ? Number(track.trackTimeMillis) : null,
        explicit: String(track.trackExplicitness ?? "") === "explicit",
        raw: {
          trackNumber: track.trackNumber ?? null,
          discNumber: track.discNumber ?? null,
          collectionName: track.collectionName ?? null,
          primaryGenreName: track.primaryGenreName ?? null
        }
      });
    }

    return { platform: "apple_music", configured: true, completeScan: true, items };
  } catch (error) {
    return {
      platform: "apple_music",
      configured: true,
      completeScan: false,
      items: [],
      error: String((error as Error)?.message ?? error)
    };
  }
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchYouTube(artist: ArtistRow): Promise<ProviderResult> {
  if (!artist.youtube_channel_id) return { platform: "youtube", configured: false, completeScan: false, items: [] };
  try {
    const response = await fetch(
      "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(artist.youtube_channel_id),
      { cache: "no-store" }
    );
    if (!response.ok) throw new Error("YouTube RSS failed: " + response.status);
    const xml = await response.text();
    const items: ExternalItem[] = [];
    for (const match of Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).slice(0, 15)) {
      const block = match[1] ?? "";
      const id = block.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1]?.trim();
      if (!id) continue;
      const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "Untitled video");
      const published = block.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() ?? null;
      items.push({
        platform: "youtube",
        itemType: "video",
        platformId: id,
        title,
        url: "https://www.youtube.com/watch?v=" + id,
        artworkUrl: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg",
        releaseDate: normalizeDate(published),
        raw: { publishedAt: published }
      });
    }
    return { platform: "youtube", configured: true, completeScan: false, items };
  } catch (error) {
    return {
      platform: "youtube",
      configured: true,
      completeScan: false,
      items: [],
      error: String((error as Error)?.message ?? error)
    };
  }
}

async function createConflict(
  service: ServiceClient,
  artistId: string,
  item: ExternalItem,
  reason: string,
  candidateIds: string[] = []
) {
  await service.from("catalog_sync_conflicts").insert({
    artist_id: artistId,
    platform: item.platform,
    conflict_type: "ambiguous_match",
    reason,
    external_item: item,
    candidate_ids: candidateIds,
    status: "open"
  });
}

async function findReleaseMatch(service: ServiceClient, artist: ArtistRow, item: ExternalItem) {
  const platformColumn = item.platform === "spotify" ? "spotify_album_id" : item.platform === "apple_music" ? "apple_music_album_id" : null;
  if (platformColumn) {
    const direct = await service.from("releases").select("*").eq(platformColumn, item.platformId).maybeSingle();
    if (direct.data) return { match: direct.data, ambiguous: false };
  }

  if (item.upc) {
    const byUpc = await service.from("releases").select("*").eq("artist_id", artist.id).eq("upc", item.upc).limit(3);
    if ((byUpc.data ?? []).length === 1) return { match: byUpc.data![0], ambiguous: false };
    if ((byUpc.data ?? []).length > 1) return { match: null, ambiguous: true, candidates: byUpc.data!.map((r: any) => String(r.id)) };
  }

  const releases = await service
    .from("releases")
    .select("*")
    .eq("artist_id", artist.id)
    .order("release_date", { ascending: false })
    .limit(300);

  const title = normalize(item.title);
  const date = normalizeDate(item.releaseDate);
  const matches = (releases.data ?? []).filter((row: any) => {
    const sameTitle = normalize(row.title) === title;
    if (!sameTitle) return false;
    if (!date || !row.release_date) return true;
    return String(row.release_date) === date;
  });
  if (matches.length === 1) return { match: matches[0], ambiguous: false };
  if (matches.length > 1) return { match: null, ambiguous: true, candidates: matches.map((r: any) => String(r.id)) };
  return { match: null, ambiguous: false };
}

async function reconcileRelease(service: ServiceClient, artist: ArtistRow, item: ExternalItem, totals: SyncTotals) {
  const found = await findReleaseMatch(service, artist, item);
  if (found.ambiguous) {
    totals.conflicts += 1;
    await createConflict(service, artist.id, item, "Multiple releases matched title/date or UPC.", found.candidates ?? []);
    return null;
  }

  const existing = found.match;
  const oldLinks = existing?.platform_links && typeof existing.platform_links === "object" ? existing.platform_links : {};
  const links = { ...oldLinks, ...platformLinkObject(item) };
  const patch: Record<string, unknown> = {
    platform_links: links,
    catalog_sync_state: "synced",
    updated_at: new Date().toISOString()
  };
  if (item.platform === "spotify") patch.spotify_album_id = item.platformId;
  if (item.platform === "apple_music") patch.apple_music_album_id = item.platformId;
  if (item.upc && !existing?.upc) patch.upc = item.upc;
  if (item.artworkUrl && !existing?.cover_url) {
    patch.cover_url = item.artworkUrl;
    patch.cover_image_url = item.artworkUrl;
  }

  let releaseId: string;
  if (existing?.id) {
    const update = await service.from("releases").update(patch).eq("id", existing.id).select("id").single();
    if (update.error) throw new Error(update.error.message);
    releaseId = String(update.data.id);
    totals.updated += 1;
  } else {
    const date = normalizeDate(item.releaseDate) ?? new Date().toISOString().slice(0, 10);
    const baseSlug = slugifyText(artist.slug + "-" + item.title + "-" + date);
    const payload: Record<string, unknown> = {
      title: item.title,
      slug: baseSlug,
      smartlink_slug: baseSlug,
      format: releaseFormat(item.releaseType),
      type: item.releaseType ?? "single",
      release_type: item.releaseType ?? "single",
      cover_url: item.artworkUrl ?? "",
      cover_image_url: item.artworkUrl ?? "",
      release_date: date,
      description: "Official release by " + artist.name + ".",
      artist_id: artist.id,
      artist_slug: artist.slug,
      artist_name: artist.name,
      featured: false,
      upc: item.upc ?? null,
      platform_links: links,
      catalog_sync_state: "synced",
      is_published: true,
      published_at: new Date().toISOString()
    };
    if (item.platform === "spotify") payload.spotify_album_id = item.platformId;
    if (item.platform === "apple_music") payload.apple_music_album_id = item.platformId;

    let inserted = await service.from("releases").insert(payload).select("id").single();
    if (inserted.error && String(inserted.error.message).toLowerCase().includes("slug")) {
      payload.slug = baseSlug + "-" + item.platformId.slice(-6);
      payload.smartlink_slug = payload.slug;
      inserted = await service.from("releases").insert(payload).select("id").single();
    }
    if (inserted.error) throw new Error(inserted.error.message);
    releaseId = String(inserted.data.id);
    totals.imported += 1;
  }

  await service
    .from("catalog_platform_items")
    .update({ matched_release_id: releaseId, updated_at: new Date().toISOString() })
    .eq("platform", item.platform)
    .eq("item_type", "release")
    .eq("platform_id", item.platformId);

  return releaseId;
}

async function findSongMatch(service: ServiceClient, artist: ArtistRow, item: ExternalItem, releaseId: string | null) {
  const platformColumn = item.platform === "spotify" ? "spotify_track_id" : item.platform === "apple_music" ? "apple_music_song_id" : null;
  if (platformColumn) {
    const direct = await service.from("songs").select("*").eq(platformColumn, item.platformId).maybeSingle();
    if (direct.data) return { match: direct.data, ambiguous: false };
  }
  if (item.isrc) {
    const rows = await service.from("songs").select("*").eq("artist_id", artist.id).eq("isrc", item.isrc).limit(3);
    if ((rows.data ?? []).length === 1) return { match: rows.data![0], ambiguous: false };
    if ((rows.data ?? []).length > 1) return { match: null, ambiguous: true, candidates: rows.data!.map((r: any) => String(r.id)) };
  }

  let query = service.from("songs").select("*").eq("artist_id", artist.id);
  if (releaseId) query = query.eq("release_id", releaseId);
  const rows = await query.limit(300);
  const matches = (rows.data ?? []).filter((row: any) => normalize(row.title) === normalize(item.title));
  if (matches.length === 1) return { match: matches[0], ambiguous: false };
  if (matches.length > 1) return { match: null, ambiguous: true, candidates: matches.map((r: any) => String(r.id)) };
  return { match: null, ambiguous: false };
}

async function reconcileTrack(service: ServiceClient, artist: ArtistRow, item: ExternalItem, totals: SyncTotals) {
  let releaseId: string | null = null;
  if (item.parentPlatformId) {
    const parent = await service
      .from("catalog_platform_items")
      .select("matched_release_id")
      .eq("platform", item.platform)
      .eq("item_type", "release")
      .eq("platform_id", item.parentPlatformId)
      .maybeSingle();
    releaseId = parent.data?.matched_release_id ? String(parent.data.matched_release_id) : null;
  }

  const found = await findSongMatch(service, artist, item, releaseId);
  if (found.ambiguous) {
    totals.conflicts += 1;
    await createConflict(service, artist.id, item, "Multiple songs matched ISRC/title.", found.candidates ?? []);
    return null;
  }

  const existing = found.match;
  const oldLinks = existing?.links && typeof existing.links === "object" ? existing.links : {};
  const links = { ...oldLinks, ...platformLinkObject(item) };
  const patch: Record<string, unknown> = {
    links,
    catalog_sync_state: "synced",
    updated_at: new Date().toISOString()
  };
  if (item.platform === "spotify") patch.spotify_track_id = item.platformId;
  if (item.platform === "apple_music") patch.apple_music_song_id = item.platformId;
  if (item.isrc && !existing?.isrc) patch.isrc = item.isrc;
  if (item.durationMs && !existing?.duration) patch.duration = Math.round(item.durationMs / 1000);
  if (typeof item.explicit === "boolean") patch.explicit = item.explicit;
  if (releaseId && !existing?.release_id) patch.release_id = releaseId;

  let songId: string;
  if (existing?.id) {
    const update = await service.from("songs").update(patch).eq("id", existing.id).select("id").single();
    if (update.error) throw new Error(update.error.message);
    songId = String(update.data.id);
    totals.updated += 1;
  } else {
    const slugBase = slugifyText(artist.slug + "-" + item.title + "-" + (item.isrc ?? item.platformId));
    const payload: Record<string, unknown> = {
      artist_id: artist.id,
      release_id: releaseId,
      title: item.title,
      slug: slugBase,
      isrc: item.isrc ?? null,
      explicit: Boolean(item.explicit),
      duration: item.durationMs ? Math.round(item.durationMs / 1000) : null,
      links,
      catalog_sync_state: "synced"
    };
    if (item.platform === "spotify") payload.spotify_track_id = item.platformId;
    if (item.platform === "apple_music") payload.apple_music_song_id = item.platformId;

    let inserted = await service.from("songs").insert(payload).select("id").single();
    if (inserted.error && String(inserted.error.message).toLowerCase().includes("slug")) {
      payload.slug = slugBase + "-" + item.platformId.slice(-6);
      inserted = await service.from("songs").insert(payload).select("id").single();
    }
    if (inserted.error) throw new Error(inserted.error.message);
    songId = String(inserted.data.id);
    totals.imported += 1;
  }

  await service
    .from("catalog_platform_items")
    .update({ matched_song_id: songId, updated_at: new Date().toISOString() })
    .eq("platform", item.platform)
    .eq("item_type", "track")
    .eq("platform_id", item.platformId);

  return songId;
}

async function upsertExternalItems(service: ServiceClient, artist: ArtistRow, provider: ProviderResult) {
  const now = new Date().toISOString();
  if (provider.items.length === 0) return;
  const rows = provider.items.map((item) => ({
    artist_id: artist.id,
    platform: item.platform,
    item_type: item.itemType,
    platform_id: item.platformId,
    parent_platform_id: item.parentPlatformId ?? null,
    title: item.title,
    url: item.url ?? null,
    artwork_url: item.artworkUrl ?? null,
    release_date: normalizeDate(item.releaseDate),
    isrc: item.isrc ?? null,
    upc: item.upc ?? null,
    duration_ms: item.durationMs ?? null,
    explicit: item.explicit ?? null,
    raw: item.raw ?? {},
    last_seen_at: now,
    miss_count: 0,
    active: true,
    updated_at: now
  }));
  const result = await service
    .from("catalog_platform_items")
    .upsert(rows, { onConflict: "platform,item_type,platform_id", ignoreDuplicates: false });
  if (result.error) throw new Error(result.error.message);
}

async function markMissing(service: ServiceClient, artist: ArtistRow, provider: ProviderResult) {
  if (!provider.completeScan) return;
  for (const itemType of ["release", "track"] as ItemType[]) {
    const seen = new Set(provider.items.filter((item) => item.itemType === itemType).map((item) => item.platformId));
    const existing = await service
      .from("catalog_platform_items")
      .select("id,platform_id,miss_count,title,url")
      .eq("artist_id", artist.id)
      .eq("platform", provider.platform)
      .eq("item_type", itemType)
      .eq("active", true);
    for (const row of existing.data ?? []) {
      if (seen.has(String((row as any).platform_id))) continue;
      const next = Number((row as any).miss_count ?? 0) + 1;
      await service
        .from("catalog_platform_items")
        .update({ miss_count: next, active: next < 3, updated_at: new Date().toISOString() })
        .eq("id", (row as any).id);
      if (next === 3) {
        await service.from("catalog_sync_conflicts").insert({
          artist_id: artist.id,
          platform: provider.platform,
          conflict_type: "possible_takedown",
          reason: "Item missing from 3 complete provider scans. Kept in EM catalog pending review.",
          external_item: {
            platformId: (row as any).platform_id,
            itemType,
            title: (row as any).title,
            url: (row as any).url
          },
          candidate_ids: [],
          status: "open"
        });
      }
    }
  }
}

async function cacheYouTube(service: ServiceClient, artist: ArtistRow, items: ExternalItem[]) {
  const rows = items
    .filter((item) => item.itemType === "video")
    .map((item) => ({
      artist_id: artist.id,
      type: "video",
      title: item.title,
      url: item.url,
      thumbnail: item.artworkUrl,
      metadata: { platform: "youtube", videoId: item.platformId, releaseDate: item.releaseDate },
      last_synced: new Date().toISOString()
    }));
  if (rows.length) {
    await service
      .from("artist_content_cache")
      .upsert(rows, { onConflict: "artist_id,type,title,url", ignoreDuplicates: false });
  }
}

export async function getSyncedYouTubeVideos(artistId: string, service?: ServiceClient) {
  const supabase = serviceOrDefault(service);
  const result = await supabase
    .from("catalog_platform_items")
    .select("platform_id,title,url,artwork_url,release_date,raw")
    .eq("artist_id", artistId)
    .eq("platform", "youtube")
    .eq("item_type", "video")
    .eq("active", true)
    .order("release_date", { ascending: false })
    .limit(12);
  if (result.error) return [];
  return (result.data ?? []).map((row: any) => ({
    id: String(row.platform_id),
    title: String(row.title),
    href: row.url ? String(row.url) : "https://www.youtube.com/watch?v=" + String(row.platform_id),
    embed: "https://www.youtube.com/embed/" + String(row.platform_id),
    thumbnail: row.artwork_url ? String(row.artwork_url) : "https://i.ytimg.com/vi/" + String(row.platform_id) + "/hqdefault.jpg",
    releaseDate: row.release_date ? String(row.release_date) : null
  }));
}

export async function syncArtistCatalog(
  artistId?: string,
  options: { triggerType?: string; service?: ServiceClient } = {}
) {
  const service = serviceOrDefault(options.service);
  let query = service
    .from("artists")
    .select("id,name,slug,spotify_artist_id,apple_music_artist_id,youtube_channel_id,catalog_sync_enabled")
    .eq("catalog_sync_enabled", true)
    .eq("active", true);
  if (artistId) query = query.eq("id", artistId);
  const artistsResult = await query.order("name");
  if (artistsResult.error) throw new Error(artistsResult.error.message);

  const summary = { artists: 0, discovered: 0, imported: 0, updated: 0, conflicts: 0, errors: [] as string[] };

  for (const rawArtist of artistsResult.data ?? []) {
    const artist = rawArtist as ArtistRow;
    const runInsert = await service
      .from("catalog_sync_runs")
      .insert({ artist_id: artist.id, trigger_type: options.triggerType ?? "manual", status: "running" })
      .select("id")
      .single();
    const runId = runInsert.data?.id ? String(runInsert.data.id) : null;
    const totals: SyncTotals = { discovered: 0, imported: 0, updated: 0, conflicts: 0 };
    const platformState: Record<string, unknown> = {};
    const errors: string[] = [];

    const providers = await Promise.all([fetchSpotify(artist), fetchApple(artist), fetchYouTube(artist)]);
    for (const provider of providers) {
      platformState[provider.platform] = {
        configured: provider.configured,
        ok: !provider.error,
        discovered: provider.items.length,
        completeScan: provider.completeScan,
        error: provider.error ?? null
      };
      if (provider.error) errors.push(provider.platform + ": " + provider.error);
      totals.discovered += provider.items.length;

      try {
        await upsertExternalItems(service, artist, provider);

        for (const item of provider.items.filter((entry) => entry.itemType === "release")) {
          await reconcileRelease(service, artist, item, totals);
        }
        for (const item of provider.items.filter((entry) => entry.itemType === "track")) {
          await reconcileTrack(service, artist, item, totals);
        }
        if (provider.platform === "youtube") await cacheYouTube(service, artist, provider.items);
        await markMissing(service, artist, provider);
      } catch (error) {
        const message = provider.platform + ": " + String((error as Error)?.message ?? error);
        errors.push(message);
        platformState[provider.platform] = {
          ...(platformState[provider.platform] as Record<string, unknown>),
          ok: false,
          error: message
        };
      }
    }

    const status = errors.length === 0 ? "completed" : totals.discovered > 0 ? "partial" : "failed";
    const now = new Date().toISOString();
    await service
      .from("artists")
      .update({
        last_catalog_sync_at: now,
        last_catalog_sync_status: status,
        last_catalog_sync_error: errors.length ? errors.join(" | ").slice(0, 2000) : null
      })
      .eq("id", artist.id);

    if (runId) {
      await service
        .from("catalog_sync_runs")
        .update({
          status,
          platforms: platformState,
          discovered_count: totals.discovered,
          imported_count: totals.imported,
          updated_count: totals.updated,
          conflict_count: totals.conflicts,
          errors,
          completed_at: now
        })
        .eq("id", runId);
    }

    summary.artists += 1;
    summary.discovered += totals.discovered;
    summary.imported += totals.imported;
    summary.updated += totals.updated;
    summary.conflicts += totals.conflicts;
    summary.errors.push(...errors);
  }

  return summary;
}

export async function getCatalogSyncDashboard(service?: ServiceClient) {
  const supabase = serviceOrDefault(service);
  const [artists, runs, conflicts] = await Promise.all([
    supabase
      .from("artists")
      .select("id,name,slug,spotify_artist_id,apple_music_artist_id,youtube_channel_id,catalog_sync_enabled,last_catalog_sync_at,last_catalog_sync_status,last_catalog_sync_error")
      .order("name"),
    supabase.from("catalog_sync_runs").select("*").order("started_at", { ascending: false }).limit(20),
    supabase.from("catalog_sync_conflicts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50)
  ]);
  return {
    artists: artists.data ?? [],
    runs: runs.data ?? [],
    conflicts: conflicts.data ?? [],
    credentials: {
      spotify: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
      apple: true,
      youtube: true
    }
  };
}
