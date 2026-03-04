import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { upsertSyncPackageHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getCatalogBundle, getSyncPackagesByArtistId } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubSyncPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist } = await requireArtistPageAccess(artistSlug);
  const [catalog, packages] = await Promise.all([getCatalogBundle(artist.id), getSyncPackagesByArtistId(artist.id)]);

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="sync"
        eyebrow="Sync Licensing"
        title="Sync Hub"
        description="Tag songs for film/ad/game opportunities and generate one-stop packages with shareable links."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Create sync package</p>
        <form action={upsertSyncPackageHubAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="artistId" value={artist.id} />
          <select name="songId" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2">
            <option value="">Select song</option>
            {catalog.songs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
          <input name="mood" placeholder="Mood tags" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="tempo" placeholder="Tempo" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="useCase" placeholder="Use case (film/ad/game)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="instrumentation" placeholder="Instrumentation" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="link" placeholder="Share link (optional)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="expiresAt" placeholder="Expires at" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
            <input type="checkbox" name="stemsAvailable" /> Stems available
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
            <input type="checkbox" name="explicit" /> Explicit version
          </label>

          <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
            Save Sync Package
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Packages</p>
        <div className="mt-4 space-y-2">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
              <p className="text-sm text-white/80">Song ID: {pkg.songId}</p>
              <p className="mt-1 text-xs text-white/60">Tags: {JSON.stringify(pkg.tags)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {pkg.link ? (
                  <a href={pkg.link} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/75">
                    Open link
                  </a>
                ) : null}
                <p className="text-xs text-white/45">{pkg.expiresAt ? `Expires ${new Date(pkg.expiresAt).toLocaleString()}` : "No expiration"}</p>
              </div>
            </div>
          ))}

          {packages.length === 0 ? <p className="text-sm text-white/60">No sync packages yet.</p> : null}
        </div>
      </section>
    </>
  );
}
