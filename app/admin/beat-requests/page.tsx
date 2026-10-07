import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { MessageBody } from "@/components/beats/message-body";
import {
  adminMarkBeatInquiryPaidAction,
  adminReplyBeatInquiryAction,
  adminUpdateBeatInquiryStatusAction
} from "@/lib/actions/beat-inquiries";
import { requireAdminPage } from "@/lib/auth";
import { getBeatInquiriesAdmin, type BeatInquiryThread } from "@/lib/beat-inquiries";

const STATUS_OPTIONS = ["new", "in_review", "awaiting_customer", "negotiating", "paid", "fulfilled", "closed", "declined"] as const;
const LICENSE_OPTIONS = ["basic", "standard", "premium", "exclusive"] as const;

function dollars(cents:number|null|undefined){
  return (Number(cents||0)/100).toFixed(2);
}

function priceFor(inquiry:BeatInquiryThread){
  if(inquiry.licenseType==="basic") return inquiry.beatPriceBasic||0;
  if(inquiry.licenseType==="standard") return inquiry.beatPriceStandard||0;
  if(inquiry.licenseType==="premium") return inquiry.beatPricePremium||0;
  if(inquiry.licenseType==="exclusive") return inquiry.beatPriceExclusive||0;
  return 0;
}

export default async function AdminBeatRequestsPage() {
  await requireAdminPage();
  const inquiries = await getBeatInquiriesAdmin();

  return (
    <AdminShell>
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Beat Sales</p>
        <h1 className="mt-3 font-display text-4xl text-white">Beat Requests & Delivery</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/60">
          Negotiate inside the private thread. When payment arrives outside the site, record it here and EM Records creates a protected delivery link automatically.
        </p>
      </header>

      <section className="space-y-5">
        {inquiries.length === 0 ? (
          <p className="rounded-2xl border border-white/10 p-5 text-sm text-white/60">No beat requests yet.</p>
        ) : (
          inquiries.map((inquiry) => {
            const suggestedCents=priceFor(inquiry);
            return (
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

              <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/50 sm:grid-cols-4">
                <span>Basic: {inquiry.beatPriceBasic ? "$"+dollars(inquiry.beatPriceBasic) : "Contact"}</span>
                <span>Standard: {inquiry.beatPriceStandard ? "$"+dollars(inquiry.beatPriceStandard) : "Contact"}</span>
                <span>Premium: {inquiry.beatPricePremium ? "$"+dollars(inquiry.beatPricePremium) : "Contact"}</span>
                <span>Exclusive: {inquiry.beatPriceExclusive ? "$"+dollars(inquiry.beatPriceExclusive) : "Contact"}</span>
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
                    <MessageBody text={message.body} />
                  </div>
                ))}
              </div>

              {inquiry.deliveryPath ? (
                <section className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/70">Delivered</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-white/70">
                      <p>Paid: {inquiry.paidAmount ? "$"+dollars(inquiry.paidAmount) : "$0.00"} · {inquiry.paymentMethod || "external"}</p>
                      <p className="mt-1 text-xs text-white/40">
                        Downloads {inquiry.deliveryDownloadCount || 0}/{inquiry.deliveryMaxDownloads || 0}
                        {inquiry.deliveryExpiresAt ? " · expires " + new Date(inquiry.deliveryExpiresAt).toLocaleString() : ""}
                      </p>
                    </div>
                    <Link href={inquiry.deliveryPath} target="_blank" className="rounded-full border border-emerald-300/30 px-4 py-2 text-xs uppercase tracking-[0.14em] text-emerald-100">
                      Open delivery
                    </Link>
                  </div>
                </section>
              ) : (
                <section className="mt-5 rounded-2xl border border-gold/25 bg-gold/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-gold">External payment + secure delivery</p>
                  <p className="mt-2 text-xs leading-relaxed text-white/50">
                    Use this only after you have actually received the payment. It records the sale, creates a private expiring download and posts it into this customer's thread.
                  </p>
                  {!inquiry.beatHasPrivateMaster ? (
                    <p className="mt-3 rounded-xl border border-red-300/20 bg-red-300/[0.05] p-3 text-xs text-red-100/70">
                      This beat cannot be delivered yet because its master is not stored in the private beat bucket.
                    </p>
                  ) : (
                    <form action={adminMarkBeatInquiryPaidAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <input type="hidden" name="inquiryId" value={inquiry.id}/>
                      <select name="licenseType" defaultValue={LICENSE_OPTIONS.includes(inquiry.licenseType as any)?inquiry.licenseType:"basic"} className="rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white">
                        {LICENSE_OPTIONS.map((license)=><option key={license} value={license}>{license}</option>)}
                      </select>
                      <input name="amount" type="number" min="0" step="0.01" defaultValue={suggestedCents ? dollars(suggestedCents) : ""} placeholder="Amount paid" className="rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white"/>
                      <select name="paymentMethod" defaultValue="zelle" className="rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white">
                        <option value="zelle">Zelle</option>
                        <option value="cashapp">Cash App</option>
                        <option value="paypal_external">PayPal outside site</option>
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="other">Other</option>
                      </select>
                      <select name="expiresDays" defaultValue="14" className="rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white">
                        <option value="7">Expires 7 days</option>
                        <option value="14">Expires 14 days</option>
                        <option value="30">Expires 30 days</option>
                      </select>
                      <select name="maxDownloads" defaultValue="3" className="rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white">
                        <option value="1">1 download</option>
                        <option value="3">3 downloads</option>
                        <option value="5">5 downloads</option>
                        <option value="10">10 downloads</option>
                      </select>
                      <button className="rounded-xl bg-gold px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-black">Mark paid & deliver</button>
                    </form>
                  )}
                </section>
              )}

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
          )})
        )}
      </section>
    </AdminShell>
  );
}
