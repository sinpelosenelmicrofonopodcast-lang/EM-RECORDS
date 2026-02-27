import type { Metadata } from "next";
import { SectionTitle } from "@/components/shared/section-title";

export const metadata: Metadata = {
  title: "EM Legacy",
  description: "Milestones and legacy timeline of EM Records."
};

const milestones = [
  { year: "2024", note: "EM Records founded with a global urban latin roadmap." },
  { year: "2025", note: "First cross-market campaign reaches US + LATAM streaming top charts." },
  { year: "2026", note: "Publishing by DGM Music launches with licensing and catalog expansion." }
];

export default function LegacyPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="EM Legacy"
        title="From release to movement"
        description="A growing archive of milestones, defining projects and long-term cultural footprint."
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
