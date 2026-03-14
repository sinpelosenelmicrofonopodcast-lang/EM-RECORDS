import { notFound } from "next/navigation";
import { SignatureCapture } from "@/components/signing/signature-capture";
import { StatusBadge } from "@/components/signing/status-badge";
import { artistSignContractWithInviteAction, markOfferViewedAction } from "@/lib/actions/signing";
import { createSignedUrlFromStoragePath, getContractBundle, listArtistLeads } from "@/lib/signing/service";
import { hashInviteToken } from "@/lib/signing/token";
import { createServiceClient } from "@/lib/supabase/service";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    email?: string;
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function InviteSigningPage({ params, searchParams }: Props) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const flashStatus = query.status === "success" || query.status === "error" ? query.status : null;
  const flashMessage = typeof query.message === "string" ? query.message : "";
  const email = String(query.email ?? "").trim().toLowerCase();

  const service = createServiceClient();
  const tokenHash = hashInviteToken(token);
  const { data: invite } = await service.from("invite_tokens").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (!invite) {
    notFound();
  }

  const inviteExpired = new Date(invite.expires_at) < new Date();
  const emailMatches = email ? String(invite.email).toLowerCase() === email : false;
  const canProceed = emailMatches && !invite.revoked_at && !inviteExpired;

  const contractBundle = canProceed ? await getContractBundle(String(invite.contract_id)) : null;
  const contract = contractBundle?.contract ?? null;
  const version = contractBundle?.version ?? null;

  if (!contract && canProceed) {
    notFound();
  }

  const leads = canProceed ? await listArtistLeads() : [];
  const lead = canProceed ? leads.find((item) => item.id === contract?.artistLeadId) : null;
  const draftUrl = canProceed ? await createSignedUrlFromStoragePath(contract?.draftPdfPath) : null;
  const executedUrl = canProceed ? await createSignedUrlFromStoragePath(contract?.executedPdfPath) : null;

  return (
    <div className="mx-auto min-h-[80vh] w-full max-w-5xl px-5 py-10 md:px-8">
      <header className="premium-surface rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-gold">EM Records Secure Signing</p>
        <h1 className="mt-3 font-display text-4xl text-white">Artist Agreement Portal</h1>
        <p className="mt-2 text-sm text-white/70">Review your agreement, confirm electronic consent, and complete your signature workflow.</p>
      </header>

      {flashStatus && flashMessage ? (
        <div
          className={[
            "mt-4 rounded-xl border px-4 py-3 text-sm",
            flashStatus === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          ].join(" ")}
        >
          {decodeURIComponent(flashMessage)}
        </div>
      ) : null}

      {!emailMatches ? (
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-xl font-semibold text-white">Verify your email</h2>
          <p className="mt-2 text-sm text-white/70">Enter the email that received this signing invite.</p>
          <form method="get" className="mt-4 flex flex-wrap gap-3">
            <input
              type="email"
              name="email"
              required
              placeholder="artist@email.com"
              className="min-w-[260px] flex-1 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
            />
            <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black">
              Verify
            </button>
          </form>
          {email ? <p className="mt-3 text-sm text-rose-300">The email does not match the invite recipient.</p> : null}
        </section>
      ) : null}

      {emailMatches && invite.revoked_at ? (
        <section className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">This invite has been revoked by EM Records.</section>
      ) : null}

      {emailMatches && inviteExpired ? (
        <section className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-rose-200">This invite link has expired. Request a new invite from EM Records.</section>
      ) : null}

      {canProceed && contract && version && lead ? (
        <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={contract.status} />
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">Version {contract.contractVersionNumber}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {draftUrl ? (
                <a href={draftUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-white/75">
                  Download Draft PDF
                </a>
              ) : null}
              {executedUrl ? (
                <a href={executedUrl} target="_blank" rel="noreferrer" className="rounded-full border border-gold px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-gold">
                  Download Executed PDF
                </a>
              ) : null}
            </div>

            <div className="prose prose-invert mt-5 max-w-none rounded-xl border border-white/10 bg-black/40 p-5 text-sm text-white/85">
              <div dangerouslySetInnerHTML={{ __html: version.renderedHtml }} />
            </div>
          </article>

          <div className="space-y-5">
            {contract.status === "offer_sent" ? (
              <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Offer Review</h2>
                <p className="mt-2 text-sm text-white/70">Confirm that you reviewed the terms before signing.</p>
                <form action={markOfferViewedAction} className="mt-3">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="email" value={email} />
                  <button type="submit" className="w-full rounded-full border border-gold px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-gold">
                    Mark as Reviewed
                  </button>
                </form>
              </article>
            ) : null}

            <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Artist Signature</h2>
              {invite.used_at || ["artist_signed", "label_counter_signed", "fully_executed", "archived"].includes(contract.status) ? (
                <p className="mt-3 rounded-xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/65">
                  Signature step is complete. Current status: <span className="text-white">{contract.status.replaceAll("_", " ")}</span>
                </p>
              ) : (
                <form action={artistSignContractWithInviteAction} className="mt-3 space-y-3">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="email" value={email} />
                  <SignatureCapture signerNameDefault={lead.legalName} signerEmailDefault={email} />
                  <button type="submit" className="w-full rounded-full border border-gold bg-gold px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-black">
                    Sign Agreement
                  </button>
                </form>
              )}
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Audit Metadata</h2>
              <div className="mt-3 space-y-2 text-sm text-white/75">
                <p>Invite expires: {new Date(invite.expires_at).toLocaleString()}</p>
                <p>Invite status: {invite.revoked_at ? "revoked" : invite.used_at ? "used" : "active"}</p>
                <p>Signer email verified: {email}</p>
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}

