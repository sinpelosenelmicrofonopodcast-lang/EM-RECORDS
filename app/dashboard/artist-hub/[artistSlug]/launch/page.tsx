import { ArtistHubModuleHeader } from "@/components/artist-hub/module-header";
import { upsertLaunchChecklistAction } from "@/lib/actions/artist-hub";
import { requireArtistPageAccess } from "@/lib/artist-hub/page";
import { getCatalogBundle } from "@/lib/artist-hub/service";
import { launchScoreBadge } from "@/lib/artist-hub/ready-score";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ artistSlug: string }> };

const REG_FIELDS = [
  ["bmiStatus", "BMI"],
  ["mlcStatus", "MLC"],
  ["songtrustStatus", "Songtrust"],
  ["soundexchangeStatus", "SoundExchange"],
  ["distrokidStatus", "DistroKid"],
  ["contentIdStatus", "Content ID"]
] as const;

export default async function ArtistHubLaunchPage({ params }: Params) {
  const { artistSlug } = await params;
  const { artist } = await requireArtistPageAccess(artistSlug);
  const catalog = await getCatalogBundle(artist.id);

  return (
    <>
      <ArtistHubModuleHeader
        artistSlug={artistSlug}
        active="launch"
        eyebrow="Launch Center"
        title="Release Readiness"
        description="Checklist per song: metadata, splits, registrations, smartlink and media kit."
      />

      <div className="space-y-4">
        {catalog.songs.map((song) => {
          const checklist = catalog.checklists.find((row) => row.songId === song.id);
          const items = (checklist?.items ?? {}) as Record<string, unknown>;
          const score = checklist?.readyScore ?? 0;
          const badge = launchScoreBadge(score);
          const badgeClasses = badge === "green" ? "bg-emerald-500/20 text-emerald-300" : badge === "yellow" ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300";

          return (
            <section key={song.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold text-white">{song.title}</h3>
                  <p className="mt-1 text-sm text-white/60">Song ID: {song.id}</p>
                </div>
                <p className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${badgeClasses}`}>Ready {score}%</p>
              </div>

              <form action={upsertLaunchChecklistAction} className="mt-4 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="artistId" value={artist.id} />
                <input type="hidden" name="songId" value={song.id} />

                <input name="isrc" defaultValue={String(items.isrc ?? song.isrc ?? "")} placeholder="ISRC" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
                <input name="iswc" defaultValue={String(items.iswc ?? song.iswc ?? "")} placeholder="ISWC" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
                <input name="releaseDate" defaultValue={String(items.releaseDate ?? "")} placeholder="Release date (YYYY-MM-DD)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />

                <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
                  <input type="checkbox" name="masterSplits" defaultChecked={Boolean(items.masterSplitsConfirmed)} /> Master splits confirmed
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
                  <input type="checkbox" name="publishingSplits" defaultChecked={Boolean(items.publishingSplitsConfirmed)} /> Publishing splits confirmed
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
                  <input type="checkbox" name="coverArt" defaultChecked={Boolean(items.coverArt)} /> Cover art uploaded
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
                  <input type="checkbox" name="mediaKitReady" defaultChecked={Boolean(items.mediaKitReady)} /> Media kit ready
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-white/80">
                  <input type="checkbox" name="smartlinkReady" defaultChecked={Boolean(items.smartlinkReady)} /> SmartLink ready
                </label>

                <select name="status" defaultValue={checklist?.status ?? "in_progress"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-3">
                  <option value="draft">draft</option>
                  <option value="in_progress">in_progress</option>
                  <option value="ready">ready</option>
                  <option value="blocked">blocked</option>
                </select>

                {REG_FIELDS.map(([key, label]) => (
                  <select key={key} name={key} defaultValue={String(items[key] ?? "pending")} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">
                    <option value="pending">{label}: pending</option>
                    <option value="needs_info">{label}: needs_info</option>
                    <option value="submitted">{label}: submitted</option>
                    <option value="approved">{label}: approved</option>
                    <option value="rejected">{label}: rejected</option>
                  </select>
                ))}

                <input name="dueDate" defaultValue={checklist?.dueDate ?? ""} placeholder="Due date" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white" />
                <textarea name="notes" rows={3} defaultValue={checklist?.notes ?? ""} placeholder="Notes" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white md:col-span-2" />

                <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-3 md:justify-self-start">
                  Save Checklist
                </button>
              </form>
            </section>
          );
        })}

        {catalog.songs.length === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/65">Create songs in Catalog first to enable Launch Center.</section>
        ) : null}
      </div>
    </>
  );
}
