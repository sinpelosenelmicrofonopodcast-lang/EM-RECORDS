import Link from "next/link";
import { HubShell } from "@/components/artist-hub/hub-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { getMyHubArtists } from "@/lib/artist-hub/page";
import { roleForArtist } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

export default async function ArtistHubHomePage() {
  const { ctx, artists } = await getMyHubArtists();

  return (
    <HubShell>
      <PageIntro
        eyebrow="EM Records"
        title="Artist Hub"
        description="Launch center, media kit, documents, approvals and reporting in one secure portal."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-white/45">Signed in as {ctx.user.email ?? ctx.user.id}</p>
            <Link
              href="/dashboard/signing"
              className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold transition hover:bg-gold/10"
            >
              Artist signing portal
            </Link>
          </div>
        }
      />

      <section className="app-panel rounded-[28px] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">My artists</p>
            <p className="mt-2 text-sm text-white/60">Open the workspace that matches the artist account you are actively managing.</p>
          </div>
          {ctx.isAdmin ? (
            <Link href="/dashboard/admin/artist-hub" className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.18em] text-gold transition hover:bg-gold/10">
              Admin controls
            </Link>
          ) : null}
        </div>

        {artists.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-black/35 px-5 py-8">
            <p className="text-sm text-white/70">No artist assignments yet. Ask admin to add you to Artist Hub memberships before using this workspace.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {artists.map((artist) => {
              const role = roleForArtist(ctx, artist.id);
              return (
                <article key={artist.id} className="metric-card rounded-[24px] p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">{role ?? "member"}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{artist.stageName || artist.name}</h2>
                  <p className="mt-1 text-sm text-white/60">/{artist.slug}</p>
                  <p className="mt-3 min-h-[2.75rem] text-sm leading-relaxed text-white/70">
                    {artist.bioShort || artist.tagline || "No short bio available yet."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/artist-hub/${artist.slug}/catalog`}
                      className="rounded-full border border-gold/40 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-gold transition hover:border-gold"
                    >
                      Open hub
                    </Link>
                    <Link
                      href={`/dashboard/artist-hub/${artist.slug}/launch`}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/75 transition hover:text-white"
                    >
                      Launch center
                    </Link>
                    <Link
                      href={`/dashboard/artist-hub/${artist.slug}/media-kit`}
                      className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/75 transition hover:text-white"
                    >
                      Media kit
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </HubShell>
  );
}
