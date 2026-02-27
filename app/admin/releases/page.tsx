import { AdminShell } from "@/components/admin/admin-shell";
import { upsertReleaseAction } from "@/lib/actions/admin";
import { requireAdminPage } from "@/lib/auth";
import { getArtists, getReleasesAdmin } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function AdminReleasesPage() {
  await requireAdminPage();
  const [releases, artists] = await Promise.all([getReleasesAdmin(), getArtists()]);

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Releases Management</p>
        <h1 className="mt-2 font-display text-4xl text-white">Releases</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Create new release</p>
        <form action={upsertReleaseAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" required placeholder="Title" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <select name="format" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
            <option>Single</option>
            <option>EP</option>
            <option>Album</option>
          </select>
          <input name="coverUrl" required placeholder="Cover URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input type="date" name="releaseDate" required className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <select name="artistSlug" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2">
            <option value="">No linked artist</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.slug}>
                {artist.name}
              </option>
            ))}
          </select>
          <input
            name="artistName"
            placeholder="Display artist name (optional)"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <input
            name="featuring"
            placeholder="Featuring (optional)"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <textarea name="description" rows={4} required placeholder="Description" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
          <input name="spotifyEmbed" placeholder="Spotify embed URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="appleEmbed" placeholder="Apple embed URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="youtubeEmbed" placeholder="YouTube embed URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
          <select name="contentStatus" defaultValue="published" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
            <option value="published">published</option>
            <option value="scheduled">scheduled</option>
            <option value="draft">draft</option>
          </select>
          <input type="datetime-local" name="publishAt" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />

          <label className="md:col-span-2 flex items-center gap-2 text-sm text-white/75">
            <input type="checkbox" name="featured" className="h-4 w-4 rounded border-white/30 bg-black" />
            Set as featured release on homepage
          </label>

          <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
            Create Release
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Edit existing releases</p>
        <div className="mt-4 space-y-5">
          {releases.map((release) => (
            <form key={release.id} action={upsertReleaseAction} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-2">
              <input type="hidden" name="id" value={release.id} />
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-[0.16em] text-gold">ID: {release.id}</p>
              </div>

              <input
                name="title"
                required
                defaultValue={release.title}
                placeholder="Title"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <select
                name="format"
                defaultValue={release.format}
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              >
                <option>Single</option>
                <option>EP</option>
                <option>Album</option>
              </select>
              <input
                name="coverUrl"
                required
                defaultValue={release.coverUrl}
                placeholder="Cover URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                type="date"
                name="releaseDate"
                required
                defaultValue={String(release.releaseDate).slice(0, 10)}
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <select
                name="artistSlug"
                defaultValue={release.artistSlug ?? ""}
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
              >
                <option value="">No linked artist</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.slug}>
                    {artist.name}
                  </option>
                ))}
              </select>
              <input
                name="artistName"
                defaultValue={release.artistName ?? artists.find((artist) => artist.slug === release.artistSlug)?.name ?? ""}
                placeholder="Display artist name (optional)"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="featuring"
                defaultValue={release.featuring ?? ""}
                placeholder="Featuring (optional)"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <textarea
                name="description"
                rows={4}
                required
                defaultValue={release.description}
                placeholder="Description"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
              />
              <input
                name="spotifyEmbed"
                defaultValue={release.spotifyEmbed ?? ""}
                placeholder="Spotify embed URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="appleEmbed"
                defaultValue={release.appleEmbed ?? ""}
                placeholder="Apple embed URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="youtubeEmbed"
                defaultValue={release.youtubeEmbed ?? ""}
                placeholder="YouTube embed URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
              />
              <select
                name="contentStatus"
                defaultValue={release.contentStatus ?? "published"}
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              >
                <option value="published">published</option>
                <option value="scheduled">scheduled</option>
                <option value="draft">draft</option>
              </select>
              <input
                type="datetime-local"
                name="publishAt"
                defaultValue={release.publishAt ? new Date(release.publishAt).toISOString().slice(0, 16) : ""}
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />

              <label className="md:col-span-2 flex items-center gap-2 text-sm text-white/75">
                <input type="checkbox" name="featured" defaultChecked={release.featured} className="h-4 w-4 rounded border-white/30 bg-black" />
                Set as featured release on homepage
              </label>

              <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
                Update Release
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Catalog</p>
        <div className="mt-4 space-y-2">
          {releases.map((release) => (
            <div key={release.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/80">
              {release.title} · {release.format} · {formatDate(release.releaseDate)} ·{" "}
              {artists.find((artist) => artist.slug === release.artistSlug)?.name ?? release.artistName ?? "No artist"} ·{" "}
              {release.featuring ? `feat. ${release.featuring} · ` : ""}
              {release.contentStatus ?? "published"} {release.featured ? "· FEATURED" : ""}
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
