import Link from "next/link";
import { AdminSigningShell } from "@/components/signing/admin-signing-shell";
import { StatusBadge } from "@/components/signing/status-badge";
import { createDealOfferAction, generateContractDraftAction, sendSigningInviteAction } from "@/lib/actions/signing";
import { listArtistLeads, listContracts, listContractTemplates, listDealOffers } from "@/lib/signing/service";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSigningDealsPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const [leads, offers, templates, contracts] = await Promise.all([listArtistLeads(), listDealOffers(), listContractTemplates(), listContracts()]);
  const activeTemplates = templates.filter((template) => template.active);

  return (
    <AdminSigningShell title="Deals" subtitle="Build and manage 50/50 deal terms before contract generation.">
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
        <h2 className="text-lg font-semibold text-white">Create Deal Offer</h2>
        <form action={createDealOfferAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="redirectTo" value="/admin/signing/deals" />
          <select name="artist_lead_id" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="">Select artist lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.stageName || lead.legalName} ({lead.email})
              </option>
            ))}
          </select>
          <input name="royalty_split_label" defaultValue="50" placeholder="Label split %" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="royalty_split_artist" defaultValue="50" placeholder="Artist split %" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="advance_amount" placeholder="Advance amount" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="term_months" defaultValue="24" placeholder="Term (months)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="term_description" placeholder="Term description" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="territory" defaultValue="Worldwide" placeholder="Territory" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="expires_at" type="date" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <input type="checkbox" name="includes_publishing" className="h-4 w-4 rounded border-white/40 bg-black text-gold" />
            Include publishing language
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <input type="checkbox" name="includes_360" className="h-4 w-4 rounded border-white/40 bg-black text-gold" />
            Include 360 clause
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <input type="checkbox" name="perpetual_master_rights" className="h-4 w-4 rounded border-white/40 bg-black text-gold" />
            Enable perpetual master rights
          </label>
          <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black md:col-span-3 md:justify-self-start">
            Create Offer
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">Offers</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Terms</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Generate Contract</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const lead = leads.find((item) => item.id === offer.artistLeadId);
                const latestContract = contracts.find((item) => item.dealOfferId === offer.id) ?? contracts.find((item) => item.artistLeadId === offer.artistLeadId);
                return (
                  <tr key={offer.id} className="border-b border-white/5 align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-white">{lead?.stageName || lead?.legalName || offer.artistLeadId}</p>
                      <p className="text-xs text-white/60">{lead?.email || "Unknown email"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-white">
                        {offer.royaltySplitLabel}% / {offer.royaltySplitArtist}%
                      </p>
                      <p className="text-xs text-white/60">{offer.termDescription || `${offer.termMonths ?? 24} months`}</p>
                      <p className="text-xs text-white/60">{offer.territory}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={offer.status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="grid gap-2 rounded-lg border border-white/10 bg-black/40 p-3">
                        <form action={generateContractDraftAction} className="grid gap-2">
                          <input type="hidden" name="redirectTo" value="/admin/signing/deals" />
                          <input type="hidden" name="artist_lead_id" value={offer.artistLeadId} />
                          <input type="hidden" name="deal_offer_id" value={offer.id} />
                          <select name="contract_template_id" required className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white">
                            <option value="">Template</option>
                            {activeTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name} ({template.versionName})
                              </option>
                            ))}
                          </select>
                          <input name="effective_date" type="date" className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white" />
                          <select name="contract_language" defaultValue="en" className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white">
                            <option value="en">English</option>
                            <option value="es">Espanol</option>
                          </select>
                          <input
                            name="label_principal_place_of_business"
                            placeholder="Label principal place of business"
                            defaultValue="Austin, Texas"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="initial_term_commitment"
                            placeholder="Initial term commitment"
                            defaultValue="Three (3) Commercial Singles"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="initial_term_period"
                            placeholder="Initial term period"
                            defaultValue="Twelve (12) months"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="extension_option_description"
                            placeholder="Extension option"
                            defaultValue="Two (2) additional Singles OR one (1) EP project."
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input name="term" placeholder="Legacy term override" className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white" />
                          <input name="territory" placeholder="Territory override" className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white" />
                          <input
                            name="royalty_statement_frequency"
                            placeholder="Royalty statement frequency"
                            defaultValue="every six (6) months"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="royalty_payment_window"
                            placeholder="Royalty payment window"
                            defaultValue="45 days after statement delivery"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="optional_360_cap"
                            placeholder="360 cap"
                            defaultValue="20% of net income"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="live_split_artist"
                            placeholder="Live split artist %"
                            defaultValue="70"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="live_split_label"
                            placeholder="Live split label %"
                            defaultValue="30"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="label_signer_name"
                            placeholder="Label signer name"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <input
                            name="label_signer_title"
                            placeholder="Label signer title"
                            className="rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white"
                          />
                          <button type="submit" className="rounded-md border border-gold px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                            Generate Draft
                          </button>
                        </form>
                        {latestContract ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Link href={`/admin/signing/contracts/${latestContract.id}`} className="rounded-md border border-white/20 px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                              Open Contract
                            </Link>
                            <a
                              href={`/api/signing/contracts/${latestContract.id}/pdf`}
                              className="rounded-md border border-white/20 px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70"
                            >
                              PDF
                            </a>
                            {["draft", "offer_sent", "artist_viewed_offer"].includes(latestContract.status) ? (
                              <form action={sendSigningInviteAction}>
                                <input type="hidden" name="redirectTo" value="/admin/signing/deals" />
                                <input type="hidden" name="contract_id" value={latestContract.id} />
                                <button type="submit" className="rounded-md border border-gold px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                                  Send to Sign
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-[11px] text-white/45">Generate the draft first. The PDF is created from the contract draft.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {offers.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/60">No deal offers yet.</p> : null}
        </div>
      </section>
    </AdminSigningShell>
  );
}
