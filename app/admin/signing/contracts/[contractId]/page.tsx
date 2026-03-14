import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSigningShell } from "@/components/signing/admin-signing-shell";
import { ActivityTimeline } from "@/components/signing/activity-timeline";
import { SignatureCapture } from "@/components/signing/signature-capture";
import { StatusBadge } from "@/components/signing/status-badge";
import { countersignContractAction, sendSigningInviteAction } from "@/lib/actions/signing";
import { createSignedUrlFromStoragePath, getContractBundle, listArtistLeads } from "@/lib/signing/service";

type Props = {
  params: Promise<{ contractId: string }>;
  searchParams: Promise<{ status?: string; message?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminContractDetailPage({ params, searchParams }: Props) {
  const [{ contractId }, paramsSearch] = await Promise.all([params, searchParams]);
  const flashStatus = paramsSearch.status === "success" || paramsSearch.status === "error" ? paramsSearch.status : null;
  const flashMessage = typeof paramsSearch.message === "string" ? paramsSearch.message : "";

  const bundle = await getContractBundle(contractId);
  if (!bundle.contract) notFound();

  const leads = await listArtistLeads();
  const lead = leads.find((item) => item.id === bundle.contract?.artistLeadId);
  const draftUrl = await createSignedUrlFromStoragePath(bundle.contract.draftPdfPath);
  const executedUrl = await createSignedUrlFromStoragePath(bundle.contract.executedPdfPath);

  const timeline = bundle.events.map((event) => ({
    id: event.id,
    at: event.createdAt,
    label: event.eventType.replaceAll("_", " "),
    detail: `${event.signerRole ?? "system"} · ${event.ipAddress ?? "no IP"}`
  }));

  return (
    <AdminSigningShell title="Contract Detail" subtitle={`Contract ${bundle.contract.id}`}>
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

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={bundle.contract.status} />
            <p className="text-xs uppercase tracking-[0.14em] text-white/55">Version {bundle.contract.contractVersionNumber}</p>
            {lead ? <p className="text-sm text-white/70">{lead.stageName || lead.legalName}</p> : null}
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
              <a
                href={executedUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-gold px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-gold"
              >
                Download Executed PDF
              </a>
            ) : null}
            <Link href="/admin/signing/contracts" className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-white/75">
              Back to Contracts
            </Link>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-5">
            <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Contract Preview</h2>
            <div className="prose prose-invert mt-3 max-w-none text-sm text-white/85">
              {bundle.version?.renderedHtml ? (
                <div dangerouslySetInnerHTML={{ __html: bundle.version.renderedHtml }} />
              ) : (
                <p>No rendered version available.</p>
              )}
            </div>
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Send to Sign</h2>
            <p className="mt-2 text-sm text-white/65">This is the step that sends the contract to the artist for review and signature.</p>
            <form action={sendSigningInviteAction} className="mt-3 space-y-2">
              <input type="hidden" name="redirectTo" value={`/admin/signing/contracts/${bundle.contract.id}`} />
              <input type="hidden" name="contract_id" value={bundle.contract.id} />
              <input name="expires_at" type="date" className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
              <button type="submit" className="w-full rounded-full border border-gold px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-gold">
                Send / Resend to Sign
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Countersign</h2>
            {bundle.contract.status === "artist_signed" ? (
              <form action={countersignContractAction} className="mt-3 space-y-3">
                <input type="hidden" name="redirectTo" value={`/admin/signing/contracts/${bundle.contract.id}`} />
                <input type="hidden" name="contract_id" value={bundle.contract.id} />
                <input
                  name="signer_email"
                  defaultValue={process.env.SIGNING_LABEL_SIGNER_EMAIL || "legal@emrecordsmusic.com"}
                  className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
                  placeholder="Signer email"
                  type="email"
                  required
                />
                <SignatureCapture signerNameDefault="EM Records Authorized Signatory" signerEmailDefault={process.env.SIGNING_LABEL_SIGNER_EMAIL || "legal@emrecordsmusic.com"} />
                <button type="submit" className="w-full rounded-full border border-gold bg-gold px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-black">
                  Countersign and Execute
                </button>
              </form>
            ) : (
              <p className="mt-3 rounded-xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/65">
                Artist must sign first. Current status: <span className="text-white">{bundle.contract.status.replaceAll("_", " ")}</span>
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-sm uppercase tracking-[0.16em] text-gold">Signature Timeline</h2>
            <div className="mt-3">
              <ActivityTimeline events={timeline} />
            </div>
          </article>
        </div>
      </section>
    </AdminSigningShell>
  );
}
