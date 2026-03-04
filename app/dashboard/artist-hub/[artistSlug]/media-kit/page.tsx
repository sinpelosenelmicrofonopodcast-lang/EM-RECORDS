import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { generateMediaKitPdfAction, upsertMediaKitHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getDocumentsByArtistId, getMediaKitByArtistId } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubMediaKitPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist } = await requireArtistPageAccess(artistSlug);
  const [mediaKit, documents] = await Promise.all([getMediaKitByArtistId(artist.id), getDocumentsByArtistId(artist.id)]);

  const mediaKitDocs = documents.filter((doc) => doc.type === "epk");

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="media-kit"
        eyebrow="Media Kit"
        title="EPK Builder"
        description="Editable bio blocks, press quotes, stats and one-click Media Kit PDF generation with EM Records branding."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <form action={upsertMediaKitHubAction} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />

          <input name="headline" defaultValue={mediaKit?.headline ?? ""} placeholder="Headline" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <textarea name="oneLiner" rows={2} defaultValue={mediaKit?.oneLiner ?? ""} placeholder="One-liner" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <textarea
            name="highlights"
            rows={4}
            defaultValue={(mediaKit?.highlights ?? []).join("\n")}
            placeholder="Highlights (one per line)"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
          />
          <textarea
            name="pressQuotes"
            rows={4}
            defaultValue={(mediaKit?.pressQuotes ?? []).join("\n")}
            placeholder="Press quotes (one per line)"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
          />
          <textarea
            name="featuredTracks"
            rows={4}
            defaultValue={(mediaKit?.featuredTracks ?? []).join("\n")}
            placeholder="Featured tracks (one per line)"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
          />

          <input name="manager" defaultValue={String((mediaKit?.contacts as any)?.manager ?? "")} placeholder="Manager contact" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="booking" defaultValue={String((mediaKit?.contacts as any)?.booking ?? "")} placeholder="Booking contact" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="press" defaultValue={String((mediaKit?.contacts as any)?.press ?? "")} placeholder="Press contact" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />

          <input
            name="monthlyListeners"
            defaultValue={String((mediaKit?.stats as any)?.monthly_listeners ?? "")}
            placeholder="Monthly listeners"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
          />
          <input name="followers" defaultValue={String((mediaKit?.stats as any)?.followers ?? "")} placeholder="Followers" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input
            name="topMarket"
            defaultValue={String((mediaKit?.stats as any)?.top_market ?? "")}
            placeholder="Top market"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"
          />

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Save Media Kit
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Generate PDF</p>
          <form action={generateMediaKitPdfAction}>
            <input type="hidden" name="artistId" value={artist.id} />
            <button type="submit" className="rounded-full border border-gold bg-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black">
              Generate MediaKit PDF
            </button>
          </form>
        </div>

        <div className="mt-4 space-y-2">
          {mediaKitDocs.slice(0, 10).map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80">
              <p>
                Media Kit v{doc.version} · {new Date(doc.createdAt).toLocaleString()}
              </p>
              <a
                href={`/api/artist-hub/download?documentId=${doc.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/75 hover:text-white"
              >
                Download
              </a>
            </div>
          ))}
          {mediaKitDocs.length === 0 ? <p className="text-sm text-white/60">No Media Kit PDF generated yet.</p> : null}
        </div>
      </section>
    </>
  );
}
