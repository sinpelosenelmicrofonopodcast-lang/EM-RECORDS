import { AdminShell } from "@/components/admin/admin-shell";
import { LiveSalesTable } from "@/components/admin/live-sales-table";
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
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">EM Control Room</p>
        <h1 className="mt-3 font-display text-4xl text-white">Dashboard</h1>
      </header>

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
          <article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
            <p className="mt-2 font-display text-3xl text-white">{value}</p>
          </article>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Real-time Ticket Sales</p>
        <LiveSalesTable initialOrders={orders} />
      </section>
    </AdminShell>
  );
}
