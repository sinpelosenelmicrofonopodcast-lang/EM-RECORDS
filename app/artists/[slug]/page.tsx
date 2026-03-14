import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtistPhotoRotator } from "@/components/artists/artist-photo-rotator";
import { BookingInquiryModal } from "@/components/artists/booking-inquiry-modal";
import { DiscographyGrid } from "@/components/artists/discography-grid";
import { FanWallSection } from "@/components/artists/fan-wall-section";
import { LazyEmbedFrame } from "@/components/artists/lazy-embed-frame";
import { StickyStreamPlayer } from "@/components/artists/sticky-stream-player";
import { TopTracksList } from "@/components/artists/top-tracks-list";
import { VideosShowcase } from "@/components/artists/videos-showcase";
import { InternalLinksBlock } from "@/components/shared/internal-links-block";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getArtistPhotos, getArtistPublicInsights, getArtistReleases, getFanWallEntriesByArtistSlug, getPublishedArtistBySlug, getPublishedArtists, getUpcomingEvents } from "@/lib/queries";
import { buildArtistMetadata, buildMusicGroupJsonLd, buildPageMetadata } from "@/lib/seo";
import { formatDate, getSpotifyEmbedHeight, normalizeImageUrl, normalizeSoundCloudEmbedUrl, normalizeSpotifyEmbedUrl, normalizeYouTubeEmbedUrl, toJsonLd } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

function firstParagraph(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const split = text.split(/\n\n|\n|\.(\s|$)/).filter(Boolean);
  if (split.length === 0) return text;
  return split[0]!.trim().replace(/\.$/, "") + ".";
}

function fromSpotifyEmbedToUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const embed = normalizeSpotifyEmbedUrl(value);
    const parsed = new URL(embed);
    parsed.pathname = parsed.pathname.replace("/embed/", "/");
    return parsed.toString();
  } catch {
    return value;
  }
}

function fromAppleEmbedToUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "embed.music.apple.com") {
      parsed.hostname = "music.apple.com";
      return parsed.toString();
    }
    return value;
  } catch {
    return value;
  }
}

function fromYouTubeEmbedToUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const embed = normalizeYouTubeEmbedUrl(value);
    const parsed = new URL(embed);
    const id = parsed.pathname.match(/^\/embed\/([^/]+)/)?.[1];
    if (!id) return value;
    return `https://www.youtube.com/watch?v=${id}`;
  } catch {
    return value;
  }
}

function youtubeThumbFromEmbed(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const embed = normalizeYouTubeEmbedUrl(value);
    const id = new URL(embed).pathname.match(/^\/embed\/([^/]+)/)?.[1];
    if (!id) return null;
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  } catch {
    return null;
  }
}

function inferVideoLabel(title: string): string {
  const value = title.toLowerCase();
  if (value.includes("visual")) return "Visualizer";
  if (value.includes("live")) return "Live Performance";
  return "Official Video";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getPublishedArtistBySlug(slug);

  if (!artist) {
    return buildPageMetadata({
      title: "Artista",
      description: "Perfil de artista EM Records.",
      path: `/artists/${slug}`,
      noIndex: true
    });
  }

  return buildArtistMetadata({
    artistName: artist.name,
    artistSlug: slug,
    image: normalizeImageUrl(artist.avatarUrl)
  });
}

