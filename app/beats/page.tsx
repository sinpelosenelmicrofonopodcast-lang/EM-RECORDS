import type { Metadata } from "next";
import Link from "next/link";
import { BeatPreviewPlayer } from "@/components/beats/beat-preview-player";
import { SectionTitle } from "@/components/shared/section-title";
import { submitBeatInquiryAction } from "@/lib/actions/beat-inquiries";
import { getPublishedBeats, type BeatCatalogItem } from "@/lib/beat-inquiries";
import { getSiteLanguage } from "@/lib/i18n/server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Beats",
  description: "Explora beats disponibles de EM Records por género, BPM, tonalidad y mood.",
  path: "/beats",
  keywords: ["beats", "beat licensing", "instrumentals", "reggaeton beats", "trap latino beats", "EM Records"]
});

type Props = {
  searchParams: Promise<{
    request?: string;
    checkout?: string;
    q?: string;
    category?: string;
    mood?: string;
    bpm?: string;
    key?: string;
    availability?: string;
    sort?: string;
  }>;
};

function money(cents: number, lang: string): string {
  if (!Number.isFinite(cents) || cents <= 0) return lang === "es" ? "Consultar precio" : "Contact for pricing";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function vibeFor(beat: BeatCatalogItem): string[] {
  const text = [beat.title, beat.sourceTitle, beat.genre, beat.mood, ...beat.tags].filter(Boolean).join(" ").toLowerCase();
  const vibes = new Set<string>();
  if (/dark|oscuro|night|midnight|sombra|obsidian/.test(text)) vibes.add("Dark");
  if (/romantic|románt|sensual|deseo|humedad|dulce|love/.test(text)) vibes.add("Romantic / Sensual");
  if (/melodic|melód|emotional|nostalgia|echo|violin/.test(text)) vibes.add("Melodic / Emotional");
  if (/club|perreo|bail|danz|party/.test(text)) vibes.add("Club / Perreo");
  if (/cinematic|cinem|violin|orchestr/.test(text)) vibes.add("Cinematic");
  if (/commercial|comercial|radio ready/.test(text)) vibes.add("Commercial");
  if (vibes.size === 0) vibes.add("Urban");
  return [...vibes];
}

function matchesBpm(bpm: number, bucket: string) {
  if (!bucket) return true;
  if (bucket === "under-90") return bpm > 0 && bpm < 90;
  if (bucket === "90-99") return bpm >= 90 && bpm <= 99;
  if (bucket === "100-119") return bpm >= 100 && bpm <= 119;
  if (bucket === "120-plus") return bpm >= 120;
  return true;
}

function hrefWith(query: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...patch })) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? "/beats?" + qs : "/beats";
}

