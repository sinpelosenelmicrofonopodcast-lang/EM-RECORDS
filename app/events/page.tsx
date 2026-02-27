import type { Metadata } from "next";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getUpcomingEvents } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Events & Tours",
  description: "Upcoming shows, tour dates and ticketing by EM Records."
};

export default async function EventsPage() {
  const lang = await getSiteLanguage();
  const events = await getUpcomingEvents();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow={lang === "es" ? "Eventos / Conciertos" : "Events / Concerts"}
        title={lang === "es" ? "Calendario de Tours" : "Tour Calendar"}
        description={lang === "es" ? "Venta de tickets integrada con Stripe, validación QR y sponsors por niveles." : "Integrated ticket sales with Stripe, QR validation and sponsor tiers."}
      />

      <div className="mt-10 grid gap-5">
        {events.map((event) => (
          <article key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="md:flex md:items-start md:justify-between">
              <div>
                <h2 className="font-display text-3xl text-white">{event.title}</h2>
                <p className="mt-2 text-sm text-white/65">
                  {event.venue} · {event.city}, {event.country}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gold">{formatDate(event.startsAt)}</p>
              </div>

              <div className="mt-5 md:mt-0 md:text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">{lang === "es" ? "Sponsors" : "Sponsors"}</p>
                <p className="mt-1 text-sm text-white/70">{event.sponsors.join(" · ") || (lang === "es" ? "Por anunciar" : "TBA")}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {event.stripePriceId ? (
                <form action="/api/stripe/checkout" method="POST">
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="priceId" value={event.stripePriceId} />
                  <input type="hidden" name="eventTitle" value={event.title} />
                  <button
                    type="submit"
                    className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    {lang === "es" ? "Comprar Tickets" : "Buy Tickets"}
                  </button>
                </form>
              ) : null}

              {event.ticketUrl ? (
                <a
                  href={event.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
                >
                  {lang === "es" ? "Tickets Externos" : "External Tickets"}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
