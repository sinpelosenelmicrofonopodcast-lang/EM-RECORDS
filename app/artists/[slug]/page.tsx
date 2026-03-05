import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtistPhotoRotator } from "@/components/artists/artist-photo-rotator";
import { StickyStreamPlayer } from "@/components/artists/sticky-stream-player";
import { SectionTitle } from "@/components/shared/section-title";
import { submitFanWallEntryAction } from "@/lib/actions/site";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getArtistBySlug, getArtistPhotos, getArtistPublicInsights, getArtistReleases, getArtists, getFanWallEntriesByArtistSlug, getUpcomingEvents } from "@/lib/queries";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl, formatDate, getSpotifyEmbedHeight, normalizeImageUrl, normalizeSoundCloudEmbedUrl, normalizeSpotifyEmbedUrl, normalizeYouTubeEmbedUrl, toJsonLd } from "@/lib/utils";

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

function inferVideoLabel(title: string): string {
  const value = title.toLowerCase();
  if (value.includes("visual")) return "Visualizer";
  if (value.includes("live")) return "Live Performance";
  return "Official Video";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    return buildPageMetadata({
      title: "Artista",
      description: "Perfil de artista EM Records.",
      path: `/artists/${slug}`,
      noIndex: true
    });
  }

  return buildPageMetadata({
    title: `${artist.name} | Official Artist Page | EM Records`,
    description: `Discover ${artist.name}, Puerto Rican urban artist under EM Records. Watch music videos, stream latest releases and book shows.`,
    path: `/artists/${slug}`,
    type: "profile",
    image: normalizeImageUrl(artist.avatarUrl),
    keywords: [artist.name, "official artist page", "EM Records", "latin urban"]
  });
}

