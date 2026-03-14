import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { fetchGscPerformance } from "@/lib/gsc";
import { getIndexingCandidates, getSeoQueueStats } from "@/lib/seo-queue";
import { createServiceClient } from "@/lib/supabase/service";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export default async function AdminSeoPage() {
  await requireAdminPage();
  const service = createServiceClient();

  const [queue, gsc, indexingCandidates, auditRuns] = await Promise.all([
    getSeoQueueStats(service),
    fetchGscPerformance(28),
    getIndexingCandidates(service),
    service.from("seo_audit_runs").select("id,issues_count,summary,created_at").order("created_at", { ascending: false }).limit(10)
  ]);

  const ctrOpportunities = gsc.topPages
    .filter((row) => row.impressions >= 100 && row.ctr <= 0.02)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 12);

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">SEO Autopilot</p>
        <h1 className="mt-2 font-display text-4xl text-white">Search Console & Indexing</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Queue Pending</p>
          <p className="mt-3 font-display text-4xl text-white">{queue.pending}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Queue Submitted</p>
          <p className="mt-3 font-display text-4xl text-white">{queue.submitted}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Queue Errors</p>
          <p className="mt-3 font-display text-4xl text-white">{queue.error}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Indexing Candidates</p>
          <p className="mt-3 font-display text-4xl text-white">{indexingCandidates.length}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action="/api/seo/process-queue" method="POST">
              <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black">
                Process Queue
              </button>
            </form>
            <form action="/api/seo/submit-sitemaps" method="POST">
              <button type="submit" className="rounded-full border border-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                Submit Sitemap (GSC)
              </button>
            </form>
          </div>
          <p className="mt-3 text-xs text-white/60">
            Use these actions after publishing artists or releases.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">GSC 28d</p>
          {!gsc.configured ? (
            <p className="mt-3 text-sm text-white/70">{gsc.error ?? "Google Search Console is not configured."}</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Clicks</p>
                <p className="mt-1 text-xl text-white">{gsc.summary.clicks}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Impressions</p>
                <p className="mt-1 text-xl text-white">{gsc.summary.impressions}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">CTR</p>
                <p className="mt-1 text-xl text-white">{formatPercent(gsc.summary.ctr)}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Avg Position</p>
                <p className="mt-1 text-xl text-white">{gsc.summary.position.toFixed(2)}</p>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Top Queries</p>
          <div className="mt-4 space-y-2">
            {gsc.topQueries.length === 0 ? (
              <p className="text-sm text-white/65">No data.</p>
            ) : (
              gsc.topQueries.map((row) => (
                <div key={row.query} className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <p className="text-sm text-white">{row.query}</p>
                  <p className="mt-1 text-xs text-white/60">
                    {row.clicks} clicks · {row.impressions} impressions · {formatPercent(row.ctr)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Top Pages</p>
          <div className="mt-4 space-y-2">
            {gsc.topPages.length === 0 ? (
              <p className="text-sm text-white/65">No data.</p>
            ) : (
              gsc.topPages.map((row) => (
                <div key={row.page} className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <p className="truncate text-sm text-white">{row.page}</p>
                  <p className="mt-1 text-xs text-white/60">
                    {row.clicks} clicks · {row.impressions} impressions · {formatPercent(row.ctr)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">CTR Opportunities</p>
          <div className="mt-4 space-y-2">
            {ctrOpportunities.length === 0 ? (
              <p className="text-sm text-white/65">No low-CTR opportunities found.</p>
            ) : (
              ctrOpportunities.map((row) => (
                <div key={row.page} className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <p className="truncate text-sm text-white">{row.page}</p>
                  <p className="mt-1 text-xs text-white/60">
                    {row.impressions} impressions · CTR {formatPercent(row.ctr)}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Indexing Candidates</p>
          <div className="mt-4 space-y-2">
            {indexingCandidates.length === 0 ? (
              <p className="text-sm text-white/65">No candidates. Queue is up to date.</p>
            ) : (
              indexingCandidates.slice(0, 30).map((url) => (
                <div key={url} className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <p className="truncate text-sm text-white">{url}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Queue Errors</p>
        <div className="mt-4 space-y-2">
          {queue.recentErrors.length === 0 ? (
            <p className="text-sm text-white/65">No recent errors.</p>
          ) : (
            queue.recentErrors.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-black/35 p-3">
                <p className="truncate text-sm text-white">{item.url}</p>
                <p className="mt-1 text-xs text-red-300/80">{item.message}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/40">{new Date(item.updatedAt).toLocaleString()}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">SEO Audit Runs</p>
        <div className="mt-4 space-y-2">
          {(auditRuns.data ?? []).length === 0 ? (
            <p className="text-sm text-white/65">No audit runs yet.</p>
          ) : (
            (auditRuns.data ?? []).map((row: any) => (
              <article key={String(row.id)} className="rounded-xl border border-white/10 bg-black/35 p-3">
                <p className="text-sm text-white">{new Date(String(row.created_at)).toLocaleString()}</p>
                <p className="mt-1 text-xs text-white/65">Issues: {Number(row.issues_count ?? 0)}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </AdminShell>
  );
}