export default async function ArtistDetailPage({ params }: Props) {
  const lang = await getSiteLanguage();
  const { slug } = await params;
  const artist = await getPublishedArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  const [events, artistPhotos, artistReleases, insights, allArtists, fanWallEntries] = await Promise.all([
    getUpcomingEvents(),
    getArtistPhotos(artist.id),
    getArtistReleases(artist.slug, artist.name),
    getArtistPublicInsights(artist.id),
    getPublishedArtists(),
    getFanWallEntriesByArtistSlug(artist.slug)
  ]);

  const latestRelease = artistReleases[0] ?? null;
  const latestSpotifyUrl = fromSpotifyEmbedToUrl(latestRelease?.spotifyEmbed) ?? artist.spotifyUrl ?? null;
  const latestAppleUrl = fromAppleEmbedToUrl(latestRelease?.appleEmbed) ?? artist.appleMusicUrl ?? null;
  const latestYouTubeUrl = fromYouTubeEmbedToUrl(latestRelease?.youtubeEmbed) ?? artist.youtubeUrl ?? null;

  const spotifyEmbedSrc = artist.spotifyEmbed
    ? normalizeSpotifyEmbedUrl(artist.spotifyEmbed)
    : latestRelease?.spotifyEmbed
      ? normalizeSpotifyEmbedUrl(latestRelease.spotifyEmbed)
      : null;
  const spotifyEmbedHeight = spotifyEmbedSrc ? getSpotifyEmbedHeight(spotifyEmbedSrc) : 152;
  const soundcloudEmbedSrc = artist.soundcloudEmbed ? normalizeSoundCloudEmbedUrl(artist.soundcloudEmbed) : null;

  const interviewLinks = [artist.interviewUrl1, artist.interviewUrl2].filter((item): item is string => Boolean(item));
  const socialLinks = [
    { label: "Instagram", href: artist.instagramUrl },
    { label: "TikTok", href: artist.tiktokUrl },
    { label: "X", href: artist.xUrl },
    { label: "Facebook", href: artist.facebookUrl },
    { label: "YouTube", href: artist.youtubeUrl },
    { label: "Spotify", href: artist.spotifyUrl }
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));

  const artistSchema = buildMusicGroupJsonLd({
    name: artist.name,
    path: `/artists/${artist.slug}`,
    description: artist.bio,
    image: artist.avatarUrl,
    sameAs: socialLinks.map((item) => item.href),
    genre: artist.genre || "Latin Urban"
  });

  const aboutText = firstParagraph(artist.bioShort || artist.bioMed || artist.bio);
  const fallbackHighlights =
    artist.name.toLowerCase().includes("leoriel") || artist.slug.toLowerCase().includes("leoriel")
      ? [
          "Participó en Icon Viral 2019",
          "Corista del artista urbano Eix",
          "Telonero en El Choli se muda a Medellín 2022",
          "Regresa en 2026 con nueva etapa artística"
        ]
      : [lang === "es" ? "Nueva etapa artística en desarrollo" : "New artistic era in development"];
  const careerHighlights = (insights.highlights.length > 0 ? insights.highlights : fallbackHighlights).slice(0, 4);

  const topTrackTitles = (insights.featuredTracks.length > 0 ? insights.featuredTracks : artistReleases.map((item) => item.title)).slice(0, 3);
  const topTracks = topTrackTitles.map((title, index) => {
    const release = artistReleases.find((item) => item.title.toLowerCase() === title.toLowerCase()) ?? artistReleases[index] ?? latestRelease;

    return {
      id: release?.id ?? `${title}-${index}`,
      title,
      artistName: artist.name,
      links: {
        spotify: fromSpotifyEmbedToUrl(release?.spotifyEmbed) ?? artist.spotifyUrl ?? null,
        apple: fromAppleEmbedToUrl(release?.appleEmbed) ?? artist.appleMusicUrl ?? null,
        youtube: fromYouTubeEmbedToUrl(release?.youtubeEmbed) ?? artist.youtubeUrl ?? null
      }
    };
  });

  const asSeenWith =
    artist.name.toLowerCase().includes("leoriel") || artist.slug.toLowerCase().includes("leoriel")
      ? ["EIX", "ICON VIRAL", "EL CHOLI SE MUDA A MEDELLÍN"]
      : careerHighlights.slice(0, 3).map((item) => item.toUpperCase());

  const followersValue = insights.stats.followers ?? `${Math.max(socialLinks.length, 1)} Platforms`;
  const monthlyListenersValue = insights.stats.monthlyListeners ?? "Coming soon";
  const streamsValue = insights.stats.streams ?? "Growing";

  const videoEntries = artistReleases
    .filter((item) => Boolean(item.youtubeEmbed))
    .map((item) => ({
      id: item.id,
      title: item.videoTitle || item.title,
      embed: normalizeYouTubeEmbedUrl(item.youtubeEmbed || ""),
      href: fromYouTubeEmbedToUrl(item.youtubeEmbed),
      label: inferVideoLabel(item.videoTitle || item.title),
      thumbnail: normalizeImageUrl(item.videoThumbnailUrl || youtubeThumbFromEmbed(item.youtubeEmbed) || item.coverUrl),
      featured: Boolean(item.videoFeatured)
    }));

  if (videoEntries.length === 0 && artist.musicVideoEmbed) {
    videoEntries.push({
      id: "artist-main-video",
      title: `${artist.name} Official Video`,
      embed: normalizeYouTubeEmbedUrl(artist.musicVideoEmbed),
      href: fromYouTubeEmbedToUrl(artist.musicVideoEmbed),
      label: "Official Video",
      thumbnail: normalizeImageUrl(youtubeThumbFromEmbed(artist.musicVideoEmbed) || artist.avatarUrl),
      featured: true
    });
  }

  const discoverArtists = allArtists.filter((item) => item.slug !== artist.slug).slice(0, 3);

  const fanWall = fanWallEntries;

  const discographyItems = artistReleases.slice(0, 12).map((release) => ({
    id: release.id,
    title: release.title,
    year: String(new Date(release.releaseDate).getFullYear()),
    coverUrl: release.coverUrl,
    artistSlug: artist.slug,
    links: {
      spotify: fromSpotifyEmbedToUrl(release.spotifyEmbed) ?? null,
      apple: fromAppleEmbedToUrl(release.appleEmbed) ?? null,
      youtube: fromYouTubeEmbedToUrl(release.youtubeEmbed) ?? null
    }
  }));

  const pressKitHref = `/api/artists/${artist.slug}/press-kit?kind=press`;
  const mediaKitHref = `/api/artists/${artist.slug}/press-kit?kind=media`;

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(artistSchema) }} />

      <section id="artist-hero" className="relative border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(198,168,91,.26),transparent_45%),radial-gradient(circle_at_80%_28%,rgba(255,255,255,.08),transparent_40%)]" />
        <div className="mx-auto grid min-h-[72vh] w-full max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_.8fr] md:items-center md:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-gold">Official Artist Page</p>
            <h1 className="mt-4 font-display text-5xl text-white md:text-7xl">{artist.name}</h1>
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/60">{(insights.stats.topMarket || "Puerto Rico") + " • Latin Urban"}</p>

            {latestRelease ? (
              <div className="mt-8 max-w-2xl rounded-2xl border border-white/10 bg-black/55 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-gold">Latest Release</p>
                <p className="mt-2 text-3xl font-semibold text-white">{latestRelease.title}</p>
                <p className="mt-1 text-sm text-white/65">{lang === "es" ? "Lanzamiento" : "Release"}: {formatDate(latestRelease.releaseDate)}</p>

                <a
                  href={latestSpotifyUrl ?? latestAppleUrl ?? latestYouTubeUrl ?? "https://open.spotify.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-gold mt-5 inline-flex rounded-full border border-gold bg-gold px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black"
                >
                  ▶ Listen Now
                </a>
                <p className="mt-3 text-xs text-white/55">Stream the latest release on your favorite platform.</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {latestSpotifyUrl ? (
                    <a href={latestSpotifyUrl} target="_blank" rel="noreferrer" className="focus-gold rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      Spotify
                    </a>
                  ) : null}
                  {latestAppleUrl ? (
                    <a href={latestAppleUrl} target="_blank" rel="noreferrer" className="focus-gold rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      Apple
                    </a>
                  ) : null}
                  {latestYouTubeUrl ? (
                    <a href={latestYouTubeUrl} target="_blank" rel="noreferrer" className="focus-gold rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      YouTube
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/10">
              <Image src={normalizeImageUrl(artist.heroMediaUrl)} alt={artist.name} fill className="object-cover" priority />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Monthly listeners", value: monthlyListenersValue },
                { label: "Followers", value: followersValue },
                { label: "Streams", value: streamsValue }
              ].map((stat) => (
                <article key={stat.label} className="rounded-xl border border-white/10 bg-black/55 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">{stat.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{stat.value}</p>
                </article>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                `${[artist.spotifyUrl, artist.appleMusicUrl, artist.youtubeUrl].filter(Boolean).length} Platforms`,
                `${[artist.pressKitUrl, artist.mediaKitUrl].filter(Boolean).length} Press Asset`,
                `${interviewLinks.length} Interview`
              ].map((item) => (
                <p key={item} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-center text-xs uppercase tracking-[0.16em] text-gold">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          <TopTracksList tracks={topTracks} defaultPlatform={artist.platformPreference ?? "spotify"} />

          <article id="latest-release" className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Latest Release</p>
            {latestRelease ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-white/10">
                  <Image src={normalizeImageUrl(latestRelease.coverUrl)} alt={latestRelease.title} fill className="object-cover" />
                </div>
                <div>
                  <h2 className="text-3xl font-semibold text-white">{latestRelease.title}</h2>
                  <p className="mt-1 text-sm text-white/65">{latestRelease.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(latestRelease.releaseDate)}</p>
                  <a
                    href={latestSpotifyUrl ?? latestAppleUrl ?? latestYouTubeUrl ?? "https://open.spotify.com"}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-gold mt-3 inline-flex rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.16em] text-gold"
                  >
                    Play
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/60">No release available yet.</p>
            )}
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-8 md:px-10">
        <SectionTitle eyebrow="Streaming" title="Streaming Player" description={lang === "es" ? "Escucha el sonido oficial de EM Records." : "Listen to the official EM Records sound."} />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {spotifyEmbedSrc ? <LazyEmbedFrame title="Spotify" src={spotifyEmbedSrc} height={spotifyEmbedHeight} /> : null}
          {soundcloudEmbedSrc ? <LazyEmbedFrame title="SoundCloud" src={soundcloudEmbedSrc} height={220} /> : null}
          {!spotifyEmbedSrc && !soundcloudEmbedSrc ? <p className="text-sm text-white/60">No player configured yet.</p> : null}
        </div>
        <InternalLinksBlock
          title={lang === "es" ? "Explora Más" : "Explore More"}
          links={[
            {
              href: "/music",
              label: lang === "es" ? "Música" : "Music",
              description: lang === "es" ? "Catálogo oficial de lanzamientos EM Records." : "Official EM Records release catalog."
            },
            {
              href: "/videos",
              label: lang === "es" ? "Videos" : "Videos",
              description: lang === "es" ? "Mira videoclips y visualizers oficiales." : "Watch official videos and visualizers."
            },
            {
              href: "/press",
              label: lang === "es" ? "Prensa" : "Press",
              description: lang === "es" ? "Noticias y cobertura editorial del sello." : "News and editorial coverage."
            }
          ]}
        />
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10">
        <SectionTitle
          eyebrow={lang === "es" ? "Discografía" : "Discography"}
          title={lang === "es" ? "Catálogo de Lanzamientos" : "Release Catalog"}
          description={lang === "es" ? "Catálogo oficial de música." : "Official music catalog."}
        />
        <DiscographyGrid items={discographyItems} />
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10">
        <SectionTitle eyebrow="Videos" title={lang === "es" ? "Videos Oficiales" : "Official Videos"} description={lang === "es" ? "Featured video y catálogo visual." : "Featured video and visual catalog."} />
        <VideosShowcase items={videoEntries} />
      </section>

      {artistPhotos.length > 0 ? <ArtistPhotoRotator artistSlug={artist.slug} photos={artistPhotos} /> : null}

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-14 md:grid-cols-2 md:px-10">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">About {artist.name}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/75">{aboutText || artist.bio}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Career Highlights</p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {careerHighlights.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {asSeenWith.map((item) => (
                <span key={item} className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/80">
                  {item}
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
        <SectionTitle
          eyebrow={lang === "es" ? "Fechas de Tour" : "Tour Dates"}
          title={lang === "es" ? "Próximas Presentaciones" : "Upcoming Performances"}
          description={lang === "es" ? "Próximas fechas y apariciones especiales." : "Upcoming dates and special appearances."}
        />

        {events.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="text-sm text-white/70">No upcoming shows yet.</p>
            <BookingInquiryModal artistSlug={artist.slug} artistName={artist.name} bookingEmail={artist.bookingEmail} />
          </div>
        ) : (
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
            <BookingInquiryModal artistSlug={artist.slug} artistName={artist.name} bookingEmail={artist.bookingEmail} />
          </div>
        )}
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-14 md:grid-cols-3 md:px-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Press Kit</p>
          <div className="mt-4 space-y-1 text-sm text-white/70">
            <p>✔ Bio</p>
            <p>✔ High resolution photos</p>
            <p>✔ Logos</p>
            <p>✔ Stage rider</p>
            <p>✔ Booking info</p>
            <p>✔ Press release</p>
          </div>
          {artist.pressKitUrl ? (
            <a href={pressKitHref} className="focus-gold mt-5 inline-block text-sm text-gold underline underline-offset-4" target="_blank" rel="noreferrer">
              Download Press Kit
            </a>
          ) : null}
          {artist.pressKitUpdatedAt ? <p className="mt-2 text-xs text-white/45">Last updated {formatDate(artist.pressKitUpdatedAt)}</p> : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Book {artist.name}</p>
          <div className="mt-4 space-y-1 text-sm text-white/70">
            <p>Festivals</p>
            <p>Clubs</p>
            <p>Private events</p>
            <p>Brand partnerships</p>
          </div>
          <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/50">EM Records</p>
          <a href={`mailto:${artist.bookingEmail}`} className="focus-gold mt-2 inline-block text-sm text-gold underline underline-offset-4">
            {artist.bookingEmail}
          </a>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Media Kit</p>
          <p className="mt-3 text-sm text-white/70">Logos, photo selections and approved brand usage.</p>
          {artist.mediaKitUrl ? (
            <a href={mediaKitHref} target="_blank" rel="noreferrer" className="focus-gold mt-5 inline-block text-sm text-gold underline underline-offset-4">
              Download Media Kit
            </a>
          ) : (
            <Link href="/press" className="focus-gold mt-5 inline-block text-sm text-gold underline underline-offset-4">
              View Press
            </Link>
          )}
          {artist.mediaKitUpdatedAt ? <p className="mt-2 text-xs text-white/45">Last updated {formatDate(artist.mediaKitUpdatedAt)}</p> : null}
        </div>
      </section>

      <FanWallSection artistSlug={artist.slug} entries={fanWall} />

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
        <SectionTitle
          eyebrow={lang === "es" ? "Discover More" : "Discover More"}
          title={lang === "es" ? "Discover More EM Artists" : "Discover More EM Artists"}
          description={lang === "es" ? "Explora talento del roster EM Records." : "Explore talent from the EM Records roster."}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {discoverArtists.map((item) => (
            <Link key={item.id} href={`/artists/${item.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-gold/40">
              <div className="relative aspect-[4/5]">
                <Image src={normalizeImageUrl(item.avatarUrl)} alt={item.name} fill className="object-cover transition duration-200 ease-in-out group-hover:scale-[1.02]" />
              </div>
              <div className="p-4">
                <p className="text-xl font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-sm text-white/65">{item.tagline}</p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-gold">View Artist</p>
              </div>
            </Link>
          ))}
          {discoverArtists.length === 0 ? <p className="text-sm text-white/60">More artists coming soon.</p> : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-24 md:px-10">
        <div className="rounded-3xl border border-gold/30 bg-[linear-gradient(135deg,rgba(198,168,91,.12),rgba(0,0,0,.75))] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Join The Movement</p>
          <h2 className="mt-3 font-display text-4xl text-white">Follow {artist.name}</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {socialLinks.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="focus-gold rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:border-gold hover:text-gold">
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <StickyStreamPlayer
        artistName={artist.name}
        trackName={latestRelease?.title ?? "Latest Release"}
        links={{
          spotify: latestSpotifyUrl,
          apple: latestAppleUrl,
          youtube: latestYouTubeUrl
        }}
        defaultPlatform={artist.platformPreference ?? "spotify"}
      />
    </div>
  );
}
