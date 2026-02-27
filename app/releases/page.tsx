import type { Metadata } from "next";
import { ReleaseCatalog } from "@/components/releases/release-catalog";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getArtists, getReleases } from "@/lib/queries";
import { buildPageMetadata } from "@/lib/seo";
import {
  absoluteUrl,
  formatDate,
  normalizeAppleMusicEmbedUrl,
  normalizeSpotifyEmbedUrl,
  normalizeYouTubeEmbedUrl,
  toJsonLd
} from "@/lib/utils";

export const metadata: Metadata = buildPageMetadata({
  title: "Lanzamientos",
  description: "Discografía oficial de EM Records con singles, EPs y álbumes del catálogo.",
  path: "/releases",
  keywords: ["discografía", "lanzamientos urbanos", "spotify em records", "apple music em records"]
});

export default async function ReleasesPage() {
  const lang = await getSiteLanguage();
  const [releases, artists] = await Promise.all([getReleases(), getArtists()]);
  const catalogItems = releases.map((release) => {
    const spotifyEmbedSrc = release.spotifyEmbed ? normalizeSpotifyEmbedUrl(release.spotifyEmbed) : null;
    const appleEmbedSrc = release.appleEmbed ? normalizeAppleMusicEmbedUrl(release.appleEmbed) : null;
    const youtubeEmbedSrc = release.youtubeEmbed ? normalizeYouTubeEmbedUrl(release.youtubeEmbed) : null;
    const linkedArtist = release.artistSlug ? artists.find((artist) => artist.slug === release.artistSlug) : null;
    const fallbackArtistName = lang === "es" ? "Artista invitado" : "Guest artist";

    return {
      id: release.id,
      title: release.title,
      description: release.description,
      format: release.format,
      featured: release.featured,
      coverUrl: release.coverUrl,
      releaseDateLabel: formatDate(release.releaseDate),
      artistName: linkedArtist?.name ?? release.artistName ?? release.artistSlug ?? fallbackArtistName,
      artistSlug: release.artistSlug ?? null,
      featuring: release.featuring ?? null,
      spotifyEmbed: spotifyEmbedSrc,
      appleEmbed: appleEmbedSrc,
      youtubeEmbed: youtubeEmbedSrc
    };
  });
  const releasesSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: lang === "es" ? "Últimos Lanzamientos EM Records" : "EM Records Latest Releases",
        itemListElement: catalogItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "MusicRecording",
            name: item.title,
            byArtist: {
              "@type": "MusicGroup",
              name: item.artistName
            },
            datePublished: releases[index]?.releaseDate,
            image: /^https?:\/\//i.test(item.coverUrl) ? item.coverUrl : absoluteUrl(item.coverUrl)
          }
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: absoluteUrl("/")
          },
          {
            "@type": "ListItem",
            position: 2,
            name: lang === "es" ? "Lanzamientos" : "Releases",
            item: absoluteUrl("/releases")
          }
        ]
      }
    ]
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(releasesSchema) }} />
      <SectionTitle
        eyebrow={lang === "es" ? "Discografía" : "Discography"}
        title={lang === "es" ? "Últimos Lanzamientos" : "Latest Releases"}
        description={lang === "es" ? "Singles, EPs y álbumes del catálogo EM." : "Singles, EPs and albums across the EM catalog."}
      />

      <ReleaseCatalog lang={lang} items={catalogItems} />
    </div>
  );
}
