import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { getSiteAnalyticsAdmin } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function AdminAnalyticsPage() {
  await requireAdminPage();
  const analytics = await getSiteAnalyticsAdmin();

  return (
    <AdminShell>
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Audience Analytics</p>
        <h1 className="mt-3 font-display text-4xl text-white">Engagement</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Window</p>
          <p className="mt-2 font-display text-3xl text-white">{analytics.windowDays}d</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Total Events</p>
          <p className="mt-2 font-display text-3xl text-white">{analytics.totalEvents}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Unique Pages</p>
          <p className="mt-2 font-display text-3xl text-white">{analytics.uniquePages}</p>
        </article>
      </div>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Top Events</p>
          <div className="mt-4 space-y-2">
            {analytics.topEvents.length === 0 ? (
              <p className="text-sm text-white/55">No data yet.</p>
            ) : (
              analytics.topEvents.map((event) => (
                <div key={event.eventName} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                  <div>
                    <p className="text-sm text-white">{event.eventName}</p>
                    <p className="text-xs text-white/45">{event.lastSeenAt ? formatDate(event.lastSeenAt) : "-"}</p>
                  </div>
                  <p className="font-display text-xl text-gold">{event.total}</p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Top Pages</p>
          <div className="mt-4 space-y-2">
            {analytics.topPages.length === 0 ? (
              <p className="text-sm text-white/55">No data yet.</p>
            ) : (
              analytics.topPages.map((page) => (
                <div key={page.path} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                  <p className="max-w-[80%] truncate text-sm text-white">{page.path}</p>
                  <p className="font-display text-xl text-gold">{page.total}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Recent Events</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="text-xs uppercase tracking-[0.14em] text-white/45">
              <tr>
                <th className="py-2">Event</th>
                <th className="py-2">Path</th>
                <th className="py-2">Locale</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentEvents.length === 0 ? (
                <tr>
                  <td className="py-3 text-white/55" colSpan={4}>
                    No events tracked yet.
                  </td>
                </tr>
              ) : (
                analytics.recentEvents.map((event) => (
                  <tr key={event.id} className="border-t border-white/10">
                    <td className="py-3">{event.eventName}</td>
                    <td className="max-w-[320px] truncate py-3">{event.path ?? "-"}</td>
                    <td className="py-3">{event.locale ?? "-"}</td>
                    <td className="py-3">{formatDate(event.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
