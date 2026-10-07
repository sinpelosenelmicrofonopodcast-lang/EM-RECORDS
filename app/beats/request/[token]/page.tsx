import type { Metadata } from "next";
import Link from "next/link";
import { MessageBody } from "@/components/beats/message-body";
import { notFound } from "next/navigation";
import { replyBeatInquiryAction } from "@/lib/actions/beat-inquiries";
import { getBeatInquiryThreadByToken } from "@/lib/beat-inquiries";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Beat Request",
  description: "Private EM Records beat request conversation.",
  path: "/beats/request",
  noIndex: true
});

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ created?: string; sent?: string }>;
};

export default async function BeatRequestThreadPage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const thread = await getBeatInquiryThreadByToken(token);
  if (!thread) notFound();

  const closed = thread.status === "closed" || thread.status === "declined";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10">
      <Link href="/beats" className="text-xs uppercase tracking-[0.18em] text-gold hover:underline">← Back to beats</Link>

      <header className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Private Beat Request</p>
        <h1 className="mt-3 font-display text-4xl text-white">{thread.beatTitle}</h1>
        <p className="mt-3 text-sm text-white/65">
          {thread.requesterName} · {thread.requesterEmail} · {thread.licenseType} license
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/45">Status: {thread.status.replaceAll("_", " ")}</p>
      </header>

      {query.created === "1" ? (
        <div className="mt-5 rounded-2xl border border-gold/35 bg-gold/10 p-4 text-sm text-white/80">
          Request received. Save this private link — this is where EM Records will continue the conversation with you.
        </div>
      ) : null}

      {query.sent === "1" ? (
        <div className="mt-5 rounded-2xl border border-white/15 bg-white/[0.03] p-4 text-sm text-white/70">Message sent.</div>
      ) : null}

      <section className="mt-8 space-y-4">
        {thread.messages.map((message) => (
          <article
            key={message.id}
            className={
              "max-w-[88%] rounded-2xl border p-4 " +
              (message.senderKind === "staff"
                ? "ml-auto border-gold/35 bg-gold/10"
                : "border-white/10 bg-white/[0.03]")
            }
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">
              {message.senderKind === "staff" ? "EM Records" : "You"} · {new Date(message.createdAt).toLocaleString()}
            </p>
            <MessageBody text={message.body} />
          </article>
        ))}
      </section>

      {!closed ? (
        <form action={replyBeatInquiryAction} className="mt-8 rounded-3xl border border-white/10 bg-black/60 p-5">
          <input type="hidden" name="token" value={token} />
          <label className="text-xs uppercase tracking-[0.18em] text-gold" htmlFor="message">Reply</label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={5000}
            rows={5}
            className="mt-3 w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            placeholder="Write your message to EM Records..."
          />
          <button type="submit" className="mt-4 rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">
            Send message
          </button>
        </form>
      ) : (
        <p className="mt-8 rounded-2xl border border-white/10 p-4 text-sm text-white/55">This conversation is closed.</p>
      )}
    </div>
  );
}
