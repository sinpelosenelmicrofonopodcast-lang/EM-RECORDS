import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth";
import { getCentralTexasAdminSnapshot } from "@/lib/central-texas";
import { adminAddProgramBeatAction, adminReviewBeatAccessAction, adminReviewProgramApplicationAction, adminSelectProductionDemoAction } from "@/lib/actions/platform";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function AdminCentralTexasPage() {
  await requireAdminPage();
  const data = await getCentralTexasAdminSnapshot();
  const service = createServiceClient();
  const { data: availableBeats } = await service.from("beats").select("id,title,bpm,key,status").in("status", ["published", "needs_review"]).order("title");
  const profiles = new Map((data.profiles ?? []).map((row: any) => [String(row.id), row]));
  const beatRows = new Map((data.beatRows ?? []).map((row: any) => [String(row.id), row]));

  return (
    <AdminShell>
      <div><p className="text-xs uppercase tracking-[0.2em] text-gold">A&R Production</p><h1 className="mt-2 font-display text-4xl text-white">Central Texas Control</h1></div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold text-white">Add beat to Production Vault</h2>
        <form action={adminAddProgramBeatAction} className="mt-4 flex flex-wrap gap-2">
          <select name="beatId" required className="min-w-[280px] rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white">
            <option value="">Choose beat</option>
            {(availableBeats ?? []).map((beat: any) => <option key={beat.id} value={beat.id}>{beat.title} · {beat.bpm ?? "—"} BPM · {beat.status}</option>)}
          </select>
          <button className="rounded-full border border-gold px-4 py-2 text-xs uppercase text-gold">Add</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">Applications</h2>
        {(data.applications ?? []).map((application: any) => {
          const profile: any = profiles.get(String(application.artist_profile_id));
          return <article key={application.id} className="rounded-2xl border border-white/10 p-4">
            <p className="font-semibold text-white">{profile?.stage_name || profile?.legal_name || application.artist_profile_id}</p>
            <p className="text-sm text-white/50">{profile?.email} · {application.status}</p>
            <form action={adminReviewProgramApplicationAction} className="mt-3 flex gap-2">
              <input type="hidden" name="applicationId" value={application.id} />
              <select name="status" defaultValue={application.status} className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white">
                {["under_review", "needs_information", "verified", "approved", "rejected", "suspended"].map((value) => <option key={value}>{value}</option>)}
              </select>
              <button className="rounded-full border border-gold px-4 py-2 text-xs uppercase text-gold">Update</button>
            </form>
          </article>;
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">Beat access requests</h2>
        {(data.requests ?? []).map((request: any) => {
          const profile: any = profiles.get(String(request.artist_profile_id));
          return <article key={request.id} className="rounded-2xl border border-white/10 p-4">
            <p className="font-semibold text-white">{profile?.stage_name || profile?.legal_name || request.artist_profile_id}</p>
            <p className="text-sm text-white/50">{request.status} · request {request.id}</p>
            <form action={adminReviewBeatAccessAction} className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
              <input type="hidden" name="requestId" value={request.id} />
              <select name="decision" defaultValue={request.status} className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white">
                {["approved", "needs_information", "rejected", "revoked", "closed"].map((value) => <option key={value}>{value}</option>)}
              </select>
              <input name="contractId" defaultValue={request.contract_id ?? ""} placeholder="Fully executed Beat Demo Agreement contract UUID" className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white" />
              <button className="rounded-full border border-gold px-4 py-2 text-xs uppercase text-gold">Save</button>
            </form>
          </article>;
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">Submitted production demos</h2>
        {(data.demos ?? []).map((demo: any) => {
          const profile: any = profiles.get(String(demo.artist_profile_id));
          return <article key={demo.id} className="rounded-2xl border border-white/10 p-4">
            <p className="font-semibold text-white">{demo.title} · {profile?.stage_name || profile?.legal_name || "Artist"}</p>
            <p className="text-sm text-white/50">v{demo.version} · {demo.status}</p>
            {["submitted", "in_review", "shortlisted", "callback", "revision_requested"].includes(demo.status) ? (
              <form action={adminSelectProductionDemoAction} className="mt-3">
                <input type="hidden" name="demoId" value={demo.id} />
                <button className="rounded-full bg-gold px-4 py-2 text-xs font-semibold uppercase text-black">Select & lock beat</button>
              </form>
            ) : null}
          </article>;
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">Program beats</h2>
        {(data.beats ?? []).map((programBeat: any) => {
          const beat: any = beatRows.get(String(programBeat.beat_id));
          return <p key={programBeat.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70">{beat?.title || programBeat.beat_id} · {programBeat.status}</p>;
        })}
      </section>
    </AdminShell>
  );
}
