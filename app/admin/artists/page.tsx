import { AdminShell } from "@/components/admin/admin-shell";
import { upsertArtistAction } from "@/lib/actions/admin";
import { requireAdminPage } from "@/lib/auth";
import { getArtists } from "@/lib/queries";
import { syncArtistContentAction } from "@/modules/growth-engine/actions";
import { getArtistsGrowthStatus } from "@/modules/artist-ingestion/service";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminArtistsPage({ searchParams }: Props) {
  await requireAdminPage();
  const [artists, growthStatus, params] = await Promise.all([getArtists(), getArtistsGrowthStatus(), searchParams]);

  return (
    <AdminShell>
      {params.error ? <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{params.error}</div> : null}
      {params.success ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">{params.success}</div>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Artists Management</p>
        <h1 className="mt-2 font-display text-4xl text-white">Artists</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Artist Ingestion</p>
            <h2 className="mt-2 font-display text-2xl text-white">Connected Sources</h2>
          </div>
          <form action={syncArtistContentAction}>
            <button type="submit" className="rounded-full border border-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Sync All Artists
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {growthStatus.map((artist) => (
            <article key={artist.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{artist.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{artist.active ? "active" : "inactive"}</p>
                </div>
                <form action={syncArtistContentAction}>
                  <input type="hidden" name="artistId" value={artist.id} />
                  <button type="submit" className="rounded-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/70">
                    Sync artist
                  </button>
                </form>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">Cache items: {artist.cacheItems}</div>
                <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">Indexed assets: {artist.assets}</div>
                <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">Spotify: {artist.spotifyConnected ? "connected" : "missing"}</div>
                <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">YouTube: {artist.youtubeConnected ? "connected" : "missing"}</div>
                <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">Instagram: {artist.instagramConnected ? "connected" : "missing"}</div>
                <div className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">TikTok: {artist.tiktokConnected ? "connected" : "missing"}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Create new artist</p>
        <form action={upsertArtistAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="Name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="slug" required placeholder="Slug" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="tagline" required placeholder="Tagline" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
          <textarea name="bio" required rows={4} placeholder="Bio" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
          <input name="heroMediaUrl" required placeholder="Hero image/video URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="avatarUrl" required placeholder="Avatar URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="bookingEmail" required placeholder="Booking email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="pressKitUrl" placeholder="Press kit URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="mediaKitUrl" placeholder="Media kit URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input type="file" name="pressKitFile" accept=".pdf,.zip,.rar,.doc,.docx,.ppt,.pptx,image/*" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.16em] file:text-black" />
          <input type="file" name="mediaKitFile" accept=".pdf,.zip,.rar,.doc,.docx,.ppt,.pptx,image/*,video/*" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.16em] file:text-black" />
          <input name="spotifyUrl" placeholder="Spotify URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="appleMusicUrl" placeholder="Apple Music URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="youtubeUrl" placeholder="YouTube URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="spotifyEmbed" placeholder="Spotify Embed URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="soundcloudEmbed" placeholder="SoundCloud URL or Embed" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="musicVideoEmbed" placeholder="Music Video URL or Embed" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="interviewUrl1" placeholder="Interview Link 1" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="interviewUrl2" placeholder="Interview Link 2" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="instagramUrl" placeholder="Instagram URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="tiktokUrl" placeholder="TikTok URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="xUrl" placeholder="X (Twitter) URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <input name="facebookUrl" placeholder="Facebook URL" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <label className="flex items-center gap-2 text-sm text-white/75">
            <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 rounded border-white/30 bg-black" />
            Publish artist publicly
          </label>
          <input type="datetime-local" name="publishedAt" placeholder="Published at (optional)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <select name="platformPreference" defaultValue="spotify" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
            <option value="spotify">Default platform: Spotify</option>
            <option value="apple">Default platform: Apple Music</option>
            <option value="youtube">Default platform: YouTube</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-white/75">
            <input type="checkbox" name="epkEnabled" className="h-4 w-4 rounded border-white/30 bg-black" />
            Enable private EPK page
          </label>
          <input name="epkPassword" type="password" placeholder="EPK Password (optional)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
          <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start">
            Create Artist
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Edit existing artists</p>
        <div className="mt-4 space-y-5">
          {artists.map((artist) => (
            <form key={artist.id} action={upsertArtistAction} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-2">
              <input type="hidden" name="id" value={artist.id} />
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-[0.16em] text-gold">ID: {artist.id}</p>
              </div>

              <input
                name="name"
                required
                defaultValue={artist.name}
                placeholder="Name"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="slug"
                required
                defaultValue={artist.slug}
                placeholder="Slug"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="tagline"
                required
                defaultValue={artist.tagline}
                placeholder="Tagline"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
              />
              <textarea
                name="bio"
                required
                rows={4}
                defaultValue={artist.bio}
                placeholder="Bio"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
              />
              <input
                name="heroMediaUrl"
                required
                defaultValue={artist.heroMediaUrl}
                placeholder="Hero image/video URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="avatarUrl"
                required
                defaultValue={artist.avatarUrl}
                placeholder="Avatar URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="bookingEmail"
                required
                defaultValue={artist.bookingEmail}
                placeholder="Booking email"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="pressKitUrl"
                defaultValue={artist.pressKitUrl ?? ""}
                placeholder="Press kit URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="mediaKitUrl"
                defaultValue={artist.mediaKitUrl ?? ""}
                placeholder="Media kit URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                type="file"
                name="pressKitFile"
                accept=".pdf,.zip,.rar,.doc,.docx,.ppt,.pptx,image/*"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.16em] file:text-black"
              />
              <input
                type="file"
                name="mediaKitFile"
                accept=".pdf,.zip,.rar,.doc,.docx,.ppt,.pptx,image/*,video/*"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.16em] file:text-black"
              />
              <input
                name="spotifyUrl"
                defaultValue={artist.spotifyUrl ?? ""}
                placeholder="Spotify URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="appleMusicUrl"
                defaultValue={artist.appleMusicUrl ?? ""}
                placeholder="Apple Music URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="youtubeUrl"
                defaultValue={artist.youtubeUrl ?? ""}
                placeholder="YouTube URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="spotifyEmbed"
                defaultValue={artist.spotifyEmbed ?? ""}
                placeholder="Spotify Embed URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="soundcloudEmbed"
                defaultValue={artist.soundcloudEmbed ?? ""}
                placeholder="SoundCloud URL or Embed"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="musicVideoEmbed"
                defaultValue={artist.musicVideoEmbed ?? ""}
                placeholder="Music Video URL or Embed"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="interviewUrl1"
                defaultValue={artist.interviewUrl1 ?? ""}
                placeholder="Interview Link 1"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="interviewUrl2"
                defaultValue={artist.interviewUrl2 ?? ""}
                placeholder="Interview Link 2"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="instagramUrl"
                defaultValue={artist.instagramUrl ?? ""}
                placeholder="Instagram URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="tiktokUrl"
                defaultValue={artist.tiktokUrl ?? ""}
                placeholder="TikTok URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="xUrl"
                defaultValue={artist.xUrl ?? ""}
                placeholder="X (Twitter) URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <input
                name="facebookUrl"
                defaultValue={artist.facebookUrl ?? ""}
                placeholder="Facebook URL"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <label className="flex items-center gap-2 text-sm text-white/75">
                <input type="checkbox" name="isPublished" defaultChecked={artist.isPublished !== false} className="h-4 w-4 rounded border-white/30 bg-black" />
                Publish artist publicly
              </label>
              <input
                type="datetime-local"
                name="publishedAt"
                defaultValue={artist.publishedAt ? new Date(artist.publishedAt).toISOString().slice(0, 16) : ""}
                placeholder="Published at (optional)"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <select
                name="platformPreference"
                defaultValue={artist.platformPreference ?? "spotify"}
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              >
                <option value="spotify">Default platform: Spotify</option>
                <option value="apple">Default platform: Apple Music</option>
                <option value="youtube">Default platform: YouTube</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-white/75">
                <input type="checkbox" name="epkEnabled" defaultChecked={Boolean(artist.epkEnabled)} className="h-4 w-4 rounded border-white/30 bg-black" />
                Enable private EPK page
              </label>
              <input
                name="epkPassword"
                type="password"
                placeholder="New EPK Password (leave blank to keep current)"
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
              <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
                Update Artist
              </button>
            </form>
          ))}
        </div>
      </section>

    </AdminShell>
  );
}
