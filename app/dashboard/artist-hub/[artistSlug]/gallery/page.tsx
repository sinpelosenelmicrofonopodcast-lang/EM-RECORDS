import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { syncLightroomHubAction, uploadMediaAssetHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getGalleryByArtistId, resolveMaybeSignedUrl } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubGalleryPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist } = await requireArtistPageAccess(artistSlug);
  const assets = await getGalleryByArtistId(artist.id);

  const lightroomConnectHref = `/api/artist-hub/lightroom/oauth?artistId=${artist.id}`;

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="gallery"
        eyebrow="Gallery"
        title="Photo & Visual Assets"
        description="Adobe Lightroom sync plus manual upload fallback. Select photos for Media Kit PDFs and campaign assets."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <a href={lightroomConnectHref} className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
            Connect Lightroom
          </a>

          <form action={syncLightroomHubAction}>
            <input type="hidden" name="artistId" value={artist.id} />
            <button type="submit" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/75 hover:text-white">
              Sync album now
            </button>
          </form>
        </div>

        <form action={uploadMediaAssetHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <select name="type" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="photo">photo</option>
            <option value="cover">cover</option>
            <option value="logo">logo</option>
            <option value="template">template</option>
          </select>
          <input name="label" placeholder="Asset label" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input type="file" name="file" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="url" placeholder="Or external URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-white/75 md:col-span-2">
            <input type="checkbox" name="includeInPdf" className="h-4 w-4" />
            Include in Media Kit PDF
          </label>
          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
            Upload Asset
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Asset library</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {await Promise.all(
            assets.map(async (asset) => {
              const url =
                asset.source === "lightroom"
                  ? `/api/artist-hub/lightroom/asset/${asset.id}?artistId=${artist.id}&size=thumb`
                  : (await resolveMaybeSignedUrl(asset.thumbUrl, 60 * 60 * 6)) || (await resolveMaybeSignedUrl(asset.url, 60 * 60 * 6));
              return (
                <article key={asset.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  <div className="aspect-[4/3] bg-black/70">
                    {url ? <img src={url} alt={String(asset.metadata.label ?? asset.type)} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.16em] text-white/35">No preview</div>}
                  </div>
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-gold">{asset.type}</p>
                    <p className="mt-1 text-sm text-white/80">{String(asset.metadata.label ?? asset.source)}</p>
                    <p className="mt-1 text-xs text-white/50">{new Date(asset.createdAt).toLocaleDateString()}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>
        {assets.length === 0 ? <p className="mt-4 text-sm text-white/60">No gallery assets yet.</p> : null}
      </section>
    </>
  );
}
