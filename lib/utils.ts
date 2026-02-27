import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const PRODUCTION_SITE_URL = "https://emrecordsmusic.com";

export function getSiteOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "").trim();

  if (!configured) {
    return process.env.NODE_ENV === "development" ? "http://localhost:3000" : PRODUCTION_SITE_URL;
  }

  try {
    const parsed = new URL(configured.startsWith("http") ? configured : `https://${configured}`);

    // Prevent production canonical/sitemap URLs from drifting to *.vercel.app.
    if (
      process.env.NODE_ENV === "production" &&
      (parsed.hostname.endsWith(".vercel.app") || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return PRODUCTION_SITE_URL;
    }

    return parsed.origin;
  } catch {
    return process.env.NODE_ENV === "development" ? "http://localhost:3000" : PRODUCTION_SITE_URL;
  }
}

export function absoluteUrl(path: string): string {
  const base = getSiteOrigin();
  return `${base.replace(/\/$/, "")}${path}`;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export function normalizeImageUrl(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") {
      const id = parsed.pathname.replace("/", "").trim();
      if (id) {
        return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      }
    }

    if (parsed.hostname.includes("youtube.com")) {
      const idFromWatch = parsed.searchParams.get("v");
      const idFromEmbed = parsed.pathname.match(/^\/embed\/([^/]+)/)?.[1];
      const idFromShorts = parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
      const id = idFromWatch ?? idFromEmbed ?? idFromShorts;

      if (id) {
        return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      }
    }

    if (parsed.hostname === "drive.google.com") {
      const pathMatch = parsed.pathname.match(/^\/file\/d\/([^/]+)\//);
      const fileIdFromPath = pathMatch?.[1];
      const fileIdFromQuery = parsed.searchParams.get("id");
      const fileId = fileIdFromPath ?? fileIdFromQuery;

      if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

export function normalizeYouTubeEmbedUrl(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be" || parsed.hostname === "www.youtu.be") {
      const id = parsed.pathname.replace("/", "").trim();
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }

      const idFromWatch = parsed.searchParams.get("v");
      const idFromShorts = parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
      const id = idFromWatch ?? idFromShorts;

      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

export function normalizeSpotifyEmbedUrl(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("spotify.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }

      const match = parsed.pathname.match(/^\/(track|album|playlist)\/([^/?]+)/);
      if (match) {
        return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

export function getSpotifyEmbedHeight(url: string): number {
  if (!url) return 152;

  try {
    const parsed = new URL(url);
    const cleanPath = parsed.pathname.replace(/^\/intl-[a-z]{2}\//i, "/");

    if (cleanPath.includes("/track/")) return 80;
    if (cleanPath.includes("/album/")) return 352;
    if (cleanPath.includes("/playlist/")) return 352;

    return 152;
  } catch {
    return 152;
  }
}

export function normalizeAppleMusicEmbedUrl(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("music.apple.com") && !parsed.hostname.includes("embed.music.apple.com")) {
      return `https://embed.music.apple.com${parsed.pathname}${parsed.search}`;
    }

    return url;
  } catch {
    return url;
  }
}

export function getAppleMusicEmbedHeight(url: string): number {
  if (!url) return 450;

  try {
    const parsed = new URL(url);

    // Track embeds usually include `?i=` and use a compact player height.
    if (parsed.searchParams.has("i")) return 175;

    // Album/playlist style embeds use a taller card.
    return 450;
  } catch {
    return 450;
  }
}

export function normalizeSoundCloudEmbedUrl(url: string): string {
  if (!url) return url;

  if (url.includes("w.soundcloud.com/player")) {
    return url;
  }

  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
}

export function toJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