export default async function BeatsPage({ searchParams }: Props) {
  const lang = await getSiteLanguage();
  const query = await searchParams;
  const allBeats = await getPublishedBeats();
  const selectedBeat = allBeats.find((beat) => beat.id === query.request) ?? null;

  const q = String(query.q || "").trim().toLowerCase();
  const category = String(query.category || "");
  const mood = String(query.mood || "");
  const bpmBucket = String(query.bpm || "");
  const key = String(query.key || "");
  const availability = String(query.availability || "");
  const sort = String(query.sort || "newest");

  const categoryMap = new Map<string, { name: string; count: number }>();
  for (const beat of allBeats) {
    if (!beat.categorySlug || !beat.categoryName) continue;
    const existing = categoryMap.get(beat.categorySlug);
    categoryMap.set(beat.categorySlug, { name: beat.categoryName, count: (existing?.count || 0) + 1 });
  }
  const categories = [...categoryMap.entries()]
    .map(([slug, value]) => ({ slug, ...value }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const moods = Array.from(new Set(allBeats.flatMap(vibeFor))).sort();
  const keys = Array.from(new Set(allBeats.map((beat) => beat.key).filter(Boolean) as string[])).sort();

  let beats = allBeats.filter((beat) => {
    const searchable = [beat.title, beat.sourceTitle, beat.genre, beat.categoryName, beat.mood, ...beat.tags]
      .filter(Boolean).join(" ").toLowerCase();
    if (q && !searchable.includes(q)) return false;
    if (category && beat.categorySlug !== category) return false;
    if (mood && !vibeFor(beat).includes(mood)) return false;
    if (!matchesBpm(beat.bpm, bpmBucket)) return false;
    if (key && beat.key !== key) return false;
    if (availability === "exclusive" && beat.isExclusiveSold) return false;
    return true;
  });

  beats = [...beats].sort((a, b) => {
    if (sort === "bpm-asc") return (a.bpm || 999) - (b.bpm || 999);
    if (sort === "bpm-desc") return (b.bpm || 0) - (a.bpm || 0);
    if (sort === "price-asc") return a.priceBasic - b.priceBasic;
    if (sort === "title") return a.title.localeCompare(b.title);
    return 0;
  });

  const activeFilters = Boolean(q || category || mood || bpmBucket || key || availability);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="EM Records Beat Catalog"
        title={lang === "es" ? "Encuentra el sonido correcto." : "Find the right sound."}
        description={
          lang === "es"
            ? "Explora por género, vibe, BPM y tonalidad. Todos los previews se sirven desde el catálogo protegido de EM Records."
            : "Browse by genre, vibe, BPM and key. Previews are served from EM Records' protected catalog."
        }
      />

      {query.checkout === "inactive" ? (
        <div className="mt-6 rounded-2xl border border-gold/35 bg-gold/10 p-4 text-sm text-white/80">
          {lang === "es"
            ? "El checkout automático está temporalmente pausado. Puedes solicitar cualquier beat directamente."
            : "Automated checkout is temporarily paused. You can request any beat directly."}
        </div>
      ) : null}

      <section className="mt-8">
        <div className="flex gap-2 overflow-x-auto pb-3">
          <Link href={hrefWith(query, { category: undefined, request: undefined })} className={"shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.14em] " + (!category ? "border-gold bg-gold text-black" : "border-white/10 text-white/60")}>
            All · {allBeats.length}
          </Link>
          {categories.map((item) => (
            <Link key={item.slug} href={hrefWith(query, { category: item.slug, request: undefined })} className={"shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.14em] " + (category === item.slug ? "border-gold bg-gold text-black" : "border-white/10 text-white/60 hover:border-gold/50")}>
              {item.name} · {item.count}
            </Link>
          ))}
        </div>

        <form method="get" className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.02] p-4 md:grid-cols-2 xl:grid-cols-7">
          <input name="q" defaultValue={query.q || ""} placeholder={lang === "es" ? "Buscar beat..." : "Search beats..."} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none focus:border-gold xl:col-span-2" />
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <select name="mood" defaultValue={mood} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white">
            <option value="">{lang === "es" ? "Todos los vibes" : "All vibes"}</option>
            {moods.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select name="bpm" defaultValue={bpmBucket} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white">
            <option value="">BPM</option>
            <option value="under-90">&lt; 90 BPM</option>
            <option value="90-99">90–99 BPM</option>
            <option value="100-119">100–119 BPM</option>
            <option value="120-plus">120+ BPM</option>
          </select>
          <select name="key" defaultValue={key} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white">
            <option value="">{lang === "es" ? "Tonalidad" : "Key"}</option>
            {keys.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select name="availability" defaultValue={availability} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white">
            <option value="">{lang === "es" ? "Disponibilidad" : "Availability"}</option>
            <option value="exclusive">{lang === "es" ? "Exclusive disponible" : "Exclusive available"}</option>
          </select>
          <select name="sort" defaultValue={sort} className="rounded-xl border border-white/10 bg-black px-3 py-3 text-sm text-white">
            <option value="newest">{lang === "es" ? "Más recientes" : "Newest"}</option>
            <option value="title">A–Z</option>
            <option value="bpm-asc">BPM ↑</option>
            <option value="bpm-desc">BPM ↓</option>
            <option value="price-asc">{lang === "es" ? "Precio ↑" : "Price ↑"}</option>
          </select>
          <button className="rounded-xl bg-gold px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black xl:col-span-7 xl:justify-self-start">
            {lang === "es" ? "Aplicar filtros" : "Apply filters"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between gap-4 text-xs text-white/40">
          <span>{beats.length} {lang === "es" ? "beats encontrados" : "beats found"}</span>
          {activeFilters ? <Link href="/beats" className="uppercase tracking-[0.12em] text-gold">{lang === "es" ? "Limpiar filtros" : "Clear filters"}</Link> : null}
        </div>
      </section>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {beats.map((beat) => (
          <article key={beat.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
            {beat.coverUrl ? (
              <div className="aspect-square overflow-hidden bg-black">
                <img src={beat.coverUrl} alt={beat.title} className="h-full w-full object-cover" loading="lazy" />
              </div>
            ) : null}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gold">{beat.categoryName || beat.genre || "EM Records"}</p>
                  <h2 className="mt-2 font-display text-3xl text-white">{beat.title}</h2>
                </div>
                {beat.isExclusiveSold ? (
                  <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/50">Exclusive sold</span>
                ) : (
                  <span className="rounded-full border border-gold/25 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-gold">Exclusive open</span>
                )}
              </div>

              <p className="mt-3 text-sm text-white/60">
                {beat.bpm > 0 ? String(beat.bpm) + " BPM" : "BPM open"}
                {beat.key ? " · " + beat.key : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {vibeFor(beat).slice(0, 3).map((vibe) => <span key={vibe} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/45">{vibe}</span>)}
              </div>

              {beat.previewUrl ? (
                <BeatPreviewPlayer
                  src={beat.previewUrl}
                  startSeconds={beat.previewStartSeconds}
                  durationSeconds={beat.previewDurationSeconds}
                  label={String(beat.previewDurationSeconds) + "s preview"}
                />
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-white/65">
                <span className="rounded-xl border border-white/10 px-3 py-2">Basic · {money(beat.priceBasic, lang)}</span>
                <span className="rounded-xl border border-white/10 px-3 py-2">Standard · {money(beat.priceStandard, lang)}</span>
                <span className="rounded-xl border border-white/10 px-3 py-2">Premium · {money(beat.pricePremium, lang)}</span>
                <span className="rounded-xl border border-white/10 px-3 py-2">Exclusive · {beat.isExclusiveSold ? "Sold" : money(beat.priceExclusive, lang)}</span>
              </div>

              <Link href={"/beats?request=" + beat.id + "#request-beat"} className="mt-5 inline-flex rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">
                {lang === "es" ? "Solicitar este beat" : "Request this beat"}
              </Link>
            </div>
          </article>
        ))}
      </div>

      {beats.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 p-6 text-sm text-white/65">
          {lang === "es" ? "No encontramos beats con esos filtros." : "No beats matched those filters."}
        </p>
      ) : null}

      {selectedBeat ? (
        <section id="request-beat" className="mt-16 scroll-mt-28 rounded-3xl border border-gold/30 bg-gold/[0.06] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "Solicitud privada" : "Private request"}</p>
          <h2 className="mt-3 font-display text-4xl text-white">{selectedBeat.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/65">
            {lang === "es"
              ? "Cuéntanos qué licencia te interesa y para qué proyecto usarás el beat."
              : "Tell us which license interests you and how you plan to use the beat."}
          </p>
          <form action={submitBeatInquiryAction} className="mt-6 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="beatId" value={selectedBeat.id} />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <input name="name" required maxLength={120} placeholder={lang === "es" ? "Tu nombre" : "Your name"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input type="email" name="email" required maxLength={320} placeholder="Email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <select name="licenseType" defaultValue="unsure" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
              <option value="unsure">{lang === "es" ? "No estoy seguro — quiero orientación" : "Not sure — I need guidance"}</option>
              <option value="basic">Basic · {money(selectedBeat.priceBasic, lang)}</option>
              <option value="standard">Standard · {money(selectedBeat.priceStandard, lang)}</option>
              <option value="premium">Premium · {money(selectedBeat.pricePremium, lang)}</option>
              {!selectedBeat.isExclusiveSold ? <option value="exclusive">Exclusive · {money(selectedBeat.priceExclusive, lang)}</option> : null}
            </select>
            <div className="hidden md:block" />
            <textarea name="message" required minLength={2} maxLength={5000} rows={6} placeholder={lang === "es" ? "Háblanos del proyecto, fecha estimada y cualquier duda." : "Tell us about your project, timing and any questions."} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
            <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
              {lang === "es" ? "Abrir solicitud" : "Open request"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
