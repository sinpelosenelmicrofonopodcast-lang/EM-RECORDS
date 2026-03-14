import Link from "next/link";
import { ArtistSigningShell } from "@/components/signing/artist-signing-shell";
import { SignatureCapture } from "@/components/signing/signature-capture";
import { StatusBadge } from "@/components/signing/status-badge";
import { ActivityTimeline } from "@/components/signing/activity-timeline";
import { artistPortalSignContractAction } from "@/lib/actions/signing";
import { requireArtistPortalBundle } from "@/lib/signing/page";
import { createSignedUrlFromStoragePath, getContractBundle } from "@/lib/signing/service";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ArtistAgreementPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";
  const { ctx, bundle } = await requireArtistPortalBundle();
  const contract = bundle.contracts[0] ?? null;

  if (!contract) {
    return (
      <ArtistSigningShell title="My Agreement" subtitle="Your contract appears here once EM Records sends an offer.">
        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/65">No contract is currently assigned to your profile.</p>
      </ArtistSigningShell>
    );
  }

  const detail = await getContractBundle(contract.id);
  const draftUrl = await createSignedUrlFromStoragePath(contract.draftPdfPath);
  const executedUrl = await createSignedUrlFromStoragePath(contract.executedPdfPath);
  const canSign = contract.status === "offer_sent" || contract.status === "artist_viewed_offer" || contract.status === "draft";

  const timeline = detail.events.map((event) => ({
    id: event.id,
    at: event.createdAt,
    label: event.eventType.replaceAll("_", " "),
    detail: `${event.signerRole ?? "system"} · ${event.ipAddress ?? "no IP"}`
  }));

  return (
    <ArtistSigningShell title="My Agreement" subtitle="Review your contract terms and complete your electronic signature workflow.">
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

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={contract.status} />
            <p className="text-xs uppercase tracking-[0.14em] text-white/55">Version {contract.contractVersionNumber}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {draftUrl ? (
              <a
                href={draftUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-white/75 hover:border-gold hover:text-gold"
              >
                Download Draft PDF
              </a>
            ) : null}
            {executedUrl ? (
              <a href={executedUrl} target="_blank" rel="noreferrer" className="rounded-full border border-gold px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-gold">
                Download Executed PDF
              </a>
            ) : null}
            <Link href="/dashboard/signing/documents" className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-white/75">
              Upload Documents
            </Link>
          </div>

          <div className="prose prose-invert mt-5 max-w-none rounded-xl border border-white/10 bg-black/40 p-5 text-sm text-white/85">
            {detail.version?.renderedHtml ? <div dangerouslySetInnerHTML={{ __html: detail.version.renderedHtml }} /> : <p>Rendered contract content is unavailable.</p>}
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Sign Agreement</h2>
            {canSign ? (
              <form action={artistPortalSignContractAction} className="mt-3 space-y-3">
                <input type="hidden" name="redirectTo" value="/dashboard/signing/agreement" />
                <input type="hidden" name="contract_id" value={contract.id} />
                <SignatureCapture signerNameDefault={bundle.lead?.legalName} signerEmailDefault={ctx.email || bundle.lead?.email || ""} />
                <button type="submit" className="w-full rounded-full border border-gold bg-gold px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-black">
                  Sign Agreement
                </button>
              </form>
            ) : (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/65">
                Signature step is complete. Current status: <span className="text-white">{contract.status.replaceAll("_", " ")}</span>
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Activity Timeline</h2>
            <div className="mt-3">
              <ActivityTimeline events={timeline} />
            </div>
          </article>
        </div>
      </section>
    </ArtistSigningShell>
  );
}

