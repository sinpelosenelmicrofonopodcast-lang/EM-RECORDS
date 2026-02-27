import Image from "next/image";
import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { ReleaseCountdown } from "@/components/home/release-countdown";
import { ButtonLink } from "@/components/shared/button";
import { SectionTitle } from "@/components/shared/section-title";
import { subscribeNewsletterAction } from "@/lib/actions/site";
import { getSiteLanguage } from "@/lib/i18n/server";
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
  const lang = await getSiteLanguage();
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
  const featuredArtist = featuredRelease?.artistSlug ? artists.find((artist) => artist.slug === featuredRelease.artistSlug) : null;
  const featuredArtistName = featuredArtist?.name ?? featuredRelease?.artistName ?? featuredRelease?.artistSlug ?? null;
  const hasFeaturedMedia = Boolean(featuredSpotifyEmbed || featuredAppleEmbed || featuredYoutubeEmbed);

  return (
    <div>
      <Hero lang={lang} />

      <section id="latest-release" className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <SectionTitle
            eyebrow={lang === "es" ? "Último Lanzamiento" : "Latest Release"}
            title={featuredRelease ? featuredRelease.title : "Next drop loading"}
            description={
              featuredRelease
                ? featuredRelease.description
                : lang === "es"
                  ? "Configura lanzamientos en el panel admin para publicar aquí el release destacado."
                  : "Configure releases in admin dashboard to publish the featured drop here."
            }
          />

          {countdownRelease ? <ReleaseCountdown releaseDate={countdownRelease.releaseDate} title={countdownRelease.title} /> : null}
        </div>

        {featuredRelease ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-[96px_1fr] md:items-start">
              <div className="mx-auto w-full max-w-[146px] overflow-hidden rounded-xl border border-white/10 bg-black/65 p-2 md:mx-0 md:max-w-none">
                <div className="relative aspect-square">
                  <Image src={normalizeImageUrl(featuredRelease.coverUrl)} alt={featuredRelease.title} fill className="object-contain" />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                  <span className="text-gold">{featuredRelease.format}</span>
                  {featuredRelease.featured ? <span className="rounded-full border border-gold/40 px-2 py-1 text-gold">Featured</span> : null}
                  <span className="text-white/45">{formatDate(featuredRelease.releaseDate)}</span>
                </div>

                <h3 className="mt-3 font-display text-2xl text-white md:text-3xl">{featuredRelease.title}</h3>

                {featuredArtistName ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/55">
                    {lang === "es" ? "Artista" : "Artist"} ·{" "}
                    {featuredRelease.artistSlug ? (
                      <Link href={`/artists/${featuredRelease.artistSlug}`} className="text-gold hover:underline">
                        {featuredArtistName}
                      </Link>
                    ) : (
                      <span className="text-gold">{featuredArtistName}</span>
                    )}
                  </p>
                ) : null}

                <p className="mt-3 text-sm leading-relaxed text-white/65">{featuredRelease.description}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <ButtonLink href="/releases">{lang === "es" ? "Ver discografía" : "View Discography"}</ButtonLink>
                  <ButtonLink href="/licensing" variant="ghost">
                    {lang === "es" ? "Licenciar este sonido" : "License This Sound"}
                  </ButtonLink>
                </div>
              </div>
            </div>

            {hasFeaturedMedia ? (
              <details className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3 open:border-gold/35">
                <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.18em] text-white/70">
                  {lang === "es" ? "Players y video" : "Players and video"}
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                  {featuredYoutubeEmbed ? (
                    <div className={featuredSpotifyEmbed || featuredAppleEmbed ? "md:col-span-2" : ""}>
                      <iframe
                        src={featuredYoutubeEmbed}
                        width="100%"
                        height="320"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        className="w-full rounded-xl border border-white/15"
                      />
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </section>

      <section id="artists" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
          <SectionTitle
            eyebrow={lang === "es" ? "Roster de Artistas" : "Artists Roster"}
            title={lang === "es" ? "Construidos para escenarios globales." : "Built for global stages."}
            description={
              lang === "es"
                ? "Un roster curado para impacto cultural, dominio en streaming y valor de catálogo a largo plazo."
                : "A curated roster designed for cultural impact, streaming dominance and long-term catalog value."
            }
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
          eyebrow={lang === "es" ? "Próximos Shows" : "Upcoming Shows"}
          title={lang === "es" ? "Tours diseñados para crear momentum." : "Tours engineered for momentum."}
          description={
            lang === "es"
              ? "Ticketing, patrocinio y conversión de fans bajo una sola capa operativa."
              : "Ticketing, sponsorship and fan conversion under one operation layer."
          }
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
                {lang === "es" ? "Comprar tickets" : "Get Tickets"}
              </ButtonLink>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-red-400/25 bg-[radial-gradient(circle_at_15%_15%,rgba(229,57,53,0.2),transparent_38%),radial-gradient(circle_at_82%_8%,rgba(198,168,91,0.2),transparent_34%)]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-20 md:grid-cols-[1.15fr_0.85fr] md:items-center md:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Competition Series</p>
            <h2 className="mt-4 font-display text-5xl leading-[0.96] text-white md:text-6xl">KILLEEN NEXT UP</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/72">
              {lang === "es"
                ? "Una plataforma oficial para descubrir al próximo artista de Killeen. Demo submission, votación verificada por OTP y selección final por EM Records."
                : "An official platform to discover Killeen's next artist. Demo submissions, OTP-verified voting and final selection by EM Records."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/killeen-next-up">{lang === "es" ? "Entrar a la competencia" : "Enter Competition"}</ButtonLink>
              <ButtonLink href="/killeen-next-up#submit-demo" variant="ghost">
                {lang === "es" ? "Enviar demo" : "Submit Demo"}
              </ButtonLink>
            </div>
          </div>

          <Link
            href="/killeen-next-up"
            className="group relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl shadow-black/40 transition duration-500 hover:-translate-y-1 hover:border-gold/50"
          >
            <div className="relative aspect-[16/10]">
              <img
                src="/images/killeen-next-up-banner.png"
                alt="Killeen Next Up banner"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
            </div>
          </Link>
        </div>
      </section>

      <section id="press" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
          <SectionTitle
            eyebrow={lang === "es" ? "Últimas Noticias / Prensa" : "Latest News / Press"}
            title={lang === "es" ? "Control narrativo en medios." : "Narrative control across media."}
            description={
              lang === "es"
                ? "Historias editoriales, apariciones en prensa y anuncios estratégicos."
                : "Editorial stories, press appearances and strategic announcements."
            }
          />

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {news.slice(0, 4).map((item) => (
              <Link key={item.id} href={`/news/${item.slug}`} className="rounded-2xl border border-white/10 bg-black/80 p-6 transition hover:border-gold/40 hover:bg-black">
                <p className="text-xs uppercase tracking-[0.2em] text-gold">{item.category}</p>
                <h3 className="mt-3 font-display text-2xl text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/65">{item.excerpt}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(item.publishedAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10">
        <SectionTitle
          eyebrow={lang === "es" ? "Galería Visual" : "Visual Gallery"}
          title={lang === "es" ? "Estudio, tarima, movimiento." : "Studio, stage, movement."}
          description={
            lang === "es"
              ? "Una identidad visual diseñada para viajar globalmente manteniendo ADN urbano latino."
              : "A visual identity designed to travel globally while staying rooted in latin urban DNA."
          }
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
              {lang === "es"
                ? "Distribución digital global, administración de derechos e infraestructura de sync licensing para crecimiento de catálogo."
                : "Global digital distribution, rights administration and sync licensing infrastructure for long-term catalog growth."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/publishing">{lang === "es" ? "Explorar división" : "Explore Division"}</ButtonLink>
              <ButtonLink href="/licensing" variant="ghost">
                {lang === "es" ? "Solicitudes de licensing" : "Licensing Requests"}
              </ButtonLink>
            </div>
          </div>

          <form action={subscribeNewsletterAction} className="cinematic-panel rounded-3xl p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-gold">Newsletter Premium</p>
            <p className="mt-3 max-w-md text-sm text-white/75">
              {lang === "es"
                ? "Recibe alertas de lanzamientos, showcases privados, preventas y actualizaciones editoriales."
                : "Get release alerts, private showcases, tour pre-sales and editorial updates."}
            </p>
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
                {lang === "es" ? "Suscribirse" : "Subscribe"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-24 md:grid-cols-3 md:px-10">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">{lang === "es" ? "Únete a EM" : "Join EM"}</p>
          <h3 className="mt-3 font-display text-2xl text-white">{lang === "es" ? "Envía tu demo" : "Submit your demo"}</h3>
          <p className="mt-2 text-sm text-white/65">
            {lang === "es"
              ? "Flujo de revisión A&R con seguimiento de estado: aprobado, rechazado o pendiente."
              : "A&R review workflow with status tracking: approved, rejected or pending."}
          </p>
          <ButtonLink href="/join" className="mt-6">
            {lang === "es" ? "Enviar demo" : "Submit Demo"}
          </ButtonLink>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">EM Legacy</p>
          <h3 className="mt-3 font-display text-2xl text-white">{lang === "es" ? "Cultura que trasciende" : "Culture that compounds"}</h3>
          <p className="mt-2 text-sm text-white/65">
            {lang === "es"
              ? "Nuestro legado archiva lanzamientos, hitos e impacto generacional."
              : "Our legacy archives signature releases, milestones and generational impact."}
          </p>
          <ButtonLink href="/legacy" className="mt-6" variant="ghost">
            {lang === "es" ? "Ver legado" : "View Legacy"}
          </ButtonLink>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">{lang === "es" ? "Área de miembros futura" : "Future Member Area"}</p>
          <h3 className="mt-3 font-display text-2xl text-white">{lang === "es" ? "El Fan Club viene pronto" : "Fan Club is coming"}</h3>
          <p className="mt-2 text-sm text-white/65">
            {lang === "es"
              ? "Acceso premium, contenido behind-the-scenes, merch exclusivo y eventos solo para miembros."
              : "Premium access, behind-the-scenes drops, gated merch and members-only events."}
          </p>
          <ButtonLink href="/news" className="mt-6" variant="ghost">
            {lang === "es" ? "Seguir novedades" : "Follow Updates"}
          </ButtonLink>
        </article>
      </section>
    </div>
  );
}
