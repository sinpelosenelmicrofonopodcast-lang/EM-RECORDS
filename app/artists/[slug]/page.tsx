import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/shared/button";
import { SectionTitle } from "@/components/shared/section-title";
import { getArtistBySlug, getUpcomingEvents } from "@/lib/queries";
import { formatDate, getSpotifyEmbedHeight, normalizeImageUrl, normalizeSoundCloudEmbedUrl, normalizeSpotifyEmbedUrl, normalizeYouTubeEmbedUrl } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    return { title: "Artist" };
  }

  return {
    title: artist.name,
    description: artist.tagline
  };
}

export default async function ArtistDetailPage({ params }: Props) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  const events = await getUpcomingEvents();
  const spotifyEmbedSrc = artist.spotifyEmbed ? normalizeSpotifyEmbedUrl(artist.spotifyEmbed) : null;
  const spotifyEmbedHeight = spotifyEmbedSrc ? getSpotifyEmbedHeight(spotifyEmbedSrc) : 152;
  const soundcloudEmbedSrc = artist.soundcloudEmbed ? normalizeSoundCloudEmbedUrl(artist.soundcloudEmbed) : null;
  const musicVideoSrc = artist.musicVideoEmbed
    ? normalizeYouTubeEmbedUrl(artist.musicVideoEmbed)
    : artist.youtubeUrl
      ? normalizeYouTubeEmbedUrl(artist.youtubeUrl)
      : null;
  const interviewLinks = [artist.interviewUrl1, artist.interviewUrl2].filter((item): item is string => Boolean(item));
  const socialLinks = [
    { label: "Instagram", href: artist.instagramUrl },
    { label: "TikTok", href: artist.tiktokUrl },
    { label: "X", href: artist.xUrl },
    { label: "Facebook", href: artist.facebookUrl }
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));

  return (
    <div>
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gold/20 via-transparent to-transparent" />
        <div className="mx-auto grid min-h-[65vh] w-full max-w-7xl gap-10 px-6 py-20 md:grid-cols-2 md:items-end md:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">EM Artist</p>
            <h1 className="mt-4 font-display text-5xl text-white md:text-7xl">{artist.name}</h1>
            <p className="mt-4 text-base text-white/75">{artist.tagline}</p>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/65">{artist.bio}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={artist.spotifyUrl ?? "https://open.spotify.com"}>Spotify</ButtonLink>
              <ButtonLink href={artist.appleMusicUrl ?? "https://music.apple.com"} variant="ghost">
                Apple Music
              </ButtonLink>
              <ButtonLink href={artist.youtubeUrl ?? "https://youtube.com"} variant="ghost">
                YouTube
              </ButtonLink>
              {artist.epkEnabled ? (
                <ButtonLink href={`/epk/${artist.slug}`} variant="ghost">
                  Private EPK
                </ButtonLink>
              ) : null}
            </div>

            {socialLinks.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 hover:border-gold hover:text-gold"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/45">No social links configured yet.</p>
            )}
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-3xl border border-white/10">
            <Image src={normalizeImageUrl(artist.heroMediaUrl)} alt={artist.name} fill className="object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
        <SectionTitle
          eyebrow="Discography"
          title="Streaming & Music Videos"
          description="Editable from admin dashboard with Spotify embed, SoundCloud, music video and interview links."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {spotifyEmbedSrc ? (
            <iframe
              src={spotifyEmbedSrc}
              width="100%"
              height={String(spotifyEmbedHeight)}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="rounded-2xl border border-white/10"
            />
          ) : null}
          {soundcloudEmbedSrc ? (
            <iframe
              src={soundcloudEmbedSrc}
              width="100%"
              height="352"
              allow="autoplay"
              className="rounded-2xl border border-white/10"
            />
          ) : null}
          {musicVideoSrc ? (
            <iframe
              src={musicVideoSrc}
              width="100%"
              height="352"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="rounded-2xl border border-white/10 md:col-span-2"
            />
          ) : null}
        </div>

        {interviewLinks.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Interviews</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {interviewLinks.map((link, index) => (
                <a
                  key={`${link}-${index}`}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/75 hover:border-gold hover:text-gold"
                >
                  Press Link {index + 1}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {!spotifyEmbedSrc && !soundcloudEmbedSrc && !musicVideoSrc ? (
          <p className="mt-5 text-sm text-white/55">No streaming embeds configured yet. Add them in Admin &gt; Artists.</p>
        ) : null}
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
          <SectionTitle
            eyebrow="Tour Dates"
            title="Upcoming Performances"
            description="Booking and routing managed from admin."
          />

          <div className="mt-8 grid gap-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 bg-black/70 p-4 md:flex md:items-center md:justify-between">
                <div>
                  <p className="text-lg text-white">{event.title}</p>
                  <p className="text-sm text-white/65">
                    {event.venue} · {event.city}, {event.country}
                  </p>
                </div>
                <p className="mt-2 text-sm text-white/65 md:mt-0">{formatDate(event.startsAt)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-20 md:grid-cols-3 md:px-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Press Kit</p>
          <p className="mt-3 text-sm text-white/70">Download official assets, bio and technical rider.</p>
          {artist.pressKitUrl ? (
            <a href={artist.pressKitUrl} className="mt-5 inline-block text-sm text-gold underline underline-offset-4" target="_blank" rel="noreferrer">
              Download Kit
            </a>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Booking Contact</p>
          <p className="mt-3 text-sm text-white/70">For festivals, clubs and branded partnerships.</p>
          <a href={`mailto:${artist.bookingEmail}`} className="mt-5 inline-block text-sm text-gold underline underline-offset-4">
            {artist.bookingEmail}
          </a>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Media Kit</p>
          <p className="mt-3 text-sm text-white/70">Logos, photo selections and approved brand usage.</p>
          {artist.mediaKitUrl ? (
            <a href={artist.mediaKitUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm text-gold underline underline-offset-4">
              Download Media Kit
            </a>
          ) : (
            <Link href="/news" className="mt-5 inline-block text-sm text-gold underline underline-offset-4">
              View Press
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
