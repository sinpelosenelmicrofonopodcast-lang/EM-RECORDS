import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LazyEmbedFrame } from "@/components/artists/lazy-embed-frame";
import { InternalLinksBlock } from "@/components/shared/internal-links-block";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getArtistBySlug, getMusicCatalogReleaseBySlug, getMusicCatalogReleases } from "@/lib/queries";
import { buildReleaseJsonLd, buildReleaseMetadata } from "@/lib/seo";
import {
  formatDate,
  getAppleMusicEmbedHeight,
  getSpotifyEmbedHeight,
  normalizeAppleMusicEmbedUrl,
  normalizeImageUrl,
  normalizeSpotifyEmbedUrl,
  normalizeYouTubeEmbedUrl,
  toJsonLd
} from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

function toSpotifyUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  return normalizeSpotifyEmbedUrl(embedUrl).replace("/embed/", "/");
}

function toAppleUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  return normalizeAppleMusicEmbedUrl(embedUrl).replace("embed.music.apple.com", "music.apple.com");
}

function toYouTubeUrl(embedUrl: string | null | undefined): string | null {
  if (!embedUrl) return null;
  const normalized = normalizeYouTubeEmbedUrl(embedUrl);
  const match = normalized.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (!match?.[1]) return null;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function normalizeReleaseType(input: string | null | undefined): "single" | "ep" | "album" {
  const value = String(input ?? "").toLowerCase();
  if (value === "ep" || value === "album") return value;
  return "single";
}

export async function generateStaticParams() {
  const releases = await getMusicCatalogReleases();
  return releases.map((item) => ({ slug: item.slug ?? item.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const release = await getMusicCatalogReleaseBySlug(slug);

  if (!release) {
    return {
      title: "Release | EM Records",
      robots: { index: false, follow: false }
    };
  }

  const artistName = release.artistName || "EM Records Artist";
  return buildReleaseMetadata({
    title: release.title,
    artistName,
    slug: release.slug ?? slug,
    image: normalizeImageUrl(release.coverUrl),
    type: normalizeReleaseType(release.releaseType ?? release.format)
  });
}

export default async function MusicReleasePage({ params }: Props) {
  const lang = await getSiteLanguage();
  const { slug } = await params;
  const release = await getMusicCatalogReleaseBySlug(slug);

  if (!release) {
    notFound();
  }

  const linkedArtist = release.artistSlug ? await getArtistBySlug(release.artistSlug) : null;
  const artistName = linkedArtist?.name ?? release.artistName ?? "EM Records Artist";
  const spotifyEmbed = release.spotifyEmbed ? normalizeSpotifyEmbedUrl(release.spotifyEmbed) : null;
  const appleEmbed = release.appleEmbed ? normalizeAppleMusicEmbedUrl(release.appleEmbed) : null;
  const youtubeEmbed = release.youtubeEmbed ? normalizeYouTubeEmbedUrl(release.youtubeEmbed) : null;
  const spotifyUrl = toSpotifyUrl(release.spotifyEmbed);
  const appleUrl = toAppleUrl(release.appleEmbed);
  const youtubeUrl = toYouTubeUrl(release.youtubeEmbed);
  const now = Date.now();
  const releaseAt = Number.isNaN(+new Date(release.releaseDate)) ? null : +new Date(release.releaseDate);
  const publishAt = release.publishAt && !Number.isNaN(+new Date(release.publishAt)) ? +new Date(release.publishAt) : null;
  const comingSoon = (release.contentStatus ?? "published") === "scheduled" || (releaseAt !== null && releaseAt > now) || (publishAt !== null && publishAt > now);

  const schema = buildReleaseJsonLd({
    title: release.title,
    releaseType: normalizeReleaseType(release.releaseType ?? release.format),
    path: `/music/${release.slug ?? slug}`,
    datePublished: release.releaseDate,
    image: normalizeImageUrl(release.coverUrl),
    artistName,
    artistPath: linkedArtist?.slug ? `/artists/${linkedArtist.slug}` : "/artists",
    sameAs: [spotifyUrl, appleUrl, youtubeUrl]
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(schema) }} />

      <SectionTitle
        eyebrow={lang === "es" ? "Lanzamiento" : "Release"}
        title={release.title}
        description={lang === "es" ? `Escucha ${release.title} y accede a enlaces oficiales.` : `Listen to ${release.title} and access official links.`}
      />

      <article className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10">
            <Image src={normalizeImageUrl(release.coverUrl)} alt={release.title} fill className="object-cover" />
          </div>
          <div>
            <h1 className="font-display text-4xl text-white md:text-5xl">{release.title}</h1>
            <p className="mt-2 text-sm text-white/70">
              {linkedArtist?.slug ? (
                <Link href={`/artists/${linkedArtist.slug}`} className="hover:text-gold">
                  {artistName}
                </Link>
              ) : (
                artistName
              )}
              {release.featuring ? <span className="text-white/55"> feat. {release.featuring}</span> : null}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-gold">
              {lang === "es" ? "Lanzamiento" : "Release"}: {formatDate(release.releaseDate)}
            </p>
            {comingSoon ? (
              <div className="mt-3 inline-flex rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
                {lang === "es" ? "Próximamente" : "Coming soon"}
              </div>
            ) : null}
            <p className="mt-4 text-sm leading-relaxed text-white/75">{release.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {comingSoon && release.preSaveUrl ? (
                <a href={release.preSaveUrl} target="_blank" rel="noreferrer" className="rounded-full border border-gold/70 bg-gold/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold hover:border-gold hover:bg-gold/20">
                  Pre-save
                </a>
              ) : null}
              {spotifyUrl ? (
                <a href={spotifyUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/80 hover:border-gold hover:text-gold">
                  Spotify
                </a>
              ) : null}
              {appleUrl ? (
                <a href={appleUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/80 hover:border-gold hover:text-gold">
                  Apple Music
                </a>
              ) : null}
              {youtubeUrl ? (
                <a href={youtubeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/80 hover:border-gold hover:text-gold">
                  YouTube
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {!comingSoon ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {spotifyEmbed ? <LazyEmbedFrame title="Spotify" src={spotifyEmbed} height={getSpotifyEmbedHeight(spotifyEmbed)} /> : null}
            {appleEmbed ? <LazyEmbedFrame title="Apple Music" src={appleEmbed} height={getAppleMusicEmbedHeight(appleEmbed)} /> : null}
          </div>
        ) : null}
        {!comingSoon && youtubeEmbed ? (
          <div className="mt-4">
            <LazyEmbedFrame title="YouTube Video" src={youtubeEmbed} height={360} />
          </div>
        ) : null}
        {comingSoon && !release.preSaveUrl ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-4 text-sm text-white/65">
            {lang === "es"
              ? "Este lanzamiento estará disponible pronto. El link de pre-save se agregará desde el panel admin."
              : "This release will be available soon. Pre-save link will be added from admin dashboard."}
          </div>
        ) : null}
      </article>

      <InternalLinksBlock
        title={lang === "es" ? "Sigue Explorando" : "Keep Exploring"}
        links={[
          {
            href: "/music",
            label: lang === "es" ? "Más música" : "More music",
            description: lang === "es" ? "Catálogo completo de lanzamientos." : "Full release catalog."
          },
          {
            href: linkedArtist?.slug ? `/artists/${linkedArtist.slug}` : "/artists",
            label: lang === "es" ? "Perfil del artista" : "Artist profile",
            description: lang === "es" ? "Conoce más del artista y su contenido." : "Explore artist profile and content."
          },
          {
            href: "/videos",
            label: lang === "es" ? "Videos oficiales" : "Official videos",
            description: lang === "es" ? "Visualizers y videos del catálogo." : "Visualizers and official catalog videos."
          }
        ]}
      />
    </div>
  );
}
