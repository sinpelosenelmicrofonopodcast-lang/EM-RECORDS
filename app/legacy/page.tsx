import type { Metadata } from "next";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "EM Legacy",
  description: "Milestones and legacy timeline of EM Records."
};

export default async function LegacyPage() {
  const lang = await getSiteLanguage();
  const milestones =
    lang === "es"
      ? [
          { year: "2024", note: "EM Records se funda con una hoja de ruta urbana latina de escala global." },
          { year: "2025", note: "La primera campaña cross-market entra en charts de streaming en US + LATAM." },
          { year: "2026", note: "Lanza Publishing by DGM Music con enfoque en licensing y expansión de catálogo." }
        ]
      : [
          { year: "2024", note: "EM Records founded with a global urban latin roadmap." },
          { year: "2025", note: "First cross-market campaign reaches US + LATAM streaming top charts." },
          { year: "2026", note: "Publishing by DGM Music launches with licensing and catalog expansion." }
        ];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="EM Legacy"
        title={lang === "es" ? "Del release al movimiento" : "From release to movement"}
        description={
          lang === "es"
            ? "Un archivo vivo de hitos, proyectos definitorios e impacto cultural de largo plazo."
            : "A growing archive of milestones, defining projects and long-term cultural footprint."
        }
      />

      <div className="mt-10 space-y-4">
        {milestones.map((item) => (
          <article key={item.year} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-gold">{item.year}</p>
            <p className="mt-2 text-sm text-white/75">{item.note}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
