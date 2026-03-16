export type IsrcMetadata = {
  title?: string;
  isrc: string;
  spotifyEmbed?: string | null;
  appleEmbed?: string | null;
  youtubeEmbed?: string | null;
};

export async function lookupIsrc(isrc: string): Promise<IsrcMetadata | null> {

  if (!isrc) return null;

  try {

    const url = "https://api.song.link/v1-alpha.1/links?isrc=" + encodeURIComponent(isrc);

    const res = await fetch(url);

    if (!res.ok) return null;

    const json = await res.json();

    const links = json?.linksByPlatform ?? {};

    return {
      title: json?.entitiesByUniqueId
        ? Object.values(json.entitiesByUniqueId)[0]?.title
        : undefined,
      isrc,
      spotifyEmbed: links.spotify?.url ?? null,
      appleEmbed: links.appleMusic?.url ?? null,
      youtubeEmbed: links.youtube?.url ?? null
    };

  } catch {
    return null;
  }
}
