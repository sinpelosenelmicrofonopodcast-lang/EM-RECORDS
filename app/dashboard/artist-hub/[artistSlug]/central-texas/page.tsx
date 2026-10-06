import { applyCentralTexasAction, requestProductionBeatAccessAction, submitProductionDemoAction } from "@/lib/actions/platform";
import { getCentralTexasWorkspace } from "@/lib/central-texas";

export const dynamic = "force-dynamic";

export default async function CentralTexasArtistPage({ params }: { params: Promise<{ artistSlug: string }> }) {
  const { artistSlug } = await params;
  const data = await getCentralTexasWorkspace(artistSlug);
  const requestByBeat = new Map((data.requests ?? []).map((row: any) => [String(row.program_beat_id), row]));

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">EM Records · Central Texas</p>
        <h1 className="mt-2 font-display text-4xl text-white">Production Program</h1>
        <p className="mt-3 max-w-3xl text-white/65">Approved artists can preview production beats, request protected demo access, execute the required agreement and submit private demos for A&R review.</p>
        <p className="mt-3 text-sm text-white/50">Artist Readiness: {data.score}%</p>
        {!data.application ? (
          <form action={applyCentralTexasAction} className="mt-5">
            <input type="hidden" name="artistSlug" value={artistSlug} />
            <button className="rounded-full bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">Apply to program</button>
          </form>
        ) : <p className="mt-5 text-sm uppercase tracking-[0.16em] text-gold">Application: {data.application.status}</p>}
      </section>

      {data.application?.status === "approved" ? (
        <section className="space-y-4">
          <div><p className="text-xs uppercase tracking-[0.18em] text-gold">Protected catalog</p><h2 className="mt-2 text-3xl font-semibold text-white">Production Vault</h2></div>
          {(data.beats ?? []).length === 0 ? <p className="text-white/60">No production beats have been released to this program yet.</p> : null}
          {(data.beats ?? []).map((item: any) => {
            const request: any = requestByBeat.get(String(item.id));
            return (
              <article key={item.id} className="rounded-[24px] border border-white/10 bg-black/40 p-5">
                <div className="flex flex-wrap justify-between gap-4">
                  <div><h3 className="text-xl font-semibold text-white">{item.beat?.title ?? "Production Beat"}</h3><p className="mt-1 text-sm text-white/55">{item.beat?.bpm ?? "—"} BPM · {item.beat?.key ?? "Key N/A"} · {item.status}</p></div>
                  {item.beat?.preview_url ? <audio controls preload="none" src={item.beat.preview_url} className="max-w-full" /> : <span className="text-sm text-white/40">Preview pending</span>}
                </div>

                {request ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gold">Access request: {request.status}</span>
                    {request.status === "approved" ? <a className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold" href={"/api/artist-hub/production-beats/" + request.id + "/download"}>Protected download</a> : null}
                  </div>
                ) : item.status === "available" ? (
                  <form action={requestProductionBeatAccessAction} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="artistSlug" value={artistSlug} />
                    <input type="hidden" name="programBeatId" value={item.id} />
                    <input name="reason" placeholder="What do you hear on this beat?" className="min-w-[260px] flex-1 rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white" />
                    <button className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">Request demo access</button>
                  </form>
                ) : null}

                {request?.status === "approved" ? (
                  <form action={submitProductionDemoAction} className="mt-5 grid gap-3 rounded-2xl border border-white/10 p-4">
                    <input type="hidden" name="artistSlug" value={artistSlug} />
                    <input type="hidden" name="programBeatId" value={item.id} />
                    <input name="title" required placeholder="Song title" className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white" />
                    <input type="file" name="demoFile" required accept="audio/*" className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white" />
                    <textarea name="lyrics" rows={3} placeholder="Lyrics (optional)" className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white" />
                    <textarea name="notes" rows={2} placeholder="A&R notes / collaborators" className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white" />
                    <button className="justify-self-start rounded-full bg-gold px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-black">Submit private demo</button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      {(data.demos ?? []).length ? (
        <section className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-2xl font-semibold text-white">My production demos</h2>
          <div className="mt-4 space-y-2">{(data.demos ?? []).map((demo: any) => <p key={demo.id} className="text-sm text-white/65">{demo.title} · v{demo.version} · {demo.status}</p>)}</div>
        </section>
      ) : null}
    </div>
  );
}
