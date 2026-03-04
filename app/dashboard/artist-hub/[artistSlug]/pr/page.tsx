import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { createPrHubAction, updatePrStatusHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getPrByArtistId } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubPrPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist, role, ctx } = await requireArtistPageAccess(artistSlug);
  const requests = await getPrByArtistId(artist.id);

  const canManage = ctx.isAdmin || role === "manager" || role === "booking";

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="pr"
        eyebrow="Press / PR"
        title="PR Inbox"
        description="Track interview and media opportunities with full lifecycle status and notes."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">New PR request</p>
        <form action={createPrHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <input name="outlet" required placeholder="Outlet / media" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="contact" placeholder="Contact" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="requestedAt" placeholder="Requested at" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="topic" placeholder="Topic" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="attachmentUrl" placeholder="Attachment URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <textarea name="notes" rows={3} placeholder="Notes" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
            Add PR Request
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">PR pipeline</p>
        <div className="mt-4 space-y-3">
          {requests.map((row) => (
            <article key={row.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">{row.outlet}</h3>
                  <p className="text-sm text-white/60">{row.topic || "No topic"}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">{row.status}</p>
                </div>

                {canManage ? (
                  <form action={updatePrStatusHubAction} className="flex items-center gap-2">
                    <input type="hidden" name="artistId" value={artist.id} />
                    <input type="hidden" name="id" value={row.id} />
                    <select name="status" defaultValue={row.status} className="rounded-lg border border-white/20 bg-black px-3 py-2 text-xs text-white">
                      <option value="new">new</option>
                      <option value="in_review">in_review</option>
                      <option value="accepted">accepted</option>
                      <option value="scheduled">scheduled</option>
                      <option value="done">done</option>
                      <option value="declined">declined</option>
                    </select>
                    <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/75">
                      Update
                    </button>
                  </form>
                ) : null}
              </div>

              <p className="mt-3 text-sm text-white/70">{row.notes || "No notes"}</p>
            </article>
          ))}

          {requests.length === 0 ? <p className="text-sm text-white/60">No PR requests yet.</p> : null}
        </div>
      </section>
    </>
  );
}
