import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { runCatalogSyncAction } from "@/lib/actions/catalog-sync";
import { requireAdminPage } from "@/lib/auth";
import { getCatalogSyncDashboard } from "@/lib/catalog-sync";

type Props = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

function statusClass(status: string | null | undefined) {
  if (status === "completed") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
  if (status === "partial") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (status === "failed") return "border-red-400/30 bg-red-400/10 text-red-100";
  return "border-white/10 bg-white/[0.03] text-white/60";
}

export default async function CatalogSyncPage({ searchParams }: Props) {
  await requireAdminPage();
  const [data, params] = await Promise.all([getCatalogSyncDashboard(), searchParams]);

  return (
    <AdminShell>
      <PageIntro
        eyebrow="Catalog Automation"
        title="DSP Catalog Sync"
        description="Spotify, Apple Music and YouTube reconcile into the EM Records master catalog. IDs first, ISRC/UPC second, title/date only as a controlled fallback."
        actions={
          <form action={runCatalogSyncAction}>
            <button type="submit" className="rounded-full bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black">
              Sync All Artists
            </button>
          </form>
        }
      />

      {params.success ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">{params.success}</div> : null}
      {params.error ? <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{params.error}</div> : null}

      <section className="grid gap-3 md:grid-cols-3">
        <article className="admin-surface rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Spotify API</p>
          <p className="mt-2 text-lg font-semibold text-white">{data.credentials.spotify ? "Ready" : "Credentials needed"}</p>
          <p className="mt-2 text-xs text-white/45">Uses server-side Client Credentials. No user OAuth required.</p>
        </article>
        <article className="admin-surface rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Apple Catalog</p>
          <p className="mt-2 text-lg font-semibold text-white">Ready</p>
          <p className="mt-2 text-xs text-white/45">ID-based Apple/iTunes catalog lookup; Apple Music IDs remain canonical.</p>
        </article>
        <article className="admin-surface rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">YouTube</p>
          <p className="mt-2 text-lg font-semibold text-white">Zero-quota sync</p>
          <p className="mt-2 text-xs text-white/45">Reads the official channel upload RSS. No search scans and no API quota.</p>
        </article>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Artists</p>
          <h2 className="mt-2 font-display text-3xl text-white">Connections & health</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {data.artists.map((artist: any) => (
            <article key={artist.id} className="admin-surface rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{artist.name}</h3>
                  <p className="mt-1 text-xs text-white/40">{artist.slug}</p>
                </div>
                <span className={"rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em] " + statusClass(artist.last_catalog_sync_status)}>
                  {artist.last_catalog_sync_status || "never synced"}
                </span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 p-3 text-xs text-white/60">Spotify<br/><span className="text-white">{artist.spotify_artist_id || "missing ID"}</span></div>
                <div className="rounded-xl border border-white/10 p-3 text-xs text-white/60">Apple Music<br/><span className="text-white">{artist.apple_music_artist_id || "missing ID"}</span></div>
                <div className="rounded-xl border border-white/10 p-3 text-xs text-white/60">YouTube<br/><span className="text-white">{artist.youtube_channel_id || "missing ID"}</span></div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-white/40">
                  {artist.last_catalog_sync_at ? "Last sync: " + new Date(artist.last_catalog_sync_at).toLocaleString() : "No sync yet"}
                </div>
                <form action={runCatalogSyncAction}>
                  <input type="hidden" name="artistId" value={artist.id} />
                  <button type="submit" className="rounded-full border border-gold/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-gold">
                    Sync Artist
                  </button>
                </form>
              </div>
              {artist.last_catalog_sync_error ? <p className="mt-3 text-xs text-red-200/75">{artist.last_catalog_sync_error}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <article className="admin-surface rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Recent runs</p>
          <div className="mt-4 space-y-3">
            {data.runs.length ? data.runs.map((run: any) => (
              <div key={run.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={"rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] " + statusClass(run.status)}>{run.status}</span>
                  <span className="text-xs text-white/35">{new Date(run.started_at).toLocaleString()}</span>
                </div>
                <p className="mt-3 text-sm text-white/65">
                  {run.discovered_count} discovered · {run.imported_count} imported · {run.updated_count} updated · {run.conflict_count} conflicts
                </p>
              </div>
            )) : <p className="text-sm text-white/45">No sync runs yet.</p>}
          </div>
        </article>

        <article className="admin-surface rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Needs review</p>
          <h2 className="mt-2 font-display text-3xl text-white">{data.conflicts.length} open conflicts</h2>
          <div className="mt-4 space-y-3">
            {data.conflicts.slice(0, 10).map((conflict: any) => (
              <div key={conflict.id} className="rounded-xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-gold">{conflict.platform} · {conflict.conflict_type.replaceAll("_", " ")}</p>
                <p className="mt-2 text-sm text-white/60">{conflict.reason}</p>
                <p className="mt-1 text-xs text-white/35">{String(conflict.external_item?.title ?? "")}</p>
              </div>
            ))}
            {!data.conflicts.length ? <p className="text-sm text-emerald-100/70">No catalog conflicts.</p> : null}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
