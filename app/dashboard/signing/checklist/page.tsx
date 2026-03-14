import { ArtistSigningShell } from "@/components/signing/artist-signing-shell";
import { toggleOnboardingTaskAction } from "@/lib/actions/signing";
import { requireArtistPortalBundle } from "@/lib/signing/page";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ArtistChecklistPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const { leadId, bundle } = await requireArtistPortalBundle();
  const completed = bundle.tasks.filter((task) => task.completed).length;
  const completion = bundle.tasks.length ? Math.round((completed / bundle.tasks.length) * 100) : 0;

  return (
    <ArtistSigningShell title="Onboarding Checklist" subtitle="Complete required onboarding milestones to finalize your EM Records launch setup.">
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
        <p className="text-xs uppercase tracking-[0.16em] text-gold">Completion</p>
        <p className="mt-2 text-3xl font-semibold text-white">{completion}%</p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gold transition-all" style={{ width: `${completion}%` }} />
        </div>
      </section>

      <section className="grid gap-3">
        {bundle.tasks.map((task) => (
          <article key={task.id} className="premium-card rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{task.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/55">{task.taskKey.replaceAll("_", " ")}</p>
              </div>
              <form action={toggleOnboardingTaskAction} className="flex items-center gap-2">
                <input type="hidden" name="redirectTo" value="/dashboard/signing/checklist" />
                <input type="hidden" name="lead_id" value={leadId} />
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="completed" value={task.completed ? "false" : "true"} />
                <button
                  type="submit"
                  className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.14em] ${
                    task.completed ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/20 text-white/75"
                  }`}
                >
                  {task.completed ? "Completed" : "Mark Complete"}
                </button>
              </form>
            </div>
            {task.completedAt ? <p className="mt-2 text-xs text-white/55">Completed at {new Date(task.completedAt).toLocaleString()}</p> : null}
          </article>
        ))}
      </section>
    </ArtistSigningShell>
  );
}

