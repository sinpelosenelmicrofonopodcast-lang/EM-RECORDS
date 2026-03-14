import type { Metadata } from "next";
import Link from "next/link";
import { ReleaseCatalog } from "@/components/releases/release-catalog";
import { UpcomingCountdownBadge } from "@/components/releases/upcoming-countdown-badge";
import { InternalLinksBlock } from "@/components/shared/internal-links-block";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getMusicCatalogReleases, getPublishedArtists } from "@/lib/queries";
import { buildCollectionMetadata } from "@/lib/seo";
import {
  absoluteUrl,
  formatDate,
  normalizeAppleMusicEmbedUrl,
  normalizeImageUrl,
  normalizeSpotifyEmbedUrl,
  normalizeYouTubeEmbedUrl,
  toJsonLd
} from "@/lib/utils";

export const metadata: Metadata = buildCollectionMetadata("music");

function normalizeReleaseType(input: string | null | undefined): "single" | "ep" | "album" {
  const value = String(input ?? "").toLowerCase();
  if (value === "ep" || value === "album") return value;
  return "single";
}

export default async function MusicPage() {
  const lang = await getSiteLanguage();
  const [releases, artists] = await Promise.all([getMusicCatalogReleases(), getPublishedArtists()]);
  const now = Date.now();

  const catalogItems = releases.map((release) => {
    const spotifyEmbedSrc = release.spotifyEmbed ? normalizeSpotifyEmbedUrl(release.spotifyEmbed) : null;
    const appleEmbedSrc = release.appleEmbed ? normalizeAppleMusicEmbedUrl(release.appleEmbed) : null;
    const youtubeEmbedSrc = release.youtubeEmbed ? normalizeYouTubeEmbedUrl(release.youtubeEmbed) : null;
    const linkedArtist = release.artistSlug ? artists.find((artist) => artist.slug === release.artistSlug) : null;
    const fallbackArtistName = lang === "es" ? "Artista invitado" : "Guest artist";

    const releaseAt = Number.isNaN(+new Date(release.releaseDate)) ? null : +new Date(release.releaseDate);
    const publishAt = release.publishAt && !Number.isNaN(+new Date(release.publishAt)) ? +new Date(release.publishAt) : null;
    const comingSoon = (release.contentStatus ?? "published") === "scheduled" || (releaseAt !== null && releaseAt > now) || (publishAt !== null && publishAt > now);

    return {
      id: release.id,
      slug: release.slug ?? release.id,
      title: release.title,
      description: release.description,
      format: release.format,
      featured: release.featured,
      coverUrl: release.coverUrl,
      releaseDateLabel: formatDate(release.releaseDate),
      artistName: linkedArtist?.name ?? release.artistName ?? release.artistSlug ?? fallbackArtistName,
      artistSlug: release.artistSlug ?? null,
      featuring: release.featuring ?? null,
      preSaveUrl: release.preSaveUrl ?? null,
      comingSoon,
      spotifyEmbed: spotifyEmbedSrc,
      appleEmbed: appleEmbedSrc,
      youtubeEmbed: youtubeEmbedSrc,
      releaseDateRaw: release.releaseDate,
      releaseType: normalizeReleaseType(release.releaseType ?? release.format)
    };
  });

  const releasesSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: lang === "es" ? "Música EM Records" : "EM Records Music",
    itemListElement: catalogItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": item.releaseType === "single" ? "MusicRecording" : "MusicAlbum",
        name: item.title,
        byArtist: {
          "@type": "MusicGroup",
          name: item.artistName
        },
        datePublished: item.releaseDateRaw,
        image: /^https?:\/\//i.test(item.coverUrl) ? item.coverUrl : absoluteUrl(item.coverUrl),
        url: absoluteUrl(`/music/${item.slug}`),
        sameAs: [item.spotifyEmbed, item.appleEmbed, item.youtubeEmbed].filter(Boolean)
      }
    }))
  };
  const upcomingItems = catalogItems
    .filter((item) => item.comingSoon)
    .sort((a, b) => +new Date(a.releaseDateRaw) - +new Date(b.releaseDateRaw));
  const liveItems = catalogItems.filter((item) => !item.comingSoon);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(releasesSchema) }} />
      <h1 className="sr-only">{lang === "es" ? "Música de EM Records" : "EM Records music catalog"}</h1>
      <SectionTitle
        eyebrow={lang === "es" ? "Discografía" : "Discography"}
        title={lang === "es" ? "Música Oficial" : "Official Music"}
        description={lang === "es" ? "Singles, EPs y álbumes del catálogo EM." : "Singles, EPs and albums across the EM catalog."}
      />

      {upcomingItems.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 via-black to-black p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">{lang === "es" ? "Próximos Lanzamientos" : "Upcoming Releases"}</p>
              <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
                {lang === "es" ? "Coming Soon en EM Records" : "Coming Soon on EM Records"}
              </h2>
            </div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/55">
              {upcomingItems.length} {lang === "es" ? "programados" : "scheduled"}
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {upcomingItems.map((item) => (
              <article key={`upcoming-${item.id}`} className="rounded-xl border border-white/10 bg-black/40 p-3">
                <div className="flex items-start gap-3">
                  <img
                    src={normalizeImageUrl(item.coverUrl)}
                    alt={item.title}
                    loading="lazy"
                    className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-base font-semibold text-white">{item.title}</p>
                    <p className="line-clamp-1 text-sm text-white/65">{item.artistName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-gold">{item.releaseDateLabel}</p>
                      <UpcomingCountdownBadge targetDate={item.releaseDateRaw} lang={lang} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {item.preSaveUrl ? (
                    <a
                      href={item.preSaveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 flex-1 items-center justify-center rounded-full border border-gold/70 bg-gold/15 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold hover:bg-gold/25"
                    >
                      Pre-save
                    </a>
                  ) : (
                    <span className="inline-flex h-8 flex-1 items-center justify-center rounded-full border border-white/15 px-3 text-[10px] uppercase tracking-[0.14em] text-white/50">
                      {lang === "es" ? "Pre-save pronto" : "Pre-save soon"}
                    </span>
                  )}
                  <Link href={`/music/${item.slug}`} className="inline-flex h-8 items-center justify-center rounded-full border border-white/20 px-3 text-[11px] uppercase tracking-[0.14em] text-white/75 hover:border-gold hover:text-gold">
                    {lang === "es" ? "Detalles" : "Details"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {liveItems.length > 0 ? <ReleaseCatalog lang={lang} items={liveItems} /> : null}
      {liveItems.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/65">
          {lang === "es"
            ? "No hay lanzamientos activos todavía. Revisa la sección de próximos lanzamientos."
            : "No live releases yet. Check the upcoming releases section."}
        </section>
      ) : null}

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">{lang === "es" ? "Lanzamientos" : "Releases"}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {liveItems.map((release) => (
            <Link key={release.id} href={`/music/${release.slug}`} className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/80 hover:border-gold/45">
              {release.title} <span className="text-white/50">· {release.artistName}</span>
            </Link>
          ))}
        </div>
      </section>

      <InternalLinksBlock
        title={lang === "es" ? "Explora Más" : "Explore More"}
        links={[
          {
            href: "/artists",
            label: lang === "es" ? "Artistas" : "Artists",
            description: lang === "es" ? "Conoce el roster completo de EM Records." : "Meet the full EM Records roster."
          },
          {
            href: "/videos",
            label: lang === "es" ? "Videos" : "Videos",
            description: lang === "es" ? "Visualizers y videos oficiales del catálogo." : "Visualizers and official catalog videos."
          },
          {
            href: "/press",
            label: lang === "es" ? "Prensa" : "Press",
            description: lang === "es" ? "Noticias, entrevistas y apariciones editoriales." : "News, interviews and editorial coverage."
          }
        ]}
      />
    </div>
  );
}
