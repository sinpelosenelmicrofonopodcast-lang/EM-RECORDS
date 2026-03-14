import Link from "next/link";
import { AdminSigningShell } from "@/components/signing/admin-signing-shell";
import { ActivityTimeline } from "@/components/signing/activity-timeline";
import { StatusBadge } from "@/components/signing/status-badge";
import { createArtistLeadAction, updateArtistLeadStageAction } from "@/lib/actions/signing";
import { getSigningAdminStats, listArtistLeads, listAuditLogs } from "@/lib/signing/service";
import { SIGNING_PIPELINE_STAGES } from "@/lib/signing/constants";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSigningOverviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const [stats, leads, logs] = await Promise.all([getSigningAdminStats(), listArtistLeads(), listAuditLogs(40)]);

  const groupedLeads = SIGNING_PIPELINE_STAGES.reduce<Record<string, typeof leads>>((acc, stage) => {
    acc[stage] = leads.filter((lead) => lead.status === stage);
    return acc;
  }, {});

  const timeline = logs.map((item) => ({
    id: item.id,
    at: item.createdAt,
    label: item.action.replaceAll("_", " "),
    detail: `${item.entityType} · ${item.entityId}`
  }));

  return (
    <AdminSigningShell
      title="Signing Overview"
      subtitle="Major-label style pipeline for artist intake, deal execution, and legally serious digital signing workflow."
    >
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

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Pending Review", stats.pendingReview],
          ["Offers Sent", stats.offersSent],
          ["Waiting Artist Signature", stats.waitingArtistSignature],
          ["Waiting Label Signature", stats.waitingLabelSignature],
          ["Fully Executed This Month", stats.fullyExecutedThisMonth],
          ["Expired / Declined", stats.expiredOrDeclined]
        ].map(([label, value]) => (
          <article key={String(label)} className="premium-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/55">{label}</p>
            <p className="mt-2 font-display text-3xl text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Create Artist Lead</h2>
            <Link href="/admin/signing/artists" className="text-xs uppercase tracking-[0.16em] text-gold hover:underline">
              Open full artists view
            </Link>
          </div>
          <form action={createArtistLeadAction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="redirectTo" value="/admin/signing" />
            <input name="legal_name" required placeholder="Legal name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <input name="stage_name" placeholder="Stage name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <input name="email" type="email" required placeholder="Email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <input name="phone" placeholder="Phone" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <input name="country" placeholder="Country" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <input name="state" placeholder="State" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <input name="date_of_birth" type="date" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <select name="pro_affiliation" defaultValue="none" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
              <option value="none">PRO affiliation</option>
              <option value="BMI">BMI</option>
              <option value="ASCAP">ASCAP</option>
              <option value="SESAC">SESAC</option>
            </select>
            <input name="ipi_number" placeholder="IPI Number" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <input name="social_instagram" placeholder="Instagram URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
            <textarea name="notes" rows={2} placeholder="Notes" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
            <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black md:col-span-2 md:justify-self-start">
              Create Lead
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <div className="mt-4">
            <ActivityTimeline events={timeline.slice(0, 10)} />
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Pipeline Board</h2>
          <Link href="/admin/signing/contracts" className="text-xs uppercase tracking-[0.16em] text-gold hover:underline">
            Contracts
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {SIGNING_PIPELINE_STAGES.map((stage) => (
            <div key={stage} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <StatusBadge status={stage} />
                <span className="text-xs text-white/55">{groupedLeads[stage].length}</span>
              </div>

              <div className="space-y-2">
                {groupedLeads[stage].slice(0, 6).map((lead) => (
                  <article key={lead.id} className="rounded-lg border border-white/10 bg-black/50 p-3">
                    <p className="text-sm font-semibold text-white">{lead.stageName || lead.legalName}</p>
                    <p className="mt-1 text-xs text-white/60">{lead.email}</p>

                    <form action={updateArtistLeadStageAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="redirectTo" value="/admin/signing" />
                      <input type="hidden" name="lead_id" value={lead.id} />
                      <select name="status" defaultValue={lead.status} className="w-full rounded-md border border-white/15 bg-black px-2 py-1 text-[11px] text-white">
                        {SIGNING_PIPELINE_STAGES.map((item) => (
                          <option key={item} value={item}>
                            {item.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-md border border-gold px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-gold">
                        Save
                      </button>
                    </form>
                  </article>
                ))}
                {groupedLeads[stage].length === 0 ? <p className="rounded-lg border border-white/10 px-3 py-4 text-xs text-white/50">No leads in this stage.</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminSigningShell>
  );
}

