import { createServiceClient } from "@/lib/supabase/service";
import { slugifyText } from "@/lib/utils";

async function fetchSongLink(url: string) {
  const res = await fetch(
    "https://api.song.link/v1-alpha.1/links?url=" + encodeURIComponent(url)
  );
  return res.json();
}

export async function importSpotifyRelease(url: string) {

  const supabase = createServiceClient();

  const json = await fetchSongLink(url);

  const entity = Object.values(json.entitiesByUniqueId)[0] as any;

  const title = entity.title;
  const artist = entity.artistName;
  const cover = entity.thumbnailUrl;

  const links = json.linksByPlatform || {};

  const spotify = links.spotify?.url ?? null;
  const apple = links.appleMusic?.url ?? null;
  const youtube = links.youtube?.url ?? null;

  const slug = slugifyText(title);

  const { data: existing } = await supabase
    .from("releases")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("releases")
    .insert({
      title,
      slug,
      format: "single",
      release_type: "single",
      artist_name: artist,
      cover_url: cover,
      spotify_embed: spotify,
      apple_embed: apple,
      youtube_embed: youtube,
      release_date: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function importArtistCatalog(url: string) {

  const supabase = createServiceClient();

  const res = await fetch(
    "https://api.song.link/v1-alpha.1/links?url=" + encodeURIComponent(url)
  );

  const json = await res.json();

  const entities = Object.values(json.entitiesByUniqueId) as any[];

  const releases = [];

  for (const entity of entities) {

    if (!entity.url) continue;

    const release = await importSpotifyRelease(entity.url);

    releases.push(release);

  }

  return releases;
}
