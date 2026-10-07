import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/section-title";
import { submitBeatInquiryAction } from "@/lib/actions/beat-inquiries";
import { getPublishedBeats } from "@/lib/beat-inquiries";
import { getSiteLanguage } from "@/lib/i18n/server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Beats",
  description: "Explora beats disponibles de EM Records y solicita licencias directamente con nuestro equipo.",
  path: "/beats",
  keywords: ["beats", "beat licensing", "instrumentals", "EM Records", "producer beats"]
});

type Props = {
  searchParams: Promise<{ request?: string; checkout?: string }>;
};

function money(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "Consultar";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function BeatsPage({ searchParams }: Props) {
  const lang = await getSiteLanguage();
  const query = await searchParams;
  const beats = await getPublishedBeats();
  const selectedBeat = beats.find((beat) => beat.id === query.request) ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="EM Records Beat Catalog"
        title={lang === "es" ? "Encuentra el beat. Habla con nosotros." : "Find the beat. Talk to us."}
        description={
          lang === "es"
            ? "El checkout automático está pausado mientras terminamos la integración de pagos. Solicita cualquier beat y nuestro equipo cerrará licencia, términos y pago contigo directamente."
            : "Automated checkout is temporarily paused while we finish the payment integration. Request any beat and our team will finalize licensing, terms and payment with you directly."
        }
      />

      {query.checkout === "inactive" ? (
        <div className="mt-6 rounded-2xl border border-gold/35 bg-gold/10 p-4 text-sm text-white/80">
          {lang === "es"
            ? "El checkout de beats está temporalmente desactivado. Usa “Solicitar este beat” para abrir una conversación privada con EM Records."
            : "Beat checkout is temporarily disabled. Use “Request this beat” to open a private conversation with EM Records."}
        </div>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                  <p className="text-xs uppercase tracking-[0.18em] text-gold">{beat.genre || "EM Records"}</p>
                  <h2 className="mt-2 font-display text-3xl text-white">{beat.title}</h2>
                </div>
                {beat.isExclusiveSold ? (
                  <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/50">Exclusive sold</span>
                ) : null}
              </div>

              <p className="mt-3 text-sm text-white/60">
                {beat.bpm > 0 ? String(beat.bpm) + " BPM" : "BPM open"}
                {beat.key ? " · " + beat.key : ""}
                {beat.mood ? " · " + beat.mood : ""}
              </p>

              {beat.description ? <p className="mt-4 text-sm leading-relaxed text-white/70">{beat.description}</p> : null}

              {beat.previewUrl ? (
                <audio controls preload="none" className="mt-5 w-full">
                  <source src={beat.previewUrl} />
                </audio>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-white/65">
                <span className="rounded-xl border border-white/10 px-3 py-2">Basic · {money(beat.priceBasic)}</span>
                <span className="rounded-xl border border-white/10 px-3 py-2">Standard · {money(beat.priceStandard)}</span>
                <span className="rounded-xl border border-white/10 px-3 py-2">Premium · {money(beat.pricePremium)}</span>
                <span className="rounded-xl border border-white/10 px-3 py-2">Exclusive · {beat.isExclusiveSold ? "Sold" : money(beat.priceExclusive)}</span>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-white/45">
                {lang === "es"
                  ? "Precios de referencia. Disponibilidad y términos finales se confirman manualmente antes del pago."
                  : "Reference pricing. Final availability and license terms are confirmed manually before payment."}
              </p>

              <Link
                href={"/beats?request=" + beat.id + "#request-beat"}
                className="mt-5 inline-flex rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black"
              >
                {lang === "es" ? "Solicitar este beat" : "Request this beat"}
              </Link>
            </div>
          </article>
        ))}
      </div>

      {beats.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 p-6 text-sm text-white/65">
          {lang === "es" ? "No hay beats publicados en este momento." : "No published beats are available right now."}
        </p>
      ) : null}

      {selectedBeat ? (
        <section id="request-beat" className="mt-16 scroll-mt-28 rounded-3xl border border-gold/30 bg-gold/[0.06] p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "Solicitud privada" : "Private request"}</p>
          <h2 className="mt-3 font-display text-4xl text-white">{selectedBeat.title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/65">
            {lang === "es"
              ? "Cuéntanos qué licencia te interesa y para qué proyecto usarás el beat. Al enviar, recibirás un enlace privado para continuar la conversación con EM Records."
              : "Tell us which license interests you and how you plan to use the beat. After submitting, you will receive a private link to continue the conversation with EM Records."}
          </p>

          <form action={submitBeatInquiryAction} className="mt-6 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="beatId" value={selectedBeat.id} />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <input
              name="name"
              required
              maxLength={120}
              placeholder={lang === "es" ? "Tu nombre" : "Your name"}
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <input
              type="email"
              name="email"
              required
              maxLength={320}
              placeholder="Email"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <select name="licenseType" defaultValue="unsure" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
              <option value="unsure">{lang === "es" ? "No estoy seguro — quiero orientación" : "Not sure — I need guidance"}</option>
              <option value="basic">Basic · {money(selectedBeat.priceBasic)}</option>
              <option value="standard">Standard · {money(selectedBeat.priceStandard)}</option>
              <option value="premium">Premium · {money(selectedBeat.pricePremium)}</option>
              {!selectedBeat.isExclusiveSold ? <option value="exclusive">Exclusive · {money(selectedBeat.priceExclusive)}</option> : null}
            </select>
            <div className="hidden md:block" />
            <textarea
              name="message"
              required
              minLength={2}
              maxLength={5000}
              rows={6}
              placeholder={lang === "es" ? "Háblanos del proyecto, fecha estimada y cualquier duda." : "Tell us about your project, timing and any questions."}
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
            />
            <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
              {lang === "es" ? "Abrir solicitud" : "Open request"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
