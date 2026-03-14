import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LazyEmbedFrame } from "@/components/artists/lazy-embed-frame";
import { InternalLinksBlock } from "@/components/shared/internal-links-block";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getPublishedReleases } from "@/lib/queries";
import { buildCollectionMetadata } from "@/lib/seo";
import { absoluteUrl, normalizeImageUrl, normalizeYouTubeEmbedUrl, toJsonLd } from "@/lib/utils";

export const metadata: Metadata = buildCollectionMetadata("videos");

function youtubeWatchUrl(embedUrl: string): string | null {
  const match = normalizeYouTubeEmbedUrl(embedUrl).match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (!match?.[1]) return null;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function youtubeThumb(embedUrl: string): string | null {
  const match = normalizeYouTubeEmbedUrl(embedUrl).match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (!match?.[1]) return null;
  return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
}

export default async function VideosPage() {
  const lang = await getSiteLanguage();
  const releases = await getPublishedReleases();

  const videos = releases
    .filter((item) => Boolean(item.youtubeEmbed))
    .map((item) => {
      const embed = normalizeYouTubeEmbedUrl(item.youtubeEmbed || "");
      return {
        id: item.id,
        title: item.videoTitle || item.title,
        artistName: item.artistName || "EM Records Artist",
        artistSlug: item.artistSlug ?? null,
        embed,
        href: youtubeWatchUrl(embed),
        thumbnail: normalizeImageUrl(item.videoThumbnailUrl || youtubeThumb(embed) || item.coverUrl),
        releaseSlug: item.slug ?? item.id
      };
    });

  const videosSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: lang === "es" ? "Videos EM Records" : "EM Records Videos",
    itemListElement: videos.map((video, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "VideoObject",
        name: video.title,
        thumbnailUrl: video.thumbnail,
        embedUrl: video.embed,
        contentUrl: video.href,
        url: absoluteUrl(`/music/${video.releaseSlug}`)
      }
    }))
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(videosSchema) }} />
      <h1 className="sr-only">{lang === "es" ? "Videos de EM Records" : "EM Records videos"}</h1>
      <SectionTitle
        eyebrow={lang === "es" ? "Videos" : "Videos"}
        title={lang === "es" ? "Visuales Oficiales" : "Official Visuals"}
        description={lang === "es" ? "Videoclips y visualizers del catálogo EM Records." : "Official videos and visualizers from the EM Records catalog."}
      />

      {videos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/70">
          {lang === "es" ? "No hay videos publicados todavía." : "No published videos yet."}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {videos.map((video) => (
            <article key={video.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="relative mb-4 aspect-video overflow-hidden rounded-xl border border-white/10">
                <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
              </div>
              <h2 className="text-lg font-semibold text-white">{video.title}</h2>
              <p className="mt-1 text-sm text-white/65">
                {video.artistSlug ? <Link href={`/artists/${video.artistSlug}`} className="hover:text-gold">{video.artistName}</Link> : video.artistName}
              </p>
              <div className="mt-4">
                <LazyEmbedFrame title={video.title} src={video.embed} height={250} />
              </div>
              {video.href ? (
                <a href={video.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
                  {lang === "es" ? "Ver en YouTube" : "Watch on YouTube"}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <InternalLinksBlock
        title={lang === "es" ? "Navega el Sitio" : "Site Navigation"}
        links={[
          {
            href: "/music",
            label: lang === "es" ? "Música" : "Music",
            description: lang === "es" ? "Escucha singles, EPs y álbumes oficiales." : "Stream singles, EPs and albums."
          },
          {
            href: "/artists",
            label: lang === "es" ? "Artistas" : "Artists",
            description: lang === "es" ? "Explora perfiles oficiales de artistas." : "Explore official artist profiles."
          },
          {
            href: "/press",
            label: lang === "es" ? "Prensa" : "Press",
            description: lang === "es" ? "Noticias y cobertura editorial del sello." : "News and editorial coverage."
          }
        ]}
      />
    </div>
  );
}
