import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { generateMonthlyReportPdfAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getAuditByArtistId, getReportsByArtistId } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubReportsPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist } = await requireArtistPageAccess(artistSlug);
  const [reports, auditEvents] = await Promise.all([getReportsByArtistId(artist.id), getAuditByArtistId(artist.id, 50)]);

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="reports"
        eyebrow="Reports"
        title="Monthly Artist Report"
        description="Generate versioned PDF reports with releases, bookings, tasks, registration status and ready score trends."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <form action={generateMonthlyReportPdfAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="artistId" value={artist.id} />
          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-white/55">Month</label>
            <input
              name="month"
              defaultValue={new Date().toISOString().slice(0, 7)}
              placeholder="YYYY-MM"
              className="mt-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
            />
          </div>
          <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
            Generate Monthly Report PDF
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Generated reports</p>
        <div className="mt-4 space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="flex flex-wrap items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3">
              <p className="text-sm text-white/80">
                {report.month} · v{report.version}
              </p>
              <a
                href={`/api/artist-hub/download?reportId=${report.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/75"
              >
                Download
              </a>
            </div>
          ))}
          {reports.length === 0 ? <p className="text-sm text-white/60">No reports generated yet.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Audit timeline</p>
        <div className="mt-4 space-y-2">
          {auditEvents.slice(0, 25).map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
              <p className="text-sm text-white/80">
                {event.action} · {event.entityType}
              </p>
              <p className="text-xs text-white/50">{new Date(event.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {auditEvents.length === 0 ? <p className="text-sm text-white/60">No audit events yet.</p> : null}
        </div>
      </section>
    </>
  );
}
