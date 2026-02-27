import { AdminShell } from "@/components/admin/admin-shell";
import { upsertEventAction } from "@/lib/actions/admin";
import { requireAdminPage } from "@/lib/auth";
import { getUpcomingEvents } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function AdminEventsPage() {
  await requireAdminPage();
  const events = await getUpcomingEvents();

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Events Management</p>
        <h1 className="mt-2 font-display text-4xl text-white">Events & Tickets</h1>
      </div>

      <form action={upsertEventAction} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:grid-cols-2">
        <input name="title" required placeholder="Event title" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
        <input name="venue" required placeholder="Venue" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
        <input name="city" required placeholder="City" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
        <input name="country" required placeholder="Country" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
        <input type="datetime-local" name="startsAt" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
        <select name="status" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
          <option value="upcoming">upcoming</option>
          <option value="sold_out">sold_out</option>
          <option value="completed">completed</option>
        </select>
        <input name="stripePriceId" placeholder="Stripe price_id" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
        <input name="ticketUrl" placeholder="External ticket URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
        <input name="sponsors" placeholder="Sponsors (comma separated)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
        <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
          Save Event
        </button>
      </form>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Upcoming</p>
        <div className="mt-4 space-y-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80">
              {event.title} · {event.city} · {formatDate(event.startsAt)}
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
