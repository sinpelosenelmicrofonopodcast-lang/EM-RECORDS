import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { getDemoSubmissions } from "@/lib/queries";
import { updateDemoStatusAction } from "@/lib/actions/admin";
import { formatDate } from "@/lib/utils";

export default async function AdminDemosPage() {
  await requireAdminPage();
  const demos = await getDemoSubmissions();

  return (
    <AdminShell>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Demo Submissions</p>
        <h1 className="mt-2 font-display text-4xl text-white">A&R Review</h1>
      </div>

      <div className="space-y-3">
        {demos.map((demo) => (
          <article key={demo.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="md:flex md:items-start md:justify-between">
              <div>
                <p className="font-display text-2xl text-white">{demo.trackTitle}</p>
                <p className="mt-1 text-sm text-white/65">
                  {demo.artistName} · {demo.email}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(demo.createdAt)}</p>
              </div>
              <a href={demo.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-gold underline underline-offset-4 md:mt-0">
                Listen file
              </a>
            </div>

            {demo.message ? <p className="mt-3 text-sm text-white/70">{demo.message}</p> : null}

            <form action={updateDemoStatusAction} className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={demo.id} />
              <select name="status" defaultValue={demo.status} className="rounded-full border border-white/20 bg-black px-4 py-2 text-xs uppercase tracking-[0.15em] text-white">
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
              <button type="submit" className="rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold">
                Update
              </button>
            </form>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
