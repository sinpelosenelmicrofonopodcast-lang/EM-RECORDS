import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { generateSmartlinkHubAction, upsertRegistrationHubAction, upsertSongHubAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getCatalogBundle, resolveMaybeSignedUrl, smartlinkUrl } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

export default async function ArtistHubCatalogPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist } = await requireArtistPageAccess(artistSlug);
  const catalog = await getCatalogBundle(artist.id);

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="catalog"
        eyebrow="Artist Hub"
        title="Catalog"
        description="Songs, releases and registration status across BMI, MLC, Songtrust, SoundExchange, DistroKid and Content ID."
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Add song</p>
        <form action={upsertSongHubAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="artistId" value={artist.id} />
          <input name="title" required placeholder="Song title" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <select name="releaseId" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
            <option value="">No release</option>
            {catalog.releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.title}
              </option>
            ))}
          </select>
          <input name="isrc" placeholder="ISRC" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="iswc" placeholder="ISWC" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="language" placeholder="Language" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="bpm" placeholder="BPM" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="key" placeholder="Key" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
            <input type="checkbox" name="explicit" /> Explicit
          </label>
          <input name="spotify" placeholder="Spotify URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="apple" placeholder="Apple URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <input name="youtube" placeholder="YouTube URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />
          <input name="tiktok" placeholder="TikTok sound URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
          <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-3 md:justify-self-start">
            Save Song
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Release smartlinks + QR</p>
        <div className="mt-4 space-y-3">
          {await Promise.all(
            catalog.releases.map(async (release) => {
              const qrAsset = catalog.assets.find((asset) => asset.releaseId === release.id && asset.type === "qr" && asset.sourceId === release.smartlinkSlug);
              const qrUrl = await resolveMaybeSignedUrl(qrAsset?.url ?? null, 60 * 60 * 6);

              return (
                <article key={release.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{release.title}</h3>
                      <p className="text-sm text-white/60">{release.releaseDate}</p>
                      {release.smartlinkSlug ? (
                        <a href={smartlinkUrl(release.smartlinkSlug)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs uppercase tracking-[0.14em] text-gold">
                          {smartlinkUrl(release.smartlinkSlug)}
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-white/45">No smartlink yet.</p>
                      )}
                    </div>

                    {qrUrl ? <img src={qrUrl} alt={`${release.title} QR`} className="h-20 w-20 rounded-lg border border-white/10 bg-black p-1" /> : null}
                  </div>

                  <form action={generateSmartlinkHubAction} className="mt-4 grid gap-2 md:grid-cols-3">
                    <input type="hidden" name="artistId" value={artist.id} />
                    <input type="hidden" name="releaseId" value={release.id} />
                    <input name="slug" defaultValue={release.smartlinkSlug ?? ""} placeholder="smartlink-slug" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white" />
                    <input name="spotifyLink" placeholder="Spotify link" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white" />
                    <input name="appleLink" placeholder="Apple link" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white" />
                    <input name="youtubeLink" placeholder="YouTube link" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white" />
                    <input name="tiktokLink" placeholder="TikTok sound link" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white" />
                    <input name="presaveUrl" placeholder="Pre-save URL (optional)" className="rounded-lg border border-white/15 bg-black px-3 py-2 text-xs text-white" />
                    <label className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80">
                      <input type="checkbox" name="presaveEnabled" /> pre-save active
                    </label>
                    <button type="submit" className="rounded-lg border border-gold/60 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-gold md:col-span-3 md:justify-self-start">
                      Generate / Update SmartLink + QR
                    </button>
                  </form>
                </article>
              );
            })
          )}
          {catalog.releases.length === 0 ? <p className="text-sm text-white/60">No releases linked to this artist yet.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Songs & registrations</p>
        <div className="mt-4 space-y-3">
          {catalog.songs.map((song) => {
            const songRegs = catalog.registrations.filter((row) => row.songId === song.id);
            return (
              <article key={song.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">{song.title}</h3>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/50">ISRC {song.isrc || "pending"}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/50">ISWC {song.iswc || "pending"}</p>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  {(["bmi", "mlc", "songtrust", "soundexchange", "distrokid", "contentid"] as const).map((org) => {
                    const existing = songRegs.find((row) => row.org === org);
                    return (
                      <form key={org} action={upsertRegistrationHubAction} className="rounded-lg border border-white/10 p-3">
                        <input type="hidden" name="artistId" value={artist.id} />
                        <input type="hidden" name="songId" value={song.id} />
                        <input type="hidden" name="org" value={org} />
                        <p className="text-xs uppercase tracking-[0.16em] text-gold">{org}</p>
                        <select name="status" defaultValue={existing?.status ?? "pending"} className="mt-2 w-full rounded-md border border-white/20 bg-black px-2 py-1.5 text-xs text-white">
                          <option value="pending">pending</option>
                          <option value="needs_info">needs_info</option>
                          <option value="submitted">submitted</option>
                          <option value="approved">approved</option>
                          <option value="rejected">rejected</option>
                        </select>
                        <input name="refNumber" defaultValue={existing?.refNumber ?? ""} placeholder="Ref #" className="mt-2 w-full rounded-md border border-white/20 bg-black px-2 py-1.5 text-xs text-white" />
                        <button type="submit" className="mt-2 w-full rounded-md border border-gold/40 px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-gold">
                          Save
                        </button>
                      </form>
                    );
                  })}
                </div>
              </article>
            );
          })}

          {catalog.songs.length === 0 ? <p className="text-sm text-white/60">No songs yet.</p> : null}
        </div>
      </section>
    </>
  );
}
