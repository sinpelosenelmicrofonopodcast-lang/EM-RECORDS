import { AdminShell } from "@/components/admin/admin-shell";
import {
  processSocialQueueAction,
  publishSocialPostAction,
  retrySocialPostAction,
  upsertSocialPublishingSettingsAction
} from "@/lib/actions/admin";
import { requireAdminPage } from "@/lib/auth";
import { getSocialPublishingEnvStatus } from "@/lib/social-publishing";
import { getSocialPostJobsAdmin, getSocialPublishingSettings } from "@/lib/queries";

function statusClass(status: string): string {
  if (status === "sent") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-400/30 bg-red-400/10 text-red-200";
  if (status === "skipped") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (status === "processing") return "border-sky-400/30 bg-sky-400/10 text-sky-100";
  return "border-white/15 bg-black/40 text-white/70";
}

export default async function AdminSocialPublishingPage() {
  await requireAdminPage();
  const [settings, jobs] = await Promise.all([getSocialPublishingSettings(), getSocialPostJobsAdmin()]);
  const envStatus = getSocialPublishingEnvStatus();

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Meta Publishing</p>
        <h1 className="mt-2 font-display text-4xl text-white">Social Publishing</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          Publica directo a Facebook e Instagram desde el dashboard, arma bundles aleatorios con releases y deja activos los
          disparos automáticos para releases, artistas, videos y news.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Facebook Page ID", envStatus.facebookPageIdConfigured],
          ["Page Access Token", envStatus.pageAccessTokenConfigured],
          ["Instagram Business ID", envStatus.instagramBusinessIdConfigured]
        ].map(([label, ready]) => (
          <article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
            <p className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${ready ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/30 bg-red-400/10 text-red-200"}`}>
              {ready ? "Configured" : "Missing"}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">Auto rules</p>
            <h2 className="mt-2 font-display text-2xl text-white">Automation Settings</h2>
          </div>
          <form action={processSocialQueueAction}>
            <button
              type="submit"
              className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 hover:border-gold hover:text-gold"
            >
              Process Pending Queue
            </button>
          </form>
        </div>

        <form action={upsertSocialPublishingSettingsAction} className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="facebookEnabled" defaultChecked={settings.facebookEnabled} className="h-4 w-4 rounded border-white/30 bg-black" />
            Facebook enabled
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="instagramEnabled" defaultChecked={settings.instagramEnabled} className="h-4 w-4 rounded border-white/30 bg-black" />
            Instagram enabled
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoReleaseFacebook" defaultChecked={settings.autoReleaseFacebook} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post releases to Facebook
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoReleaseInstagram" defaultChecked={settings.autoReleaseInstagram} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post releases to Instagram
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoArtistFacebook" defaultChecked={settings.autoArtistFacebook} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post artist updates to Facebook
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoArtistInstagram" defaultChecked={settings.autoArtistInstagram} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post artist updates to Instagram
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoVideoFacebook" defaultChecked={settings.autoVideoFacebook} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post new videos to Facebook
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoVideoInstagram" defaultChecked={settings.autoVideoInstagram} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post new videos to Instagram
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoNewsFacebook" defaultChecked={settings.autoNewsFacebook} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post news to Facebook
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
            <input type="checkbox" name="autoNewsInstagram" defaultChecked={settings.autoNewsInstagram} className="h-4 w-4 rounded border-white/30 bg-black" />
            Auto post news to Instagram
          </label>

          <input
            type="number"
            min={1}
            max={6}
            name="randomBundleSize"
            defaultValue={settings.randomBundleSize}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            placeholder="Random bundle size"
          />
          <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/60">
            Usa los templates para controlar el copy automático. <code>{"{{links}}"}</code> inserta los URLs generados.
          </div>

          <textarea
            name="releaseTemplate"
            rows={4}
            defaultValue={settings.releaseTemplate}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <textarea
            name="artistTemplate"
            rows={4}
            defaultValue={settings.artistTemplate}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <textarea
            name="videoTemplate"
            rows={4}
            defaultValue={settings.videoTemplate}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <textarea
            name="newsTemplate"
            rows={4}
            defaultValue={settings.newsTemplate}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <textarea
            name="randomTemplate"
            rows={4}
            defaultValue={settings.randomTemplate}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
          />

          <button
            type="submit"
            className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start"
          >
            Save Social Settings
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Composer</p>
        <h2 className="mt-2 font-display text-2xl text-white">Post Now From Dashboard</h2>
        <form action={publishSocialPostAction} className="mt-5 grid gap-3 md:grid-cols-2">
          <input
            name="title"
            placeholder="Internal title (optional)"
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <select name="preset" defaultValue="custom" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
            <option value="custom">Custom copy</option>
            <option value="random_releases">Random release bundle</option>
            <option value="latest_release">Latest release</option>
            <option value="latest_video">Latest video</option>
            <option value="latest_artist">Latest artist update</option>
            <option value="latest_news">Latest news article</option>
          </select>
          <textarea
            name="message"
            rows={5}
            placeholder="Main caption / copy. If you choose a preset, this text will be prepended."
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
          />
          <textarea
            name="linkUrls"
            rows={4}
            placeholder={"One URL per line\nhttps://emrecordsmusic.com/music/...\nhttps://open.spotify.com/..."}
            className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <div className="grid gap-3">
            <input
              name="mediaUrl"
              placeholder="Public image URL for Instagram (optional)"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <input
              type="number"
              min={1}
              max={6}
              name="itemCount"
              defaultValue={settings.randomBundleSize}
              placeholder="Random item count"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
              <input type="checkbox" name="postToFacebook" defaultChecked className="h-4 w-4 rounded border-white/30 bg-black" />
              Post to Facebook
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
              <input type="checkbox" name="postToInstagram" defaultChecked className="h-4 w-4 rounded border-white/30 bg-black" />
              Post to Instagram
            </label>
          </div>

          <button
            type="submit"
            className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black md:col-span-2 md:justify-self-start"
          >
            Publish Now
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Queue / Log</p>
        <h2 className="mt-2 font-display text-2xl text-white">Recent Social Jobs</h2>

        <div className="mt-5 space-y-4">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-4 text-sm text-white/60">No social jobs yet.</div>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${statusClass(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/65">
                        {job.platform}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/65">
                        {job.contentType}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-white">{job.title || job.triggerType}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
                      {job.triggerType} · attempts {job.attemptCount} · {job.createdAt ? new Date(job.createdAt).toLocaleString("en-US") : "now"}
                    </p>
                    {job.lastError ? <p className="mt-3 text-sm text-red-200">{job.lastError}</p> : null}
                  </div>
                  {(job.status === "failed" || job.status === "skipped") && (
                    <form action={retrySocialPostAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold hover:bg-gold/10"
                      >
                        Retry
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AdminShell>
  );
}
