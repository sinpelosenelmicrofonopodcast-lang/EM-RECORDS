import Link from "next/link";
import { HubShell } from "@/components/artist-hub/hub-shell";
import { getMyHubArtists } from "@/lib/artist-hub/page";
import { roleForArtist } from "@/lib/artist-hub/service";

export const dynamic = "force-dynamic";

export default async function ArtistHubHomePage() {
  const { ctx, artists } = await getMyHubArtists();

  return (
    <HubShell>
      <header className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-gold">EM Records</p>
        <h1 className="mt-2 font-display text-4xl text-white">Artist Hub</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          Launch center, media kit, documents, content approval and reporting in one secure portal.
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/45">Signed in as {ctx.user.email ?? ctx.user.id}</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">My artists</p>
          {ctx.isAdmin ? (
            <Link href="/dashboard/admin/artist-hub" className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.18em] text-gold">
              Admin controls
            </Link>
          ) : null}
        </div>

        {artists.length === 0 ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-black/40 px-4 py-6 text-sm text-white/70">
            No artist assignments yet. Ask admin to add you in Artist Hub memberships.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {artists.map((artist) => {
              const role = roleForArtist(ctx, artist.id);
              return (
                <article key={artist.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">{role ?? "member"}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{artist.stageName || artist.name}</h2>
                  <p className="mt-1 text-sm text-white/60">/{artist.slug}</p>
                  <p className="mt-3 text-sm text-white/70">{artist.bioShort || artist.tagline || "No short bio yet."}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/dashboard/artist-hub/${artist.slug}/catalog`} className="rounded-full border border-gold/40 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-gold hover:border-gold">
                      Open hub
                    </Link>
                    <Link href={`/dashboard/artist-hub/${artist.slug}/launch`} className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/75 hover:text-white">
                      Launch center
                    </Link>
                    <Link href={`/dashboard/artist-hub/${artist.slug}/media-kit`} className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/75 hover:text-white">
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
