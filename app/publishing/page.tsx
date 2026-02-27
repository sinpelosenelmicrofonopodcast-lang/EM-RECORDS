import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/section-title";

export const metadata: Metadata = {
  title: "Publishing by DGM Music",
  description: "Publishing division for rights administration, licensing and catalog growth."
};

export default function PublishingPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="Publishing by DGM Music"
        title="Rights. Revenue. Reach."
        description="Full publishing infrastructure for writers, producers and artists: rights administration, sync pitching, collection, and legal support."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-display text-2xl text-white">Catalog Management</h3>
          <p className="mt-3 text-sm text-white/65">Metadata integrity, splits tracking, registrations and royalty optimization.</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-display text-2xl text-white">Sync & Licensing</h3>
          <p className="mt-3 text-sm text-white/65">Placement opportunities in TV, film, gaming, ads and premium brand activations.</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-display text-2xl text-white">Global Collection</h3>
          <p className="mt-3 text-sm text-white/65">Cross-territory royalty collection with transparent reporting and payout controls.</p>
        </article>
      </div>

      <div className="mt-10 rounded-3xl border border-gold/30 bg-gold/10 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Distribution Division</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80">
          EM distribution services include release planning, platform optimization, playlist strategy, catalog analytics and multi-region launch coordination.
        </p>
        <Link href="/licensing" className="mt-6 inline-block rounded-full border border-gold px-6 py-3 text-xs uppercase tracking-[0.2em] text-gold">
          Request Licensing / Distribution
        </Link>
      </div>
    </div>
  );
}
