import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { ReleaseCountdown } from "@/components/home/release-countdown";
import { ButtonLink } from "@/components/shared/button";
import { SectionTitle } from "@/components/shared/section-title";
import { subscribeNewsletterAction } from "@/lib/actions/site";
import { getArtists, getCountdownRelease, getFeaturedRelease, getGallery, getNews, getUpcomingEvents } from "@/lib/queries";
import {
  formatDate,
  getAppleMusicEmbedHeight,
  getSpotifyEmbedHeight,
  normalizeAppleMusicEmbedUrl,
  normalizeImageUrl,
  normalizeSpotifyEmbedUrl,
  normalizeYouTubeEmbedUrl
} from "@/lib/utils";

export default async function Home() {
  const [featuredRelease, artists, events, news, gallery, countdownRelease] = await Promise.all([
    getFeaturedRelease(),
    getArtists(),
    getUpcomingEvents(),
    getNews(),
    getGallery(),
    getCountdownRelease()
  ]);
  const featuredSpotifyEmbed = featuredRelease?.spotifyEmbed ? normalizeSpotifyEmbedUrl(featuredRelease.spotifyEmbed) : null;
  const featuredAppleEmbed = featuredRelease?.appleEmbed ? normalizeAppleMusicEmbedUrl(featuredRelease.appleEmbed) : null;
  const featuredYoutubeEmbed = featuredRelease?.youtubeEmbed ? normalizeYouTubeEmbedUrl(featuredRelease.youtubeEmbed) : null;
  const featuredSpotifyHeight = featuredSpotifyEmbed ? getSpotifyEmbedHeight(featuredSpotifyEmbed) : 152;
  const featuredAppleHeight = featuredAppleEmbed ? getAppleMusicEmbedHeight(featuredAppleEmbed) : 450;

  return (
    <div>
      <Hero />

      <section id="latest-release" className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <SectionTitle
            eyebrow="Latest Release"
            title={featuredRelease ? featuredRelease.title : "Next drop loading"}
            description={
              featuredRelease
                ? featuredRelease.description
                : "Configure releases in admin dashboard to publish the featured drop here."
            }
          />

          {countdownRelease ? <ReleaseCountdown releaseDate={countdownRelease.releaseDate} title={countdownRelease.title} /> : null}
        </div>

        {featuredRelease ? (
          <div className="mt-10 grid gap-8 rounded-3xl border border-white/10 bg-white/[0.02] p-5 md:grid-cols-[360px_1fr] md:p-8">
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <Image src={normalizeImageUrl(featuredRelease.coverUrl)} alt={featuredRelease.title} fill className="object-cover" />
            </div>

            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.22em] text-gold">{featuredRelease.format}</p>
              <p className="text-sm text-white/65">Release date: {formatDate(featuredRelease.releaseDate)}</p>
              {(featuredSpotifyEmbed || featuredAppleEmbed || featuredYoutubeEmbed) ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {featuredSpotifyEmbed ? (
                    <iframe
                      src={featuredSpotifyEmbed}
                      width="100%"
                      height={String(featuredSpotifyHeight)}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-xl border border-white/15"
                    />
                  ) : null}
                  {featuredAppleEmbed ? (
                    <iframe
                      src={featuredAppleEmbed}
                      width="100%"
                      height={String(featuredAppleHeight)}
                      allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                      className="rounded-xl border border-white/15"
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/releases">View Discography</ButtonLink>
                <ButtonLink href="/licensing" variant="ghost">
                  License This Sound
                </ButtonLink>
              </div>
            </div>
            {featuredYoutubeEmbed ? (
              <div className="md:col-span-2">
                <iframe
                  src={featuredYoutubeEmbed}
                  width="100%"
                  height="420"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  className="w-full rounded-xl border border-white/15"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section id="artists" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
          <SectionTitle
            eyebrow="Artists Roster"
            title="Built for global stages."
            description="A curated roster designed for cultural impact, streaming dominance and long-term catalog value."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {artists.map((artist, index) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-black/70 transition duration-500 hover:-translate-y-1 hover:border-gold/40"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={normalizeImageUrl(artist.avatarUrl)}
                    alt={artist.name}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    priority={index < 2}
                  />
                </div>
                <div className="p-5">
                  <p className="font-display text-2xl text-white">{artist.name}</p>
                  <p className="mt-2 text-sm text-white/65">{artist.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="tours" className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
        <SectionTitle
          eyebrow="Upcoming Shows"
          title="Tours engineered for momentum."
          description="Ticketing, sponsorship and fan conversion under one operation layer."
        />

        <div className="mt-10 grid gap-4">
          {events.map((event) => (
            <div key={event.id} className="cinematic-panel rounded-2xl p-5 md:grid md:grid-cols-[1.2fr_1fr_auto] md:items-center md:gap-4">
              <div>
                <p className="font-display text-xl text-white">{event.title}</p>
                <p className="mt-1 text-sm text-white/65">
                  {event.venue} · {event.city}, {event.country}
                </p>
              </div>
              <p className="mt-3 text-sm text-white/75 md:mt-0">{formatDate(event.startsAt)}</p>
              <ButtonLink href="/events" className="mt-4 md:mt-0">
                Get Tickets
              </ButtonLink>
            </div>
          ))}
        </div>
      </section>

      <section id="press" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
          <SectionTitle
            eyebrow="Latest News / Press"
            title="Narrative control across media."
            description="Editorial stories, press appearances and strategic announcements."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {news.slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-black/80 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-gold">{item.category}</p>
                <h3 className="mt-3 font-display text-2xl text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/65">{item.excerpt}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(item.publishedAt)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
        <SectionTitle
          eyebrow="Visual Gallery"
          title="Studio, stage, movement."
          description="A visual identity designed to travel globally while staying rooted in latin urban DNA."
        />

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {gallery.slice(0, 8).map((item) => (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">
              {item.kind === "video" ? (
                <video src={normalizeImageUrl(item.mediaUrl)} className="h-full w-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <Image src={normalizeImageUrl(item.mediaUrl)} alt={item.caption} fill className="object-cover transition duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 text-xs uppercase tracking-[0.16em] text-white/80">
                {item.caption}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gold/25 bg-gold-fade">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-24 md:grid-cols-2 md:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Distribution & Publishing</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-white">Publishing by DGM Music</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Global digital distribution, rights administration and sync licensing infrastructure for long-term catalog growth.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/publishing">Explore Division</ButtonLink>
              <ButtonLink href="/licensing" variant="ghost">
                Licensing Requests
              </ButtonLink>
            </div>
          </div>

          <form action={subscribeNewsletterAction} className="cinematic-panel rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-gold">Newsletter Premium</p>
            <p className="mt-3 max-w-md text-sm text-white/75">Get release alerts, private showcases, tour pre-sales and editorial updates.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                name="email"
                required
                placeholder="you@domain.com"
                className="w-full rounded-full border border-white/20 bg-black/70 px-5 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-gold"
              />
              <button
                type="submit"
                className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-24 md:grid-cols-3 md:px-10">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Join EM</p>
          <h3 className="mt-3 font-display text-2xl text-white">Submit your demo</h3>
          <p className="mt-2 text-sm text-white/65">A&R review workflow with status tracking: approved, rejected or pending.</p>
          <ButtonLink href="/join" className="mt-6">
            Submit Demo
          </ButtonLink>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">EM Legacy</p>
          <h3 className="mt-3 font-display text-2xl text-white">Culture that compounds</h3>
          <p className="mt-2 text-sm text-white/65">Our legacy archives signature releases, milestones and generational impact.</p>
          <ButtonLink href="/legacy" className="mt-6" variant="ghost">
            View Legacy
          </ButtonLink>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Future Member Area</p>
          <h3 className="mt-3 font-display text-2xl text-white">Fan Club is coming</h3>
          <p className="mt-2 text-sm text-white/65">Premium access, behind-the-scenes drops, gated merch and members-only events.</p>
          <ButtonLink href="/news" className="mt-6" variant="ghost">
            Follow Updates
          </ButtonLink>
        </article>
      </section>
    </div>
  );
}
