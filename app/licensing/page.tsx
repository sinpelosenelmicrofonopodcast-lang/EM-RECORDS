import type { Metadata } from "next";
import { submitSponsorApplicationAction } from "@/lib/actions/site";
import { SectionTitle } from "@/components/shared/section-title";

export const metadata: Metadata = {
  title: "Licensing & Sponsors",
  description: "Sync licensing requests, sponsor plans and partnership applications."
};

export default function LicensingPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="Licensing & Sponsors"
        title="Partner with the movement"
        description="Music licensing, brand collaboration and event sponsorship application in one place."
      />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Bronze Sponsor</p>
          <p className="mt-3 text-sm text-white/70">Digital placement, logo inclusion and social recap exposure.</p>
        </article>
        <article className="rounded-2xl border border-gold/40 bg-gold/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Gold Sponsor</p>
          <p className="mt-3 text-sm text-white/80">Stage branding, content co-creation and targeted audience activations.</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Platinum Sponsor</p>
          <p className="mt-3 text-sm text-white/70">Exclusive campaign ownership with artist collaboration options.</p>
        </article>
      </div>

      <form action={submitSponsorApplicationAction} className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-black/70 p-6 md:grid-cols-2">
        <input
          name="company"
          required
          placeholder="Company"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
        />
        <input
          name="contactName"
          required
          placeholder="Contact Name"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Business Email"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
        />
        <select name="plan" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
          <option value="">Select Plan</option>
          <option value="bronze">Bronze</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>
        <textarea
          name="notes"
          rows={5}
          placeholder="Goals, budget range, campaign timing"
          className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
        />
        <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
          Submit Application
        </button>
      </form>
    </div>
  );
}
