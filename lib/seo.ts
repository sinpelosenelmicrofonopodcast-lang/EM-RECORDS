import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/utils";

const DEFAULT_OG_IMAGE = "/og-default.jpg";

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article" | "music.song" | "music.album" | "profile";
  noIndex?: boolean;
};

type CollectionPage = "artists" | "music" | "publishing" | "videos" | "events" | "press" | "join";

type ArtistSchemaInput = {
  name: string;
  path: string;
  genre?: string | null;
  image?: string | null;
  sameAs?: Array<string | null | undefined>;
  description?: string | null;
};

type ReleaseSchemaInput = {
  title: string;
  releaseType: "single" | "ep" | "album";
  path: string;
  datePublished?: string | null;
  image?: string | null;
  artistName: string;
  artistPath?: string | null;
  sameAs?: Array<string | null | undefined>;
  tracks?: Array<{ name: string }>;
};

export function truncateForMeta(input: string, maxLength: number): string {
  const value = input.replace(/\s+/g, " ").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`;
}

function toAbsoluteImageUrl(image: string): string {
  if (!image) return absoluteUrl(DEFAULT_OG_IMAGE);
  return /^https?:\/\//i.test(image) ? image : absoluteUrl(image);
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noIndex = false
}: PageSeoInput): Metadata {
  const canonical = absoluteUrl(path);
  const imageUrl = toAbsoluteImageUrl(image);
  const safeTitle = truncateForMeta(title, 110);
  const safeDescription = truncateForMeta(description, 170);

  return {
    title: safeTitle,
    description: safeDescription,
    keywords,
    alternates: {
      canonical
    },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url: canonical,
      siteName: "EM Records LLC",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: safeTitle
        }
      ],
      locale: "es_US",
      type
    },
    twitter: {
      card: "summary_large_image",
      title: safeTitle,
      description: safeDescription,
      images: [imageUrl]
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-snippet": -1,
            "max-image-preview": "none"
          }
        }
      : undefined
  };
}

export function buildArtistMetadata(input: { artistName: string; artistSlug: string; image?: string | null }): Metadata {
  return buildPageMetadata({
    title: `${truncateForMeta(input.artistName, 70)} | EM Records`,
    description: `${truncateForMeta(input.artistName, 70)} — artista urbano Latino. Discografía, lanzamientos y enlaces oficiales en EM Records.`,
    path: `/artists/${input.artistSlug}`,
    type: "profile",
    image: input.image ?? DEFAULT_OG_IMAGE
  });
}

export function buildReleaseMetadata(input: {
  title: string;
  artistName: string;
  slug: string;
  image?: string | null;
  type?: "single" | "ep" | "album";
}): Metadata {
  return buildPageMetadata({
    title: `${truncateForMeta(input.title, 65)} — ${truncateForMeta(input.artistName, 40)} | EM Records`,
    description: `Escucha '${truncateForMeta(input.title, 60)}' de ${truncateForMeta(input.artistName, 45)}. Links oficiales a Spotify, Apple Music y YouTube. EM Records.`,
    path: `/music/${input.slug}`,
    type: input.type === "single" ? "music.song" : "music.album",
    image: input.image ?? DEFAULT_OG_IMAGE
  });
}

export function buildCollectionMetadata(page: CollectionPage): Metadata {
  const map: Record<CollectionPage, { title: string; description: string; path: string; keywords: string[] }> = {
    artists: {
      title: "Artistas | EM Records",
      description: "Roster oficial de artistas de EM Records con enfoque urbano latino e impacto internacional.",
      path: "/artists",
      keywords: ["artistas urbanos", "roster latino", "EM Records artists"]
    },
    music: {
      title: "Música | EM Records",
      description: "Singles, EPs y álbumes oficiales del catálogo de EM Records con links de streaming verificados.",
      path: "/music",
      keywords: ["lanzamientos", "discografía latina", "EM Records music"]
    },
    publishing: {
      title: "Producción & Publishing | EM Records",
      description: "Servicios de publishing, distribución y licensing de EM Records para catálogo urbano latino.",
      path: "/publishing",
      keywords: ["publishing", "licensing", "distribución musical"]
    },
    videos: {
      title: "Videos | EM Records",
      description: "Videoclips, visualizers y contenido oficial de artistas EM Records.",
      path: "/videos",
      keywords: ["videos oficiales", "music videos", "visualizers"]
    },
    events: {
      title: "Eventos | EM Records",
      description: "Próximos shows y eventos oficiales de EM Records.",
      path: "/events",
      keywords: ["eventos", "conciertos", "tours"]
    },
    press: {
      title: "Prensa | EM Records",
      description: "Noticias, prensa y artículos editoriales de EM Records.",
      path: "/press",
      keywords: ["prensa", "news", "media"]
    },
    join: {
      title: "Únete a EM | EM Records",
      description: "Envía tu demo y únete al pipeline oficial de revisión de EM Records.",
      path: "/join",
      keywords: ["submit demo", "join EM", "new artists"]
    }
  };

  const selected = map[page];
  return buildPageMetadata({
    title: selected.title,
    description: selected.description,
    path: selected.path,
    keywords: selected.keywords
  });
}

export function buildMusicGroupJsonLd(input: ArtistSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: input.name,
    url: absoluteUrl(input.path),
    genre: input.genre || "Latino",
    description: input.description || undefined,
    image: toAbsoluteImageUrl(input.image || DEFAULT_OG_IMAGE),
    sameAs: (input.sameAs ?? []).filter(Boolean)
  };
}

export function buildReleaseJsonLd(input: ReleaseSchemaInput) {
  const sameAs = (input.sameAs ?? []).filter(Boolean) as string[];
  const byArtist = {
    "@type": "MusicGroup",
    name: input.artistName,
    url: absoluteUrl(input.artistPath || "/artists")
  };
  const common = {
    "@context": "https://schema.org",
    name: input.title,
    byArtist,
    datePublished: input.datePublished || undefined,
    image: toAbsoluteImageUrl(input.image || DEFAULT_OG_IMAGE),
    url: absoluteUrl(input.path),
    sameAs,
    potentialAction: {
      "@type": "ListenAction",
      target: sameAs
    }
  };

  if (input.releaseType === "single") {
    return {
      ...common,
      "@type": "MusicRecording"
    };
  }

  return {
    ...common,
    "@type": "MusicAlbum",
    albumProductionType: input.releaseType.toUpperCase(),
    track: (input.tracks ?? []).map((track, index) => ({
      "@type": "MusicRecording",
      position: index + 1,
      name: track.name
    }))
  };
}

