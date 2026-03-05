import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { updateBookingInquiryStatusAction } from "@/lib/actions/admin";
import { getBookingInquiriesAdmin } from "@/lib/queries";

const STATUS_OPTIONS = ["new", "contacted", "negotiating", "confirmed", "closed"] as const;

export default async function AdminBookingInquiriesPage() {
  await requireAdminPage();
  const inquiries = await getBookingInquiriesAdmin();

  return (
    <AdminShell>
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Bookings</p>
        <h1 className="mt-3 font-display text-4xl text-white">Booking Inquiries</h1>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        {inquiries.length === 0 ? (
          <p className="text-sm text-white/65">No booking inquiries yet.</p>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inquiry) => (
              <article key={inquiry.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-gold">{inquiry.artistName || inquiry.artistSlug || "EM Artist"}</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {inquiry.inquiryType} · {inquiry.city || "Unknown city"}
                    </h2>
                    <p className="mt-1 text-sm text-white/70">
                      {inquiry.contactEmail}
                      {inquiry.contactPhone ? ` · ${inquiry.contactPhone}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      {inquiry.dateRange || "No date range"} · {inquiry.budgetRange || "No budget range"}
                    </p>
                    {inquiry.message ? <p className="mt-3 text-sm text-white/75">{inquiry.message}</p> : null}
                    <p className="mt-3 text-xs text-white/45">{new Date(inquiry.createdAt).toLocaleString()}</p>
                  </div>

                  <form action={updateBookingInquiryStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={inquiry.id} />
                    <select name="status" defaultValue={inquiry.status} className="rounded-lg border border-white/20 bg-black px-3 py-2 text-xs text-white">
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/75 hover:border-gold hover:text-gold">
                      Update
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
