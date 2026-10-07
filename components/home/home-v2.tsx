import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getFeaturedRelease, getMusicCatalogReleases, getPublishedArtists } from "@/lib/queries";
import { getPublishedBeats } from "@/lib/beat-inquiries";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeImageUrl } from "@/lib/utils";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export default async function HomeV2() {
  const lang = await getSiteLanguage();
  const [featured, artists, releases, beats] = await Promise.all([
    getFeaturedRelease(),
    getPublishedArtists(),
    getMusicCatalogReleases(),
    getPublishedBeats()
  ]);

  let services: any[] = [];
  try {
    const service = createServiceClient();
    const result = await service
      .from("services")
      .select("id,name,description,price,category,delivery_time")
      .order("price", { ascending: true })
      .limit(4);
    services = result.data ?? [];
  } catch {
    services = [];
  }

  const featuredArtist = artists.find((artist) => artist.slug === featured?.artistSlug);
  const featuredImage = featured?.coverUrl
    ? normalizeImageUrl(featured.coverUrl)
    : normalizeImageUrl(featuredArtist?.heroImageUrl || featuredArtist?.avatarUrl || "/og-default.jpg");

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/8 bg-[#030303]">
        <div className="em-hero-glow pointer-events-none absolute inset-0" />
        <div className="mx-auto grid min-h-[78vh] w-full max-w-[92rem] items-center gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
          <div className="relative z-10">
            <div className="flex w-[175px] items-center justify-center">
              <EmLogo priority alt="EM Records LLC" />
            </div>
            <p className="mt-8 text-[10px] uppercase tracking-[0.32em] text-gold">Label · Production · Publishing</p>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[.95] text-white md:text-7xl xl:text-[92px]">
              Build the sound.<br />
              <span className="text-white/38">Own the vision.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-white/58">
              {lang === "es"
                ? "EM Records desarrolla artistas, produce música y administra oportunidades de publishing/licensing desde una sola operación."
                : "EM Records develops artists, produces music and manages publishing/licensing opportunities from one operation."}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/music" className="rounded-full bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">
                {lang === "es" ? "Escuchar catálogo" : "Explore Music"}
              </Link>
              <Link href="/services" className="rounded-full border border-white/18 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 hover:border-gold/60 hover:text-gold">
                {lang === "es" ? "Trabaja con nosotros" : "Work With Us"}
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-10 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative rotate-[2deg] overflow-hidden rounded-[34px] border border-white/12 bg-[#0b0b0b] p-3 shadow-2xl">
              <div className="aspect-square overflow-hidden rounded-[26px] bg-black">
                <img src={featuredImage} alt={featured?.title || "EM Records"} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-end justify-between gap-5 px-3 pb-2 pt-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-gold">Featured now</p>
                  <p className="mt-1 text-lg font-semibold text-white">{featured?.title || "EM Records Catalog"}</p>
                  <p className="text-sm text-white/42">{featured?.artistName || featuredArtist?.name || "EM Records"}</p>
                </div>
                <Link href="/music" className="text-[10px] uppercase tracking-[0.16em] text-white/50 hover:text-gold">Listen →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/8 bg-white/[0.015]">
        <div className="mx-auto grid w-full max-w-[92rem] grid-cols-3 divide-x divide-white/8 px-6 md:px-10">
          {[
            [artists.length, lang === "es" ? "Artistas activos" : "Active artists"],
            [releases.length, lang === "es" ? "Lanzamientos" : "Releases"],
            [beats.length, lang === "es" ? "Beats disponibles" : "Available beats"]
          ].map(([value, label]) => (
            <div key={String(label)} className="py-7 text-center">
              <p className="font-display text-3xl text-white md:text-4xl">{value}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/35">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[92rem] px-6 py-24 md:px-10">
        <SectionTitle
          eyebrow="What EM Does"
          title={lang === "es" ? "Una operación. Tres motores." : "One operation. Three engines."}
          description={lang === "es" ? "Desarrollo, producción y propiedad intelectual conectados." : "Artist development, production and intellectual property under one roof."}
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {[
            ["01", "Label", lang === "es" ? "Desarrollo de artistas, lanzamientos y estrategia de catálogo." : "Artist development, releases and catalog strategy.", "/artists"],
            ["02", lang === "es" ? "Studio & Producción" : "Studio & Production", lang === "es" ? "Grabación, producción, mezcla, master y vocal production." : "Recording, production, mixing, mastering and vocal production.", "/services"],
            ["03", "Publishing & Licensing", lang === "es" ? "Publishing by DGM Music y oportunidades de sync." : "Publishing by DGM Music and sync opportunities.", "/publishing"]
          ].map(([number, title, description, href]) => (
            <Link key={String(title)} href={String(href)} className="em-editorial-card group min-h-[280px] rounded-[28px] p-7">
              <p className="text-[10px] tracking-[0.25em] text-gold">{number}</p>
              <h2 className="mt-16 font-display text-4xl text-white">{title}</h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/48">{description}</p>
              <p className="mt-7 text-[10px] uppercase tracking-[0.18em] text-white/40 group-hover:text-gold">Explore →</p>
            </Link>
          ))}
        </div>
      </section>

      {featured ? (
        <section className="border-y border-white/8 bg-[#070707]">
          <div className="mx-auto grid w-full max-w-[92rem] gap-10 px-6 py-24 md:px-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div className="overflow-hidden rounded-[32px] border border-white/10">
              <img src={normalizeImageUrl(featured.coverUrl)} alt={featured.title} className="aspect-square w-full object-cover" />
            </div>
            <div className="lg:pl-8">
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold">Featured Release</p>
              <h2 className="mt-5 font-display text-5xl leading-none text-white md:text-7xl">{featured.title}</h2>
              <p className="mt-4 text-lg text-white/45">{featured.artistName || featuredArtist?.name || "EM Records"}</p>
              <p className="mt-7 max-w-xl text-sm leading-relaxed text-white/52">{featured.description || "Official EM Records catalog release."}</p>
              <Link href="/music" className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">Explore Music</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-[92rem] px-6 py-24 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="Roster" title={lang === "es" ? "Artistas EM" : "EM Artists"} description={lang === "es" ? "Pocas caras. Desarrollo profundo." : "Focused roster. Deep development."} />
          <Link href="/artists" className="text-xs uppercase tracking-[0.18em] text-gold">View roster →</Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {artists.slice(0, 4).map((artist) => (
            <Link key={artist.id} href={"/artists/" + artist.slug} className="group relative min-h-[520px] overflow-hidden rounded-[32px] border border-white/10 bg-black">
              <img src={normalizeImageUrl(artist.heroImageUrl || artist.avatarUrl)} alt={artist.name} className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
              <div className="absolute bottom-0 p-7">
                <p className="text-[9px] uppercase tracking-[0.2em] text-gold">{artist.genre || "EM Records Artist"}</p>
                <h3 className="mt-2 font-display text-5xl text-white">{artist.name}</h3>
                <p className="mt-2 max-w-md text-sm text-white/58">{artist.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {beats.length ? (
        <section className="border-y border-white/8 bg-white/[0.015]">
          <div className="mx-auto w-full max-w-[92rem] px-6 py-24 md:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle eyebrow="Beat Catalog" title={lang === "es" ? "Encuentra el sonido." : "Find the sound."} description={lang === "es" ? "Previews reales y solicitud directa." : "Real previews and direct requests."} />
              <Link href="/beats" className="text-xs uppercase tracking-[0.18em] text-gold">All beats →</Link>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {beats.slice(0, 3).map((beat) => (
                <article key={beat.id} className="em-editorial-card rounded-[26px] p-5">
                  {beat.coverUrl ? <img src={beat.coverUrl} alt={beat.title} className="aspect-square w-full rounded-[20px] object-cover" /> : <div className="aspect-square rounded-[20px] bg-white/[0.035]" />}
                  <div className="pt-5">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-gold">{beat.genre || "Beat"} · {beat.bpm || "—"} BPM</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{beat.title}</h3>
                    {beat.previewUrl ? <audio controls preload="none" className="mt-4 w-full"><source src={beat.previewUrl} /></audio> : null}
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-white/45">From {beat.priceBasic > 0 ? money(beat.priceBasic) : "request"}</p>
                      <Link href={"/beats?request=" + beat.id + "#request-beat"} className="text-[10px] uppercase tracking-[0.16em] text-gold">Request →</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-[92rem] px-6 py-24 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <SectionTitle eyebrow="Studio & Services" title={lang === "es" ? "De idea a master." : "From idea to master."} description={lang === "es" ? "Servicios concretos y solicitudes directas al pipeline interno." : "Concrete services routed directly into our internal pipeline."} />
          <div className="divide-y divide-white/10 border-y border-white/10">
            {services.map((service: any) => (
              <Link key={service.id} href="/studio" className="group flex items-center justify-between gap-5 py-5">
                <div>
                  <p className="text-lg font-medium text-white">{service.name}</p>
                  <p className="mt-1 max-w-xl text-sm text-white/42">{service.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gold">{service.price ? money(Number(service.price)) : "Custom"}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-white/30">{service.delivery_time ? String(service.delivery_time) + " day delivery" : "Request quote"}</p>
                </div>
              </Link>
            ))}
            <Link href="/services" className="block py-5 text-xs uppercase tracking-[0.18em] text-gold">View all services →</Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-gold text-black">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] opacity-55">EM Records</p>
            <h2 className="mt-2 max-w-3xl font-display text-4xl leading-none md:text-6xl">
              {lang === "es" ? "¿Tienes música o un proyecto? Muévelo." : "Have music or a project? Move it forward."}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/services" className="rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white">Start a Project</Link>
            <Link href="/join" className="rounded-full border border-black/25 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em]">Submit Music</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
