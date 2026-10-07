import { AdminShell } from "@/components/admin/admin-shell";
import {
  adminReplyBeatInquiryAction,
  adminUpdateBeatInquiryStatusAction
} from "@/lib/actions/beat-inquiries";
import { requireAdminPage } from "@/lib/auth";
import { getBeatInquiriesAdmin } from "@/lib/beat-inquiries";

const STATUS_OPTIONS = ["new", "in_review", "awaiting_customer", "negotiating", "closed", "declined"] as const;

export default async function AdminBeatRequestsPage() {
  await requireAdminPage();
  const inquiries = await getBeatInquiriesAdmin();

  return (
    <AdminShell>
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Beat Sales</p>
        <h1 className="mt-3 font-display text-4xl text-white">Beat Requests</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          Manual beat licensing inbox while automated PayPal checkout remains disabled.
        </p>
      </header>

      <section className="space-y-5">
        {inquiries.length === 0 ? (
          <p className="rounded-2xl border border-white/10 p-5 text-sm text-white/60">No beat requests yet.</p>
        ) : (
          inquiries.map((inquiry) => (
            <article key={inquiry.id} className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">{inquiry.beatTitle}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{inquiry.requesterName}</h2>
                  <a href={"mailto:" + inquiry.requesterEmail} className="mt-1 inline-block text-sm text-white/65 hover:text-gold">
                    {inquiry.requesterEmail}
                  </a>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/45">
                    {inquiry.licenseType} · {inquiry.status.replaceAll("_", " ")} · {new Date(inquiry.lastMessageAt).toLocaleString()}
                  </p>
                </div>

                <form action={adminUpdateBeatInquiryStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="inquiryId" value={inquiry.id} />
                  <select name="status" defaultValue={inquiry.status} className="rounded-lg border border-white/20 bg-black px-3 py-2 text-xs text-white">
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                  </select>
                  <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/75 hover:border-gold hover:text-gold">
                    Update
                  </button>
                </form>
              </div>

              <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                {inquiry.messages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      "rounded-xl border p-4 " +
                      (message.senderKind === "staff" ? "border-gold/25 bg-gold/[0.06]" : "border-white/10 bg-black/40")
                    }
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                      {message.senderKind === "staff" ? "EM Records" : inquiry.requesterName} · {new Date(message.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{message.body}</p>
                  </div>
                ))}
              </div>

              {inquiry.status !== "closed" && inquiry.status !== "declined" ? (
                <form action={adminReplyBeatInquiryAction} className="mt-5">
                  <input type="hidden" name="inquiryId" value={inquiry.id} />
                  <textarea
                    name="message"
                    required
                    maxLength={5000}
                    rows={4}
                    placeholder="Reply to this customer..."
                    className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                  />
                  <button type="submit" className="mt-3 rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black">
                    Reply
                  </button>
                </form>
              ) : null}
            </article>
          ))
        )}
      </section>
    </AdminShell>
  );
}
