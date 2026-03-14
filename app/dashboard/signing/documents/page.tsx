import { ArtistSigningShell } from "@/components/signing/artist-signing-shell";
import { uploadArtistDocumentPortalAction } from "@/lib/actions/signing";
import { requireArtistPortalBundle } from "@/lib/signing/page";
import { createSignedUrlFromStoragePath } from "@/lib/signing/service";

type Props = {
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ArtistDocumentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const flashStatus = params.status === "success" || params.status === "error" ? params.status : null;
  const flashMessage = typeof params.message === "string" ? params.message : "";
  const { leadId, bundle } = await requireArtistPortalBundle();

  const docLinks = await Promise.all(
    bundle.documents.map(async (document) => ({
      document,
      url: await createSignedUrlFromStoragePath(document.filePath)
    }))
  );

  return (
    <ArtistSigningShell title="Documents" subtitle="Upload onboarding files and download contracts or executed documents.">
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
        <h2 className="text-lg font-semibold text-white">Upload Document</h2>
        <form action={uploadArtistDocumentPortalAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirectTo" value="/dashboard/signing/documents" />
          <input type="hidden" name="lead_id" value={leadId} />
          <select name="type" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="id">Government ID</option>
            <option value="tax_placeholder">Tax form placeholder</option>
            <option value="payment_placeholder">Payment details placeholder</option>
            <option value="press_photo_placeholder">Press photos placeholder</option>
            <option value="other">Other</option>
          </select>
          <input name="file" type="file" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black md:col-span-2 md:justify-self-start">
            Upload
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-semibold text-white">My Files</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/55">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {docLinks.map(({ document, url }) => (
                <tr key={document.id} className="border-b border-white/5">
                  <td className="px-3 py-3 text-sm text-white">{document.type.replaceAll("_", " ")}</td>
                  <td className="px-3 py-3">
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                        {document.fileName || "Open file"}
                      </a>
                    ) : (
                      <span className="text-white/60">{document.fileName || "Unavailable"}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs uppercase tracking-[0.14em] text-white/65">
                    {document.status}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/60">{new Date(document.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {docLinks.length === 0 ? <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-8 text-center text-sm text-white/60">No documents uploaded yet.</p> : null}
        </div>
      </section>
    </ArtistSigningShell>
  );
}

