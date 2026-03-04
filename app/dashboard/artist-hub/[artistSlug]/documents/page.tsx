import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { updateDocumentAclAction, uploadDocumentHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getDocumentAclByArtistId, getDocumentsByArtistId } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubDocumentsPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist, ctx } = await requireArtistPageAccess(artistSlug);
  const [documents, acl] = await Promise.all([getDocumentsByArtistId(artist.id), getDocumentAclByArtistId(artist.id)]);

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="documents"
        eyebrow="Documents"
        title="Contracts, Splits, Licenses"
        description="Secure document vault with soft-delete and per-document ACL managed by admin."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Upload document</p>
        <form action={uploadDocumentHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <select name="type" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="contract">contract</option>
            <option value="splitsheet">splitsheet</option>
            <option value="invoice">invoice</option>
            <option value="license">license</option>
            <option value="epk">epk</option>
            <option value="other">other</option>
          </select>
          <select name="status" defaultValue="pending" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="pending">pending</option>
            <option value="needs_info">needs_info</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
          <input type="file" name="file" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="url" placeholder="or external URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
            Save Document
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Document ACL</p>
        <div className="mt-4 space-y-3">
          {acl.map((row) => (
            <form key={String(row.id)} action={updateDocumentAclAction} className="grid gap-3 rounded-xl border border-white/10 p-3 md:grid-cols-6">
              <input type="hidden" name="artistId" value={artist.id} />
              <input type="hidden" name="documentType" value={String(row.documentType)} />
              <p className="text-sm text-white md:col-span-2">{String(row.documentType)}</p>

              <label className="flex items-center gap-2 text-xs text-white/75">
                <input type="checkbox" name="allowArtist" defaultChecked={Boolean(row.allowArtist)} disabled={!ctx.isAdmin} /> artist
              </label>
              <label className="flex items-center gap-2 text-xs text-white/75">
                <input type="checkbox" name="allowManager" defaultChecked={Boolean(row.allowManager)} disabled={!ctx.isAdmin} /> manager
              </label>
              <label className="flex items-center gap-2 text-xs text-white/75">
                <input type="checkbox" name="allowBooking" defaultChecked={Boolean(row.allowBooking)} disabled={!ctx.isAdmin} /> booking
              </label>
              <label className="flex items-center gap-2 text-xs text-white/75">
                <input type="checkbox" name="allowStaff" defaultChecked={Boolean(row.allowStaff)} disabled={!ctx.isAdmin} /> staff
              </label>

              {ctx.isAdmin ? (
                <button type="submit" className="md:col-span-6 justify-self-start rounded-full border border-white/25 px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-white/75">
                  Update ACL
                </button>
              ) : null}
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Files</p>
        <div className="mt-4 space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
              <p className="text-sm text-white/80">
                {doc.type} · v{doc.version} · {doc.status}
              </p>
              <a
                href={`/api/artist-hub/download?documentId=${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/75"
              >
                Open
              </a>
            </div>
          ))}
          {documents.length === 0 ? <p className="text-sm text-white/60">No documents yet.</p> : null}
        </div>
      </section>
    </>
  );
}
