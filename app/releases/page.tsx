import type { Metadata } from "next";
import Image from "next/image";
import { SectionTitle } from "@/components/shared/section-title";
import { getReleases } from "@/lib/queries";
import {
  formatDate,
  getAppleMusicEmbedHeight,
  getSpotifyEmbedHeight,
  normalizeAppleMusicEmbedUrl,
  normalizeImageUrl,
  normalizeSpotifyEmbedUrl,
  normalizeYouTubeEmbedUrl
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "Releases",
  description: "Official EM Records discography and featured drops."
};

export default async function ReleasesPage() {
  const releases = await getReleases();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="Discography"
        title="Latest Releases"
        description="Singles, EPs and albums across the EM catalog."
      />

      <div className="mt-10 grid gap-8">
        {releases.map((release) => {
          const spotifyEmbedSrc = release.spotifyEmbed ? normalizeSpotifyEmbedUrl(release.spotifyEmbed) : null;
          const appleEmbedSrc = release.appleEmbed ? normalizeAppleMusicEmbedUrl(release.appleEmbed) : null;
          const youtubeEmbedSrc = release.youtubeEmbed ? normalizeYouTubeEmbedUrl(release.youtubeEmbed) : null;
          const spotifyHeight = spotifyEmbedSrc ? getSpotifyEmbedHeight(spotifyEmbedSrc) : 152;
          const appleHeight = appleEmbedSrc ? getAppleMusicEmbedHeight(appleEmbedSrc) : 450;

          return (
            <article key={release.id} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:grid md:grid-cols-[300px_1fr] md:gap-8">
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <Image src={normalizeImageUrl(release.coverUrl)} alt={release.title} fill className="object-cover" />
              </div>
              <div className="mt-6 md:mt-0">
                <p className="text-xs uppercase tracking-[0.22em] text-gold">
                  {release.format} {release.featured ? "· Featured" : ""}
                </p>
                <h2 className="mt-3 font-display text-4xl text-white">{release.title}</h2>
                <p className="mt-2 text-sm text-white/65">{release.description}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(release.releaseDate)}</p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {spotifyEmbedSrc ? (
                    <iframe
                      src={spotifyEmbedSrc}
                      width="100%"
                      height={String(spotifyHeight)}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-xl border border-white/15"
                    />
                  ) : null}
                  {appleEmbedSrc ? (
                    <iframe
                      src={appleEmbedSrc}
                      width="100%"
                      height={String(appleHeight)}
                      allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                      className="rounded-xl border border-white/15"
                    />
                  ) : null}
                </div>
              </div>
              {youtubeEmbedSrc ? (
                <div className="mt-6 md:col-span-2">
                  <iframe
                    src={youtubeEmbedSrc}
                    width="100%"
                    height="420"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    className="w-full rounded-xl border border-white/15"
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
