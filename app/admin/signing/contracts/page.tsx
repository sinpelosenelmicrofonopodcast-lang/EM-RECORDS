import Link from "next/link";
import { AdminSigningShell } from "@/components/signing/admin-signing-shell";
import { StatusBadge } from "@/components/signing/status-badge";
import {
  archiveContractAction,
  regenerateContractDraftAction,
  revokePendingInviteAction,
  sendSignatureReminderAction,
  sendSigningInviteAction
} from "@/lib/actions/signing";
import { listArtistLeads, listContracts, listDealOffers } from "@/lib/signing/service";
import { createServiceClient } from "@/lib/supabase/service";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSigningContractsPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const [contracts, leads, offers] = await Promise.all([listContracts(), listArtistLeads(), listDealOffers()]);
  const service = createServiceClient();
  const { data: invitesRaw } = await service
    .from("invite_tokens")
    .select("id,contract_id,email,expires_at,used_at,revoked_at,created_at")
    .order("created_at", { ascending: false })
    .limit(400);
  const invites = invitesRaw ?? [];

  return (
    <AdminSigningShell title="Contracts" subtitle="Generate, invite, countersign, lock and archive artist agreements with complete auditability.">
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Contract</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Invites</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const lead = leads.find((item) => item.id === contract.artistLeadId);
                const offer = offers.find((item) => item.id === contract.dealOfferId);
                const contractInvites = invites.filter((invite: any) => String(invite.contract_id) === contract.id).slice(0, 3);

                return (
                  <tr key={contract.id} className="border-b border-white/5 align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-white">{lead?.stageName || lead?.legalName || contract.artistLeadId}</p>
                      <p className="text-xs text-white/55">{lead?.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-white">Version {contract.contractVersionNumber}</p>
                      <p className="text-xs text-white/55">
                        {offer ? `${offer.royaltySplitLabel}% / ${offer.royaltySplitArtist}%` : "No linked deal offer"}
                      </p>
                      <a
                        href={`/api/signing/contracts/${contract.id}/pdf`}
                        className="mt-2 inline-block text-xs uppercase tracking-[0.14em] text-white/70 hover:text-white"
                      >
                        Open PDF
                      </a>
                      <Link href={`/admin/signing/contracts/${contract.id}`} className="mt-2 inline-block text-xs uppercase tracking-[0.14em] text-gold hover:underline">
                        Open contract
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={contract.status} />
                      {contract.fullyExecutedAt ? <p className="mt-1 text-xs text-white/55">Executed {new Date(contract.fullyExecutedAt).toLocaleString()}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-2">
                        {contractInvites.length === 0 ? <p className="text-xs text-white/55">No invites</p> : null}
                        {contractInvites.map((invite: any) => (
                          <div key={invite.id} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                            <p className="text-xs text-white/80">{invite.email}</p>
                            <p className="text-[11px] text-white/55">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
                            <p className="text-[11px] text-white/55">
                              {invite.revoked_at ? "Revoked" : invite.used_at ? "Used" : "Active"}
                            </p>
                            {!invite.revoked_at && !invite.used_at ? (
                              <form action={revokePendingInviteAction} className="mt-1">
                                <input type="hidden" name="redirectTo" value="/admin/signing/contracts" />
                                <input type="hidden" name="invite_id" value={invite.id} />
                                <button type="submit" className="text-[10px] uppercase tracking-[0.14em] text-rose-300 hover:text-rose-200">
                                  Revoke
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="grid gap-2">
                        <form action={regenerateContractDraftAction}>
                          <input type="hidden" name="redirectTo" value="/admin/signing/contracts" />
                          <input type="hidden" name="contract_id" value={contract.id} />
                          <button type="submit" className="w-full rounded-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                            Regenerate Draft
                          </button>
                        </form>

                        <form action={sendSigningInviteAction} className="space-y-1">
                          <input type="hidden" name="redirectTo" value="/admin/signing/contracts" />
                          <input type="hidden" name="contract_id" value={contract.id} />
                          <input name="expires_at" type="date" className="w-full rounded-md border border-white/15 bg-black px-2 py-1 text-[11px] text-white" />
                          <button type="submit" className="w-full rounded-md border border-gold px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                            Send to Sign
                          </button>
                        </form>

                        <form action={sendSignatureReminderAction}>
                          <input type="hidden" name="redirectTo" value="/admin/signing/contracts" />
                          <input type="hidden" name="contract_id" value={contract.id} />
                          <button type="submit" className="w-full rounded-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                            Reminder to Sign
                          </button>
                        </form>

                        <Link href={`/admin/signing/contracts/${contract.id}`} className="w-full rounded-md border border-white/20 px-3 py-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-white/70">
                          Review / Countersign
                        </Link>

                        <form action={archiveContractAction}>
                          <input type="hidden" name="redirectTo" value="/admin/signing/contracts" />
                          <input type="hidden" name="contract_id" value={contract.id} />
                          <button type="submit" className="w-full rounded-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                            Archive
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {contracts.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/60">No contracts yet.</p> : null}
        </div>
      </section>
    </AdminSigningShell>
  );
}
