import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { createContentHubAction, updateContentStatusHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getContentByArtistId } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubContentPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist, role, ctx } = await requireArtistPageAccess(artistSlug);
  const items = await getContentByArtistId(artist.id);

  const canApprove = ctx.isAdmin || role === "manager" || role === "booking";

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="content"
        eyebrow="Content Approval"
        title="Draft → Submitted → Approved"
        description="Artist submits ideas and assets. Manager/booking/admin approve, reject or schedule with full history."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Create content item</p>
        <form action={createContentHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <select name="type" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="reel">reel</option>
            <option value="post">post</option>
            <option value="story">story</option>
          </select>
          <select name="status" defaultValue="draft" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="draft">draft</option>
            <option value="submitted">submitted</option>
          </select>
          <textarea name="caption" rows={3} placeholder="Caption" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="assetUrl" placeholder="Asset URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="assetLabel" placeholder="Asset label" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="scheduledAt" placeholder="Schedule date/time" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
            Submit Content
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Pipeline</p>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">
                    {item.type} · {item.status}
                  </p>
                  <p className="mt-2 text-sm text-white/80">{item.caption || "No caption"}</p>
                </div>

                <form action={updateContentStatusHubAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="artistId" value={artist.id} />
                  <input type="hidden" name="id" value={item.id} />
                  <select name="status" defaultValue={item.status} className="rounded-lg border border-white/20 bg-black px-3 py-2 text-xs text-white">
                    <option value="draft">draft</option>
                    <option value="submitted">submitted</option>
                    <option value="approved" disabled={!canApprove}>
                      approved
                    </option>
                    <option value="scheduled" disabled={!canApprove}>
                      scheduled
                    </option>
                    <option value="published" disabled={!canApprove}>
                      published
                    </option>
                    <option value="rejected" disabled={!canApprove}>
                      rejected
                    </option>
                  </select>
                  <input name="comment" placeholder="Comment" className="rounded-lg border border-white/20 bg-black px-3 py-2 text-xs text-white" />
                  <button type="submit" className="rounded-lg border border-white/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/75">
                    Update
                  </button>
                </form>
              </div>

              {item.assets.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.assets.map((asset, index) => (
                    <a
                      key={index}
                      href={String(asset.url ?? "")}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/75"
                    >
                      {String(asset.label ?? `asset-${index + 1}`)}
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {items.length === 0 ? <p className="text-sm text-white/60">No content items yet.</p> : null}
        </div>
      </section>
    </>
  );
}
