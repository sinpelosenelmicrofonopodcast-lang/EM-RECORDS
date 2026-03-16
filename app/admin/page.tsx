import { AdminShell } from "@/components/admin/admin-shell";
import { LiveSalesTable } from "@/components/admin/live-sales-table";
import { PageIntro } from "@/components/shared/page-intro";
import { requireAdminPage } from "@/lib/auth";
import { getAdminMetrics, getTicketOrders } from "@/lib/queries";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const [metrics, orders] = await Promise.all([getAdminMetrics(), getTicketOrders()]);
  const revenue = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    metrics.paidRevenueCents / 100
  );
  const conversion = `${metrics.conversionRate.toFixed(1)}%`;
  const submitToVote = `${metrics.submitToVoteRate.toFixed(1)}%`;

  return (
    <AdminShell>
      <PageIntro
        eyebrow="EM Control Room"
        title="Dashboard"
        description="Operational snapshot for catalog, demand, submissions and revenue. The top layer now prioritizes live signals over decorative admin chrome."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Artists", metrics.artists],
          ["Releases", metrics.releases],
          ["Events", metrics.events],
          ["Pending Demos", metrics.pendingDemos],
          ["Total Demos", metrics.totalDemos],
          ["Next Up Submissions", metrics.nextUpSubmissions],
          ["Next Up Votes", metrics.nextUpVotes],
          ["Ticket Orders", metrics.ticketOrders],
          ["Newsletter", metrics.newsletterSubscribers],
          ["Sponsors", metrics.sponsorApplications],
          ["Paid Revenue", revenue],
          ["Fan Conversion", conversion],
          ["Submit to Vote", submitToVote]
        ].map(([label, value]) => (
          <article key={String(label)} className="metric-card rounded-[26px] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
            <p className="mt-2 font-display text-3xl text-white">{value}</p>
          </article>
        ))}
      </div>

      <section className="app-panel rounded-[28px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Real-time Ticket Sales</p>
            <p className="mt-2 max-w-2xl text-sm text-white/60">Live order feed for events and paid conversions. This stays visible because it informs staffing, promo timing and settlement follow-up.</p>
          </div>
        </div>
        <LiveSalesTable initialOrders={orders} />
      </section>
    </AdminShell>
  );
}
