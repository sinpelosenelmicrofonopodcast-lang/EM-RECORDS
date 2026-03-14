import { ArtistSigningShell } from "@/components/signing/artist-signing-shell";
import { updateArtistProfileFromPortalAction } from "@/lib/actions/signing";
import { requireArtistPortalBundle } from "@/lib/signing/page";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";
  const { leadId, bundle } = await requireArtistPortalBundle();
  const lead = bundle.lead!;

  return (
    <ArtistSigningShell title="Profile" subtitle="Maintain accurate legal and contact data for your agreement and onboarding.">
      {flashStatus && flashMessage ? (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            flashStatus === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          ].join(" ")}
        >
          {decodeURIComponent(flashMessage)}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">Artist Profile</h2>
        <form action={updateArtistProfileFromPortalAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirectTo" value="/dashboard/signing/profile" />
          <input type="hidden" name="lead_id" value={leadId} />
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">Legal Name</span>
            <input value={lead.legalName} readOnly className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white/70" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">Stage Name</span>
            <input value={lead.stageName || ""} readOnly className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white/70" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">Email</span>
            <input value={lead.email} readOnly className="w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white/70" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">Phone</span>
            <input name="phone" defaultValue={lead.phone || ""} className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">Country</span>
            <input name="country" defaultValue={lead.country || ""} className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">State</span>
            <input name="state" defaultValue={lead.state || ""} className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">Instagram</span>
            <input
              name="social_instagram"
              defaultValue={String((lead.socialLinks as Record<string, string>).instagram || "")}
              className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">TikTok</span>
            <input
              name="social_tiktok"
              defaultValue={String((lead.socialLinks as Record<string, string>).tiktok || "")}
              className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.14em] text-white/55">Notes</span>
            <textarea name="notes" defaultValue={lead.notes || ""} rows={3} className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          </label>
          <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black md:col-span-2 md:justify-self-start">
            Save Profile
          </button>
        </form>
      </section>
    </ArtistSigningShell>
  );
}

