import type { Metadata } from "next";
import Link from "next/link";
import { InternalLinksBlock } from "@/components/shared/internal-links-block";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { buildCollectionMetadata } from "@/lib/seo";

export const metadata: Metadata = buildCollectionMetadata("publishing");

export default async function PublishingPage() {
  const lang = await getSiteLanguage();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <h1 className="sr-only">{lang === "es" ? "Producción y Publishing de EM Records" : "EM Records publishing and production"}</h1>
      <SectionTitle
        eyebrow="Publishing by DGM Music"
        title={lang === "es" ? "Derechos. Ingresos. Alcance." : "Rights. Revenue. Reach."}
        description={
          lang === "es"
            ? "Infraestructura completa para compositores, productores y artistas: administración de derechos, sync pitching, recaudación y soporte legal."
            : "Full publishing infrastructure for writers, producers and artists: rights administration, sync pitching, collection, and legal support."
        }
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-display text-2xl text-white">{lang === "es" ? "Gestión de Catálogo" : "Catalog Management"}</h3>
          <p className="mt-3 text-sm text-white/65">
            {lang === "es" ? "Integridad de metadata, splits, registros y optimización de regalías." : "Metadata integrity, splits tracking, registrations and royalty optimization."}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-display text-2xl text-white">Sync & Licensing</h3>
          <p className="mt-3 text-sm text-white/65">
            {lang === "es" ? "Oportunidades de placement en TV, cine, gaming, ads y activaciones premium de marca." : "Placement opportunities in TV, film, gaming, ads and premium brand activations."}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-display text-2xl text-white">{lang === "es" ? "Recaudación Global" : "Global Collection"}</h3>
          <p className="mt-3 text-sm text-white/65">
            {lang === "es" ? "Cobro de regalías multi-territorio con reportes transparentes y control de pagos." : "Cross-territory royalty collection with transparent reporting and payout controls."}
          </p>
        </article>
      </div>

      <div className="mt-10 rounded-3xl border border-gold/30 bg-gold/10 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "División de Distribución" : "Distribution Division"}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80">
          {lang === "es"
            ? "Los servicios de distribución EM incluyen planificación de lanzamientos, optimización de plataformas, estrategia de playlists, analytics y coordinación multi-región."
            : "EM distribution services include release planning, platform optimization, playlist strategy, catalog analytics and multi-region launch coordination."}
        </p>
        <Link href="/licensing" className="mt-6 inline-block rounded-full border border-gold px-6 py-3 text-xs uppercase tracking-[0.2em] text-gold">
          {lang === "es" ? "Solicitar Licensing / Distribución" : "Request Licensing / Distribution"}
        </Link>
      </div>

      <InternalLinksBlock
        title={lang === "es" ? "Navegación Relacionada" : "Related Navigation"}
        links={[
          {
            href: "/music",
            label: lang === "es" ? "Música" : "Music",
            description: lang === "es" ? "Revisa el catálogo activo de lanzamientos." : "Review the active release catalog."
          },
          {
            href: "/press",
            label: lang === "es" ? "Prensa" : "Press",
            description: lang === "es" ? "Anuncios y avances de publishing." : "Publishing announcements and updates."
          },
          {
            href: "/join",
            label: lang === "es" ? "Únete a EM" : "Join EM",
            description: lang === "es" ? "Envía música para evaluación A&R." : "Submit music for A&R review."
          }
        ]}
      />
    </div>
  );
}
