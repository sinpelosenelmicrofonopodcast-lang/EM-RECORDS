import { AdminShell } from "@/components/admin/admin-shell";
import { SocialQueueManager } from "@/components/admin/social-queue-manager";
import {
  generateQueueContentAction,
  runGrowthAutomationAction,
  saveAutomationSettingsAction,
  saveSocialAccountAction
} from "@/modules/growth-engine/actions";
import { requireGrowthPageAccess } from "@/modules/growth-engine/auth";
import { getSocialEngineDashboardData } from "@/modules/social-engine/service";

type Props = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AdminSocialEnginePage({ searchParams }: Props) {
  const access = await requireGrowthPageAccess("admin");
  const [data, params] = await Promise.all([getSocialEngineDashboardData(), searchParams]);

  return (
    <AdminShell>
      {params.error ? <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{params.error}</div> : null}
      {params.success ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">{params.success}</div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Autonomous Control</p>
          <h1 className="mt-3 font-display text-4xl text-white">Social Engine</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/65">
            Centraliza generacion, aprobacion, scheduling y publishing del motor autonomo. La capa vieja de Meta sigue intacta; esta
            nueva capa vive encima y orquesta el sistema completo.
          </p>
        </div>

        {access.canManageAutomation ? (
          <form action={runGrowthAutomationAction}>
            <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
              Run Full Growth Cycle
            </button>
          </form>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          ["Queued", data.summary.queued],
          ["Scheduled", data.summary.scheduled],
          ["Posted", data.summary.posted],
          ["Manual", data.summary.readyForManual],
          ["Failed", data.summary.failed]
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
            <p className="mt-2 font-display text-3xl text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/55">Control Panel</p>
              <h2 className="mt-2 font-display text-2xl text-white">Automation Settings</h2>
            </div>
          </div>

          <form action={saveAutomationSettingsAction} className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
              <input type="checkbox" name="enabled" defaultChecked={data.settings.enabled} className="h-4 w-4 rounded border-white/30 bg-black" />
              Full automation enabled
            </label>
            <input
              type="number"
              min={1}
              max={20}
              name="postsPerDay"
              defaultValue={data.settings.postsPerDay}
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <input
              name="tone"
              defaultValue={data.settings.tone}
              placeholder="Tone"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <input
              name="language"
              defaultValue={data.settings.language}
              placeholder="Language"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <input
              name="bestPostingWindows"
              defaultValue={data.settings.bestPostingWindows.join(",")}
              placeholder="11,15,19"
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
            />

            {[
              ["mixSong", "Song mix", data.settings.contentMix.song ?? 0.3],
              ["mixReel", "Reel mix", data.settings.contentMix.reel ?? 0.25],
              ["mixStory", "Story mix", data.settings.contentMix.artist_story ?? 0.15],
              ["mixPromo", "Promo mix", data.settings.contentMix.promo ?? 0.15],
              ["mixViral", "Viral mix", data.settings.contentMix.viral ?? 0.15]
            ].map(([name, label, value]) => (
              <input
                key={String(name)}
                type="number"
                step="0.01"
                min={0}
                max={1}
                name={String(name)}
                defaultValue={Number(value)}
                placeholder={String(label)}
                className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
              />
            ))}

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">Platforms</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/75">
                {["instagram", "facebook", "tiktok", "youtube_shorts", "x"].map((platform) => (
                  <label key={platform} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
                    <input
                      type="checkbox"
                      name="platforms"
                      value={platform}
                      defaultChecked={data.settings.platformsEnabled.includes(platform as any)}
                      className="h-4 w-4 rounded border-white/30 bg-black"
                    />
                    {platform}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!access.canManageAutomation}
              className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold disabled:opacity-50 md:col-span-2 md:justify-self-start"
            >
              Save Automation Settings
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Content Studio</p>
          <h2 className="mt-2 font-display text-2xl text-white">Generate Drafts</h2>
          <form action={generateQueueContentAction} className="mt-5 grid gap-3">
            <select name="artistId" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
              {data.artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.stageName ?? artist.name}
                </option>
              ))}
            </select>
            <select name="contentType" defaultValue="song" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
              <option value="song">Song post</option>
              <option value="video">Video post</option>
              <option value="artist_story">Artist story</option>
              <option value="promo">Promo post</option>
              <option value="viral">Viral post</option>
            </select>
            <input type="datetime-local" name="scheduledAt" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75">
              <input type="checkbox" name="scheduleNow" className="h-4 w-4 rounded border-white/30 bg-black" />
              Send straight to scheduled queue
            </label>

            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/50">Targets</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/75">
                {data.settings.platformsEnabled.map((platform) => (
                  <label key={platform} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
                    <input type="checkbox" name="platforms" value={platform} defaultChecked className="h-4 w-4 rounded border-white/30 bg-black" />
                    {platform}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
              Generate AI Draft
            </button>
          </form>
        </article>
      </section>

      {access.canManageTokens ? (
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Platform Credentials</p>
          <h2 className="mt-2 font-display text-2xl text-white">Social Accounts</h2>
          <form action={saveSocialAccountAction} className="mt-5 grid gap-3 md:grid-cols-2">
            <select name="platform" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube_shorts">YouTube Shorts</option>
              <option value="x">X</option>
            </select>
            <input name="accountLabel" placeholder="Account label" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input name="accountIdentifier" placeholder="Page / channel / account id" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input name="tokenExpiresAt" type="datetime-local" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold" />
            <input name="accessToken" placeholder="Access token" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
            <input name="refreshToken" placeholder="Refresh token" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2" />
            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white/75 md:col-span-2">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4 rounded border-white/30 bg-black" />
              Active social account
            </label>
            <button type="submit" className="rounded-full border border-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold md:col-span-2 md:justify-self-start">
              Save Social Account
            </button>
          </form>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.accounts.map((account) => (
              <article key={account.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">{account.platform}</p>
                <p className="mt-2 text-lg text-white">{account.accountLabel ?? account.accountIdentifier ?? "Unnamed account"}</p>
                <p className="mt-2 text-sm text-white/60">Token: {account.tokenConfigured ? "configured" : "missing"}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Queue Manager</p>
        <h2 className="mt-2 font-display text-2xl text-white">Drag, Review, Approve</h2>
        <div className="mt-5">
          <SocialQueueManager initialQueue={data.queue} canApprove={access.canApproveContent} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Reels Factory</p>
          <div className="mt-4 space-y-3">
            {data.queue.filter((item) => item.contentType === "reel").slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 px-4 py-3">
                <p className="text-sm text-white">{item.title ?? item.artistName ?? "Untitled reel"}</p>
                <p className="mt-1 text-xs text-white/50">{item.overlayText ?? item.hook}</p>
              </div>
            ))}
            {data.queue.filter((item) => item.contentType === "reel").length === 0 ? <p className="text-sm text-white/55">No reel drafts yet.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Viral Center</p>
          <div className="mt-4 space-y-3">
            {data.viralPool.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white">{item.source}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">{item.performanceScore.toFixed(2)}</p>
                </div>
                <p className="mt-2 text-sm text-white/60">{item.caption ?? "No source caption."}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">AI Strategy Panel</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.learningMemory.map((memory) => (
            <article key={memory.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-gold">{memory.patternType}</p>
              <p className="mt-2 text-sm text-white">{memory.pattern}</p>
              <p className="mt-2 text-xs text-white/45">Confidence {memory.confidenceScore.toFixed(2)}</p>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
