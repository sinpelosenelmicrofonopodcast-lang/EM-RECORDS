import { AdminShell } from "@/components/admin/admin-shell";
import {
  announceNextUpWinnerAction,
  resetNextUpVotesAction,
  updateNextUpSettingsAction,
  updateNextUpSubmissionStatusAction,
  upsertNextUpCompetitorAction
} from "@/lib/actions/admin";
import { requireAdminPage } from "@/lib/auth";
import { getNextUpCompetitorsAdmin, getNextUpLeaderboard, getNextUpSettings, getNextUpStatsAdmin, getNextUpSubmissionsAdmin } from "@/lib/queries";

function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export default async function AdminNextUpPage() {
  await requireAdminPage();
  const [stats, submissions, competitors, leaderboard, settings] = await Promise.all([
    getNextUpStatsAdmin(),
    getNextUpSubmissionsAdmin(),
    getNextUpCompetitorsAdmin(),
    getNextUpLeaderboard(),
    getNextUpSettings()
  ]);
  const liveFinalAt = settings.liveFinalAt ?? null;
  const votingStartsAt = settings.votingStartsAt ?? null;
  const votingEndsAt = settings.votingEndsAt ?? null;
  const votingEnabled = Boolean(settings.votingEnabled);
  const liveFinalAtFormatted = liveFinalAt ? new Date(liveFinalAt).toLocaleString() : null;
  const votingStartsAtFormatted = votingStartsAt ? new Date(votingStartsAt).toLocaleString() : null;
  const votingEndsAtFormatted = votingEndsAt ? new Date(votingEndsAt).toLocaleString() : null;

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Killeen Next Up Control</p>
        <h1 className="mt-2 font-display text-4xl text-white">Killeen Next Up</h1>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Live Final Countdown</p>
        <p className="mt-2 text-sm text-white/70">
          {liveFinalAtFormatted ? `Countdown visible for: ${liveFinalAtFormatted}` : "Countdown hidden. Set a date/time to publish it."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={updateNextUpSettingsAction} className="flex flex-wrap items-center gap-3">
            <input
              type="datetime-local"
              name="liveFinalAt"
              defaultValue={toDateTimeLocalValue(liveFinalAt)}
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <button type="submit" className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
              Save Live Date
            </button>
          </form>
          <form action={updateNextUpSettingsAction}>
            <input type="hidden" name="liveFinalAt" value="" />
            <button type="submit" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/75">
              Hide Countdown
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Voting Control</p>
          <p className="mt-2 text-sm text-white/70">
            Status: {votingEnabled ? "active" : "disabled"} {votingStartsAtFormatted ? `· start: ${votingStartsAtFormatted}` : ""}{" "}
            {votingEndsAtFormatted ? `· end: ${votingEndsAtFormatted}` : ""}
          </p>
          <form action={updateNextUpSettingsAction} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_1fr_auto] md:items-center">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="hidden" name="votingEnabled" value="false" />
              <input type="checkbox" name="votingEnabled" value="true" defaultChecked={votingEnabled} className="h-4 w-4 rounded border-white/30 bg-black" />
              Enable public voting
            </label>
            <input
              type="datetime-local"
              name="votingStartsAt"
              defaultValue={toDateTimeLocalValue(votingStartsAt)}
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <input
              type="datetime-local"
              name="votingEndsAt"
              defaultValue={toDateTimeLocalValue(votingEndsAt)}
              className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
            />
            <button type="submit" className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
              Save Voting Settings
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Submissions", stats.submissions],
          ["Pending Review", stats.pendingSubmissions],
          ["Competitors", stats.approvedCompetitors],
          ["Total Votes", stats.totalVotes]
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/55">{label}</p>
            <p className="mt-2 font-display text-3xl text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Submissions Review</p>
          <a
            href="/api/admin/next-up/export"
            className="rounded-full border border-gold/40 px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold hover:border-gold"
          >
            Export CSV
          </a>
        </div>
        <div className="mt-4 space-y-4">
          {submissions.map((submission) => (
            <article key={submission.id} className="rounded-xl border border-white/10 p-4">
              <p className="text-sm text-white">
                <span className="font-semibold">{submission.stageName}</span> · {submission.city}
              </p>
              <p className="mt-1 text-xs text-white/60">{submission.email}</p>
              <p className="mt-2 text-sm text-white/70">{submission.artistBio ?? "No bio provided."}</p>
              <a href={submission.demoUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs uppercase tracking-[0.16em] text-gold underline">
                Open Demo
              </a>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={updateNextUpSubmissionStatusAction}>
                  <input type="hidden" name="id" value={submission.id} />
                  <input type="hidden" name="status" value="approved" />
                  <input type="hidden" name="makeCompetitor" value="true" />
                  <button type="submit" className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
                    Approve
                  </button>
                </form>
                <form action={updateNextUpSubmissionStatusAction}>
                  <input type="hidden" name="id" value={submission.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button type="submit" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/75">
                    Reject
                  </button>
                </form>
                <p className="self-center text-xs uppercase tracking-[0.14em] text-white/45">{submission.status}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Competitors & Votes</p>
        <div className="mt-4 space-y-5">
          {competitors.map((competitor) => (
            <article key={competitor.id} className="rounded-xl border border-white/10 p-4">
              <form action={upsertNextUpCompetitorAction} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={competitor.id} />
                <input
                  name="stageName"
                  required
                  defaultValue={competitor.stageName}
                  placeholder="Stage name"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                />
                <input
                  name="city"
                  required
                  defaultValue={competitor.city}
                  placeholder="City"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                />
                <input
                  name="demoUrl"
                  required
                  defaultValue={competitor.demoUrl}
                  placeholder="Demo URL"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
                />
                <input
                  name="photoUrl"
                  defaultValue={competitor.photoUrl ?? ""}
                  placeholder="Photo URL"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
                />
                <input
                  type="file"
                  name="photoFile"
                  accept="image/*"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-gold file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.16em] file:text-black"
                />
                <input
                  name="socialLinks"
                  defaultValue={competitor.socialLinks ?? ""}
                  placeholder="Social links"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
                />
                <textarea
                  name="artistBio"
                  rows={3}
                  defaultValue={competitor.artistBio ?? ""}
                  placeholder="Artist bio"
                  className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold md:col-span-2"
                />
                <select name="status" defaultValue={competitor.status} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold">
                  <option value="approved">approved</option>
                  <option value="hidden">hidden</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-white/75">
                  <input type="checkbox" name="isWinner" defaultChecked={Boolean(competitor.isWinner)} className="h-4 w-4 rounded border-white/30 bg-black" />
                  Winner
                </label>

                <div className="md:col-span-2">
                  <button type="submit" className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
                    Save Competitor
                  </button>
                </div>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={resetNextUpVotesAction}>
                  <input type="hidden" name="competitorId" value={competitor.id} />
                  <button type="submit" className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/75">
                    Reset Votes
                  </button>
                </form>
                <form action={announceNextUpWinnerAction}>
                  <input type="hidden" name="competitorId" value={competitor.id} />
                  <button type="submit" className="rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
                    Announce Winner
                  </button>
                </form>
                <p className="ml-auto text-xs uppercase tracking-[0.16em] text-white/45">{competitor.votesCount} votes</p>
              </div>
            </article>
          ))}
        </div>

        <form action={resetNextUpVotesAction} className="mt-5">
          <button type="submit" className="rounded-full border border-red-400/40 px-5 py-2 text-xs uppercase tracking-[0.18em] text-red-300">
            Reset All Votes
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Top Ranking</p>
        <div className="mt-4 space-y-2">
          {leaderboard.slice(0, 5).map((entry) => (
            <div key={entry.competitorId} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/85">
              #{entry.rank} · {entry.stageName} · {entry.city} · {entry.votesCount} votes
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
