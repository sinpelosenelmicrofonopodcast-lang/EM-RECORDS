import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { updateFanWallEntryStatusAction } from "@/lib/actions/admin";
import { getFanWallEntriesAdmin } from "@/lib/queries";

export default async function AdminFanWallPage() {
  await requireAdminPage();
  const entries = await getFanWallEntriesAdmin();

  return (
    <AdminShell>
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Community</p>
        <h1 className="mt-3 font-display text-4xl text-white">Fan Wall Moderation</h1>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        {entries.length === 0 ? (
          <p className="text-sm text-white/65">No fan wall submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gold">{entry.artistSlug}</p>
                    <p className="mt-1 text-sm text-white/80">{entry.fanName}</p>
                    <p className="mt-3 text-sm text-white/75">{entry.message}</p>
                    <p className="mt-2 text-xs text-white/50">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/65">{entry.status}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={updateFanWallEntryStatusAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button type="submit" className="rounded-full border border-emerald-500/50 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-emerald-200">
                      Approve
                    </button>
                  </form>
                  <form action={updateFanWallEntryStatusAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button type="submit" className="rounded-full border border-rose-500/50 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-rose-200">
                      Reject
                    </button>
                  </form>
                  <form action={updateFanWallEntryStatusAction}>
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="status" value="pending" />
                    <button type="submit" className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-white/70">
                      Pending
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
