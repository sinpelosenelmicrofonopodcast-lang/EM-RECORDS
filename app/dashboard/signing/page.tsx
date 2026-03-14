import Link from "next/link";
import { ArtistSigningShell } from "@/components/signing/artist-signing-shell";
import { StatusBadge } from "@/components/signing/status-badge";
import { markNotificationReadAction } from "@/lib/actions/signing";
import { requireArtistPortalBundle } from "@/lib/signing/page";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ArtistSigningDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const { bundle, notifications } = await requireArtistPortalBundle();
  const lead = bundle.lead!;
  const latestContract = bundle.contracts[0] ?? null;
  const completedTasks = bundle.tasks.filter((task) => task.completed).length;
  const completion = bundle.tasks.length > 0 ? Math.round((completedTasks / bundle.tasks.length) * 100) : 0;

  return (
    <ArtistSigningShell
      title="Dashboard"
      subtitle="Track agreement progress, onboarding completion, and communication with EM Records."
      rightSlot={latestContract ? <StatusBadge status={latestContract.status} /> : null}
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
          ["Offer Status", lead.status.replaceAll("_", " ")],
          ["Onboarding Completion", `${completion}%`],
          ["Documents Uploaded", String(bundle.documents.length)]
        ].map(([label, value]) => (
          <article key={String(label)} className="premium-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/55">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-lg font-semibold text-white">Deal Summary</h2>
          {bundle.offers[0] ? (
            <div className="mt-3 space-y-2 text-sm text-white/75">
              <p>
                Split: <span className="text-white">{bundle.offers[0].royaltySplitLabel}% Label / {bundle.offers[0].royaltySplitArtist}% Artist</span>
              </p>
              <p>
                Term: <span className="text-white">{bundle.offers[0].termDescription || `${bundle.offers[0].termMonths ?? 24} months`}</span>
              </p>
              <p>
                Territory: <span className="text-white">{bundle.offers[0].territory}</span>
              </p>
              <p>
                Advance: <span className="text-white">{bundle.offers[0].advanceAmount != null ? `$${bundle.offers[0].advanceAmount.toLocaleString("en-US")}` : "No advance"}</span>
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/65">No active offer has been assigned yet.</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/dashboard/signing/agreement" className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
              Open My Agreement
            </Link>
            <Link href="/dashboard/signing/checklist" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/70">
              Continue Onboarding
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-lg font-semibold text-white">Notices</h2>
          <div className="mt-3 space-y-3">
            {notifications.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/60">No notices yet.</p> : null}
            {notifications.slice(0, 6).map((notification) => {
              const actionUrl = typeof notification.metadata.actionUrl === "string" ? notification.metadata.actionUrl : null;
              const actionLabel = typeof notification.metadata.actionLabel === "string" ? notification.metadata.actionLabel : "Open";

              return (
                <div key={notification.id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-gold">{new Date(notification.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-sm font-medium text-white">{notification.title}</p>
                  <p className="mt-1 text-sm text-white/70">{notification.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {actionUrl ? (
                      <Link href={actionUrl} className="text-xs uppercase tracking-[0.14em] text-gold hover:underline">
                        {actionLabel}
                      </Link>
                    ) : null}
                    {!notification.readAt ? (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="redirectTo" value="/dashboard/signing" />
                        <input type="hidden" name="notification_id" value={notification.id} />
                        <button type="submit" className="text-xs uppercase tracking-[0.14em] text-gold hover:underline">
                          Mark as read
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">Royalty / Payment</h2>
        <p className="mt-2 text-sm text-white/70">
          This section is reserved for royalty statements and payment disbursements in the next product phase.
        </p>
      </section>
    </ArtistSigningShell>
  );
}
