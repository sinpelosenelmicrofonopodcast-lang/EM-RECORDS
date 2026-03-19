import { AdminShell } from "@/components/admin/admin-shell";
import { runGrowthAutomationAction } from "@/modules/growth-engine/actions";
import { requireGrowthPageAccess } from "@/modules/growth-engine/auth";
import { getGrowthEngineDashboardData } from "@/modules/growth-engine/service";

export default async function AdminGrowthEnginePage() {
  const access = await requireGrowthPageAccess("admin");
  const data = await getGrowthEngineDashboardData();

  return (
    <AdminShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Growth Intelligence</p>
          <h1 className="mt-3 font-display text-4xl text-white">Growth Engine</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/65">
            Monitorea ingestion, analitica, aprendizaje y automatizaciones desde una sola capa. Aqui vemos si el sistema esta
            aprendiendo bien, generando suficiente output y publicando sin castigar a un solo artista.
          </p>
        </div>

        {access.canManageAutomation ? (
          <form action={runGrowthAutomationAction}>
            <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
              Run Automation
            </button>
          </form>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Posts Created</p>
          <p className="mt-2 font-display text-3xl text-white">{data.analytics.postsCreated}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Posts Published</p>
          <p className="mt-2 font-display text-3xl text-white">{data.analytics.postsPublished}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Avg Engagement</p>
          <p className="mt-2 font-display text-3xl text-white">{data.analytics.averageEngagement.toFixed(2)}</p>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Automation State</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Enabled</p>
              <p className="mt-2 text-lg text-white">{data.settings.enabled ? "Yes" : "No"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Posts / day</p>
              <p className="mt-2 text-lg text-white">{data.settings.postsPerDay}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Tone</p>
              <p className="mt-2 text-lg text-white">{data.settings.tone}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Best windows</p>
              <p className="mt-2 text-lg text-white">{data.settings.bestPostingWindows.join(", ")}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Best Content Types</p>
          <div className="mt-4 space-y-3">
            {data.topFormats.map((format) => (
              <div key={format.label} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                <p className="text-sm text-white">{format.label}</p>
                <p className="font-display text-xl text-gold">{format.score.toFixed(2)}</p>
              </div>
            ))}
            {data.topFormats.length === 0 ? <p className="text-sm text-white/55">No format winners yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Best Times</p>
          <div className="mt-4 space-y-3">
            {data.bestTimes.map((time) => (
              <div key={`${time.hour}-${time.score}`} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                <p className="text-sm text-white">{time.hour}:00</p>
                <p className="font-display text-xl text-gold">{time.score.toFixed(2)}</p>
              </div>
            ))}
            {data.bestTimes.length === 0 ? <p className="text-sm text-white/55">No winning time blocks yet.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Recent Runs</p>
          <div className="mt-4 space-y-3">
            {data.recentRuns.map((run) => (
              <div key={run.id} className="rounded-xl border border-white/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white">{run.triggerType}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">{run.status}</p>
                </div>
                <p className="mt-2 text-xs text-white/45">{new Date(run.startedAt).toLocaleString()}</p>
              </div>
            ))}
            {data.recentRuns.length === 0 ? <p className="text-sm text-white/55">No runs captured yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Learning System</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.learningMemory.map((memory) => (
            <article key={memory.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gold">{memory.patternType}</p>
              <p className="mt-2 text-sm text-white">{memory.pattern}</p>
              <p className="mt-2 text-xs text-white/45">Confidence {memory.confidenceScore.toFixed(2)}</p>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
