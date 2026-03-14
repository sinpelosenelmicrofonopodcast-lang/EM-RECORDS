import Link from "next/link";
import { AdminSigningShell } from "@/components/signing/admin-signing-shell";
import { StatusBadge } from "@/components/signing/status-badge";
import { createArtistLeadAction, createArtistLeadFromExistingArtistAction, sendOnboardingReminderAction, sendSigningInviteAction, updateArtistLeadStageAction } from "@/lib/actions/signing";
import { SIGNING_PIPELINE_STAGES } from "@/lib/signing/constants";
import { listArtistLeads, listContracts, listDealOffers } from "@/lib/signing/service";
import { getArtists } from "@/lib/queries";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    q?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSigningArtistsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = String(params.q ?? "").trim().toLowerCase();
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";

  const [leads, deals, contracts, artists] = await Promise.all([listArtistLeads(400), listDealOffers(400), listContracts(400), getArtists()]);
  const filtered = q
    ? leads.filter((lead) => {
        const haystack = `${lead.legalName} ${lead.stageName ?? ""} ${lead.email} ${lead.country ?? ""} ${lead.state ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
    : leads;
  const catalogArtists = q
    ? artists.filter((artist) => `${artist.name} ${artist.slug} ${artist.bookingEmail}`.toLowerCase().includes(q))
    : artists;

  return (
    <AdminSigningShell title="Artists" subtitle="Lead intake and pipeline controls for signed and pending EM Records artists.">
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Existing Artists</h2>
            <p className="mt-1 text-sm text-white/65">Use artists already registered on the site and add them to the signing flow in one click.</p>
          </div>
          <Link href="/admin/artists" className="text-xs uppercase tracking-[0.16em] text-gold hover:underline">
            Open full artist admin
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Primary Email</th>
                <th className="px-3 py-2">Signing Status</th>
                <th className="px-3 py-2">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {catalogArtists.slice(0, 150).map((artist) => {
                const lead = leads.find((item) => item.email.toLowerCase() === artist.bookingEmail.toLowerCase());
                const latestDeal = lead ? deals.find((item) => item.artistLeadId === lead.id) : null;
                const latestContract = lead ? contracts.find((item) => item.artistLeadId === lead.id) : null;

                return (
                  <tr key={artist.id} className="border-b border-white/5 align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-white">{artist.name}</p>
                      <p className="text-xs text-white/55">{artist.slug}</p>
                    </td>
                    <td className="px-3 py-3">{artist.bookingEmail || <span className="text-white/45">No email</span>}</td>
                    <td className="px-3 py-3">
                      {lead ? (
                        <div className="space-y-2">
                          <StatusBadge status={lead.status} />
                          {latestDeal ? <p className="text-xs text-white/55">Deal: {latestDeal.status}</p> : <p className="text-xs text-white/45">No deal yet</p>}
                          {latestContract ? <p className="text-xs text-white/55">Contract: {latestContract.status}</p> : <p className="text-xs text-white/45">No contract yet</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-white/45">Not in signing yet</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <form action={createArtistLeadFromExistingArtistAction}>
                          <input type="hidden" name="redirectTo" value="/admin/signing/artists" />
                          <input type="hidden" name="artist_id" value={artist.id} />
                          <button type="submit" className="rounded-md border border-gold px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                            {lead ? "Sync to Signing" : "Add to Signing"}
                          </button>
                        </form>
                        {lead ? (
                          <Link href="/admin/signing/deals" className="rounded-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                            Deals
                          </Link>
                        ) : null}
                        {latestContract ? (
                          <Link href={`/admin/signing/contracts/${latestContract.id}`} className="rounded-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                            Contract
                          </Link>
                        ) : null}
                        {latestContract ? (
                          <a
                            href={`/api/signing/contracts/${latestContract.id}/pdf`}
                            className="rounded-md border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70"
                          >
                            PDF
                          </a>
                        ) : null}
                        {latestContract && ["draft", "offer_sent", "artist_viewed_offer"].includes(latestContract.status) ? (
                          <form action={sendSigningInviteAction}>
                            <input type="hidden" name="redirectTo" value="/admin/signing/artists" />
                            <input type="hidden" name="contract_id" value={latestContract.id} />
                            <button type="submit" className="rounded-md border border-gold px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                              Send to Sign
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {catalogArtists.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/60">No existing artists found.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Create Lead</h2>
          <Link href="/admin/signing/deals" className="text-xs uppercase tracking-[0.16em] text-gold hover:underline">
            Go to Deals
          </Link>
        </div>
        <p className="mt-1 text-sm text-white/65">Use this only when the artist is not already registered in the main Artists admin.</p>
        <form action={createArtistLeadAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="redirectTo" value="/admin/signing/artists" />
          <input name="legal_name" required placeholder="Legal name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="stage_name" placeholder="Stage name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="email" type="email" required placeholder="Email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="phone" placeholder="Phone" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="country" placeholder="Country" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="state" placeholder="State" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="date_of_birth" type="date" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <select name="pro_affiliation" defaultValue="none" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="none">PRO affiliation</option>
            <option value="BMI">BMI</option>
            <option value="ASCAP">ASCAP</option>
            <option value="SESAC">SESAC</option>
          </select>
          <input name="ipi_number" placeholder="IPI Number" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <textarea name="notes" rows={2} placeholder="Notes" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-3" />
          <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black md:col-span-3 md:justify-self-start">
            Save Lead
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <form action="/admin/signing/artists" className="mb-4 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search legal name, stage name, email..."
            className="min-w-[280px] flex-1 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
          />
          <button type="submit" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/70">
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Artist</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Profile</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Workflow</th>
                <th className="px-3 py-2">Move Stage</th>
                <th className="px-3 py-2">Reminders</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const latestDeal = deals.find((item) => item.artistLeadId === lead.id);
                const latestContract = contracts.find((item) => item.artistLeadId === lead.id);

                return (
                  <tr key={lead.id} className="border-b border-white/5 align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-white">{lead.stageName || lead.legalName}</p>
                      <p className="text-xs text-white/55">{lead.legalName}</p>
                      <p className="text-xs text-white/45">
                        {lead.country || "N/A"} {lead.state ? `· ${lead.state}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3">{lead.email}</td>
                    <td className="px-3 py-3">
                      <p className="text-xs text-white/70">PRO: {lead.proAffiliation}</p>
                      <p className="text-xs text-white/60">IPI: {lead.ipiNumber || "N/A"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-[180px] flex-wrap gap-2">
                        <Link href="/admin/signing/deals" className="rounded-md border border-white/20 px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                          {latestDeal ? "Open Deal" : "Create Deal"}
                        </Link>
                        {latestContract ? (
                          <Link href={`/admin/signing/contracts/${latestContract.id}`} className="rounded-md border border-gold px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                            Contract
                          </Link>
                        ) : null}
                        {latestContract ? (
                          <a
                            href={`/api/signing/contracts/${latestContract.id}/pdf`}
                            className="rounded-md border border-white/20 px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70"
                          >
                            PDF
                          </a>
                        ) : null}
                        {latestContract && ["draft", "offer_sent", "artist_viewed_offer"].includes(latestContract.status) ? (
                          <form action={sendSigningInviteAction}>
                            <input type="hidden" name="redirectTo" value="/admin/signing/artists" />
                            <input type="hidden" name="contract_id" value={latestContract.id} />
                            <button type="submit" className="rounded-md border border-gold px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                              Send to Sign
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <form action={updateArtistLeadStageAction} className="flex min-w-[210px] gap-2">
                        <input type="hidden" name="redirectTo" value="/admin/signing/artists" />
                        <input type="hidden" name="lead_id" value={lead.id} />
                        <select name="status" defaultValue={lead.status} className="w-full rounded-md border border-white/15 bg-black px-2 py-1.5 text-[11px] text-white">
                          {SIGNING_PIPELINE_STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="rounded-md border border-gold px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-3 py-3">
                      <form action={sendOnboardingReminderAction}>
                        <input type="hidden" name="redirectTo" value="/admin/signing/artists" />
                        <input type="hidden" name="lead_id" value={lead.id} />
                        <button type="submit" className="rounded-md border border-white/20 px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-white/70">
                          Onboarding Reminder
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/60">No artist leads found.</p> : null}
        </div>
      </section>
    </AdminSigningShell>
  );
}
