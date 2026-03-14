import { ArtistSigningShell } from "@/components/signing/artist-signing-shell";
import { createPortalMessageAction } from "@/lib/actions/signing";
import { requireArtistPortalBundle } from "@/lib/signing/page";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ArtistMessagesPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const { leadId, bundle } = await requireArtistPortalBundle();
  const messages = bundle.messages;

  return (
    <ArtistSigningShell title="Messages" subtitle="Secure notices and direct communication with EM Records signing operations.">
      {flashStatus && flashMessage ? (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-sm",
            flashStatus === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          ].join(" ")}
        >
          {decodeURIComponent(flashMessage)}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">Send Message</h2>
        <form action={createPortalMessageAction} className="mt-4 grid gap-3">
          <input type="hidden" name="redirectTo" value="/dashboard/signing/messages" />
          <input type="hidden" name="lead_id" value={leadId} />
          <input name="subject" placeholder="Subject" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="body" rows={4} required placeholder="Write your message to EM Records..." className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <button type="submit" className="w-fit rounded-full border border-gold bg-gold px-6 py-2.5 text-xs uppercase tracking-[0.18em] text-black">
            Send
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">Conversation</h2>
        <div className="mt-4 space-y-3">
          {messages.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/60">No messages yet.</p> : null}
          {messages.map((message) => (
            <article key={message.id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-gold">{new Date(message.createdAt).toLocaleString()}</p>
              {message.subject ? <p className="mt-1 text-sm font-semibold text-white">{message.subject}</p> : null}
              <p className="mt-1 text-sm text-white/75">{message.body}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-white/50">
                Recipient: {message.recipientRole} · Status: {message.status}
              </p>
            </article>
          ))}
        </div>
      </section>
    </ArtistSigningShell>
  );
}

