import { getArtistReadinessSnapshot } from "@/lib/central-texas";
import { updateArtistRequirementAction } from "@/lib/actions/platform";

export const dynamic = "force-dynamic";

export default async function ArtistReadinessPage({ params }: { params: Promise<{ artistSlug: string }> }) {
  const { artistSlug } = await params;
  const data = await getArtistReadinessSnapshot(artistSlug);
  const statusMap = new Map((data.statuses ?? []).map((row: any) => [String(row.requirement_id), row]));

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Professional profile</p>
        <h1 className="mt-2 font-display text-4xl text-white">Artist Readiness</h1>
        <p className="mt-3 text-white/65">Internal readiness indicator — not a legal certification.</p>
        <div className="mt-5 text-5xl font-semibold text-white">{data.score}%</div>
      </section>

      <div className="grid gap-4">
        {(data.requirements ?? []).map((requirement: any) => {
          const current: any = statusMap.get(String(requirement.id));
          return (
            <article key={requirement.id} className="rounded-[24px] border border-white/10 bg-black/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-gold">{requirement.category}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{requirement.title}</h2>
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase text-white/65">{current?.status ?? "missing"}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">{requirement.description}</p>
              {requirement.why_it_matters ? <p className="mt-2 text-sm text-white/55"><strong>Why it matters:</strong> {requirement.why_it_matters}</p> : null}
              {requirement.who_needs_it ? <p className="mt-2 text-sm text-white/55"><strong>Who needs it:</strong> {requirement.who_needs_it}</p> : null}
              {requirement.how_to_get_it ? <p className="mt-2 text-sm text-white/55"><strong>How to do it:</strong> {requirement.how_to_get_it}</p> : null}
              {requirement.official_resource_url ? <a className="mt-3 inline-block text-sm text-gold underline" href={requirement.official_resource_url} target="_blank" rel="noreferrer">Official resource</a> : null}

              <form action={updateArtistRequirementAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="artistSlug" value={artistSlug} />
                <input type="hidden" name="requirementId" value={requirement.id} />
                <input name="valueText" defaultValue={current?.value_text ?? ""} placeholder="Reference / account / note" className="min-w-[240px] flex-1 rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white" />
                <select name="status" defaultValue={current?.status === "not_applicable" ? "not_applicable" : "provided"} className="rounded-xl border border-white/15 bg-black px-3 py-2 text-sm text-white">
                  <option value="provided">Provided</option>
                  <option value="in_progress">In progress</option>
                  <option value="not_applicable">Not applicable</option>
                </select>
                <button className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">Save</button>
              </form>
            </article>
          );
        })}
      </div>
    </div>
  );
}