export default async function ArtistDetailPage({ params }: Props) {
  const lang = await getSiteLanguage();
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  const [events, artistPhotos, artistReleases, insights, allArtists, fanWallEntries] = await Promise.all([
    getUpcomingEvents(),
    getArtistPhotos(artist.id),
    getArtistReleases(artist.slug, artist.name),
    getArtistPublicInsights(artist.id),
    getArtists(),
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

  const artistSchema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    url: absoluteUrl(`/artists/${artist.slug}`),
    description: artist.bio,
    image: /^https?:\/\//i.test(artist.avatarUrl) ? artist.avatarUrl : absoluteUrl(artist.avatarUrl),
    sameAs: socialLinks.map((item) => item.href),
    genre: "Latin Urban"
  };

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

  const topTracks = (insights.featuredTracks.length > 0 ? insights.featuredTracks : artistReleases.map((item) => item.title)).slice(0, 3);
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
      title: item.title,
      embed: normalizeYouTubeEmbedUrl(item.youtubeEmbed || ""),
      href: fromYouTubeEmbedToUrl(item.youtubeEmbed),
      label: inferVideoLabel(item.title)
    }))
    .slice(0, 3);

  if (videoEntries.length === 0 && artist.musicVideoEmbed) {
    videoEntries.push({
      id: "artist-main-video",
      title: artist.name,
      embed: normalizeYouTubeEmbedUrl(artist.musicVideoEmbed),
      href: fromYouTubeEmbedToUrl(artist.musicVideoEmbed),
      label: "Official Video"
    });
  }

  const discoverArtists = allArtists.filter((item) => item.slug !== artist.slug).slice(0, 3);

  const fanWallFallback =
    lang === "es"
      ? [
          { fanName: "Fan 1", message: "Leoriel está duro" },
          { fanName: "Fan 2", message: "Killeen está contigo" },
          { fanName: "Fan 3", message: "Puerto Rico represent" }
        ]
      : [
          { fanName: "Fan 1", message: "Leoriel is next" },
          { fanName: "Fan 2", message: "Killeen stands with you" },
          { fanName: "Fan 3", message: "Puerto Rico represent" }
        ];

  const fanWall = fanWallEntries.length > 0 ? fanWallEntries.map((item) => ({ fanName: item.fanName, message: item.message })) : fanWallFallback;

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(artistSchema) }} />

      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(198,168,91,.26),transparent_45%),radial-gradient(circle_at_80%_28%,rgba(255,255,255,.08),transparent_40%)]" />
        <div className="mx-auto grid min-h-[70vh] w-full max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_.8fr] md:items-center md:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-gold">Official Artist Page</p>
            <h1 className="mt-4 font-display text-5xl text-white md:text-7xl">{artist.name}</h1>
            <p className="mt-4 text-sm uppercase tracking-[0.18em] text-white/60">{(insights.stats.topMarket || "Puerto Rico") + " • Latin Urban"}</p>

            {latestRelease ? (
              <div className="mt-8 max-w-2xl rounded-2xl border border-white/10 bg-black/50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-gold">Latest Release</p>
                <p className="mt-2 text-3xl font-semibold text-white">{latestRelease.title}</p>
                <p className="mt-1 text-sm text-white/65">{lang === "es" ? "Lanzamiento" : "Release"}: {formatDate(latestRelease.releaseDate)}</p>
                <div className="mt-5">
                  <a
                    href={latestSpotifyUrl ?? "https://open.spotify.com"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    ▶ Listen Now
                  </a>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {latestSpotifyUrl ? (
                    <a href={latestSpotifyUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      Spotify
                    </a>
                  ) : null}
                  {latestAppleUrl ? (
                    <a href={latestAppleUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      Apple
                    </a>
                  ) : null}
                  {latestYouTubeUrl ? (
                    <a href={latestYouTubeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      YouTube
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[430px] overflow-hidden rounded-3xl border border-white/10">
              <Image src={normalizeImageUrl(artist.heroMediaUrl)} alt={artist.name} fill className="object-cover" />
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

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-14 md:grid-cols-2 md:px-10">
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
        </article>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6 md:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Top Tracks</p>
            {topTracks.length > 0 ? (
              <ol className="mt-4 space-y-3 text-white">
                {topTracks.map((track, index) => (
                  <li key={`${track}-${index}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                    <span className="text-sm">
                      {index + 1}. {track}
                    </span>
                    <span className="text-xs uppercase tracking-[0.16em] text-gold">Track</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-white/60">{lang === "es" ? "Próximamente." : "Coming soon."}</p>
            )}
          </article>

          <article id="latest-release" className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Latest Release</p>
            {latestRelease ? (
              <>
                <h2 className="mt-3 text-3xl font-semibold text-white">{latestRelease.title}</h2>
                <p className="mt-1 text-sm text-white/65">{latestRelease.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {latestSpotifyUrl ? (
                    <a href={latestSpotifyUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      Play Spotify
                    </a>
                  ) : null}
                  {latestAppleUrl ? (
                    <a href={latestAppleUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      Play Apple
                    </a>
                  ) : null}
                  {latestYouTubeUrl ? (
                    <a href={latestYouTubeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 hover:border-gold hover:text-gold">
                      Play YouTube
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-white/60">{lang === "es" ? "No release disponible todavía." : "No release available yet."}</p>
            )}
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
        <SectionTitle
          eyebrow={lang === "es" ? "Discografía" : "Discography"}
          title={lang === "es" ? "Catálogo de Lanzamientos" : "Release Catalog"}
          description={lang === "es" ? "Singles y lanzamientos recientes con arte oficial." : "Singles and latest releases with official artwork."}
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artistReleases.slice(0, 6).map((release) => (
            <article key={release.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="relative aspect-square">
                <Image src={normalizeImageUrl(release.coverUrl)} alt={release.title} fill className="object-cover" />
              </div>
              <div className="p-4">
                <p className="text-xl font-semibold text-white">{release.title}</p>
                <p className="mt-1 text-sm text-white/60">{new Date(release.releaseDate).getFullYear()}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
        <SectionTitle eyebrow="Videos" title={lang === "es" ? "Videos Oficiales" : "Official Videos"} description={lang === "es" ? "Visualizer, official video y performances." : "Visualizer, official video and performances."} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {videoEntries.map((video) => (
            <article key={video.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              <iframe
                src={video.embed}
                width="100%"
                height="190"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                className="rounded-xl border border-white/10"
              />
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gold">{video.label}</p>
              <p className="mt-1 text-sm text-white/80">{video.title}</p>
            </article>
          ))}
          {videoEntries.length === 0 ? <p className="text-sm text-white/60">{lang === "es" ? "No hay videos publicados aún." : "No videos published yet."}</p> : null}
        </div>
      </section>

      {artistPhotos.length > 0 ? (
        <section className="pt-8">
          <SectionTitle
            eyebrow={lang === "es" ? "Media Gallery" : "Media Gallery"}
            title={lang === "es" ? "Live performances, studio sessions & press photos" : "Live performances, studio sessions & press photos"}
            description={lang === "es" ? "Galería rotativa automática cada 5 segundos." : "Auto-rotating gallery every 5 seconds."}
          />
          <ArtistPhotoRotator artistSlug={artist.slug} photos={artistPhotos} />
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
        <SectionTitle eyebrow="Streaming" title={lang === "es" ? "Streaming Players" : "Streaming Players"} description={lang === "es" ? "Escucha en vivo desde las plataformas principales." : "Listen live from the main platforms."} />

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
            <iframe src={soundcloudEmbedSrc} width="100%" height="352" allow="autoplay" className="rounded-2xl border border-white/10" />
          ) : null}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
          <p className="text-xs uppercase tracking-[0.24em] text-gold">As Seen With</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {asSeenWith.map((item) => (
              <span key={item} className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/80">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Fan Wall</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {fanWall.map((quote, index) => (
            <article key={`${quote.fanName}-${index}`} className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-sm text-white/80">“{quote.message}”</p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-gold">{quote.fanName}</p>
            </article>
          ))}
        </div>

        <form action={submitFanWallEntryAction} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:grid-cols-3">
          <input type="hidden" name="artistSlug" value={artist.slug} />
          <input name="fanName" placeholder={lang === "es" ? "Tu nombre" : "Your name"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="message" placeholder={lang === "es" ? "Tu mensaje" : "Your message"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <button type="submit" className="rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.18em] text-gold md:col-span-3 md:justify-self-start">
            {lang === "es" ? "Enviar al Fan Wall" : "Submit to Fan Wall"}
          </button>
          <p className="text-xs text-white/55 md:col-span-3">{lang === "es" ? "Todas las publicaciones pasan por moderación del admin." : "All posts are moderated by admin."}</p>
        </form>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
          <SectionTitle
            eyebrow={lang === "es" ? "Fechas de Tour" : "Tour Dates"}
            title={lang === "es" ? "Próximas Presentaciones" : "Upcoming Performances"}
            description={lang === "es" ? "Booking y routing gestionado desde admin." : "Booking and routing managed from admin."}
          />

          {events.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="text-sm text-white/70">{lang === "es" ? "No upcoming shows yet." : "No upcoming shows yet."}</p>
              <a href={`mailto:${artist.bookingEmail}`} className="mt-4 inline-block rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.18em] text-gold">
                {`BOOK ${artist.name.toUpperCase()}`}
              </a>
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
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-20 md:grid-cols-3 md:px-10">
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
            <a href={artist.pressKitUrl} className="mt-5 inline-block text-sm text-gold underline underline-offset-4" target="_blank" rel="noreferrer">
              {lang === "es" ? "Descargar Press Kit" : "Download Press Kit"}
            </a>
          ) : null}
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
          <a href={`mailto:${artist.bookingEmail}`} className="mt-2 inline-block text-sm text-gold underline underline-offset-4">
            {artist.bookingEmail}
          </a>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Media Kit</p>
          <p className="mt-3 text-sm text-white/70">
            {lang === "es" ? "Logos, selección de fotos y usos de marca aprobados." : "Logos, photo selections and approved brand usage."}
          </p>
          {artist.mediaKitUrl ? (
            <a href={artist.mediaKitUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm text-gold underline underline-offset-4">
              {lang === "es" ? "Descargar Media Kit" : "Download Media Kit"}
            </a>
          ) : (
            <Link href="/news" className="mt-5 inline-block text-sm text-gold underline underline-offset-4">
              {lang === "es" ? "Ver Prensa" : "View Press"}
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
        <SectionTitle
          eyebrow={lang === "es" ? "Discover More" : "Discover More"}
          title={lang === "es" ? "Discover More EM Artists" : "Discover More EM Artists"}
          description={lang === "es" ? "Explora talento del roster EM Records." : "Explore talent from the EM Records roster."}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {discoverArtists.map((item) => (
            <Link key={item.id} href={`/artists/${item.slug}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              <div className="relative aspect-[4/5]">
                <Image src={normalizeImageUrl(item.avatarUrl)} alt={item.name} fill className="object-cover" />
              </div>
              <div className="p-4">
                <p className="text-xl font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-sm text-white/65">{item.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-24 md:px-10">
        <div className="rounded-3xl border border-gold/30 bg-[linear-gradient(135deg,rgba(198,168,91,.12),rgba(0,0,0,.75))] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Join The Movement</p>
          <h2 className="mt-3 font-display text-4xl text-white">Follow {artist.name}</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {socialLinks.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80 hover:border-gold hover:text-gold">
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {spotifyEmbedSrc ? <StickyStreamPlayer spotifyEmbedSrc={spotifyEmbedSrc} title={`${artist.name} - Spotify`} /> : null}
    </div>
  );
}
