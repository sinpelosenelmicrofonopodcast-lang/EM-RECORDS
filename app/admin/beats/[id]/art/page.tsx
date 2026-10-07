import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { regenerateBeatArtAction, setBeatArtStyleAction, useBeatArtVariantAction, useGeneratedBeatCoverAction, useManualBeatCoverAction } from "@/lib/actions/admin-beats";
import { requireAdminPage } from "@/lib/auth";
import { beatArtUrl, cleanBeatTitle } from "@/lib/beat-art";
import { createServiceClient } from "@/lib/supabase/service";

const styles=["signature","neon","noir","luxury","velvet"];

export default async function BeatArtStudio({params}:{params:Promise<{id:string}>}){
  await requireAdminPage();
  const {id}=await params;
  const service=createServiceClient();
  const {data:beat,error}=await service.from("beats")
    .select("id,title,bpm,key,genre,mood,tags,status,cover_url,is_exclusive_sold,art_mode,art_style,art_seed,art_version")
    .eq("id",id).maybeSingle();
  if(error||!beat) throw new Error(error?.message||"Beat not found.");

  const seed=Number(beat.art_seed||1),style=String(beat.art_style||"signature"),version=Number(beat.art_version||1);
  const current=beatArtUrl(String(beat.id),version);
  const variants=[seed+1,seed+2,seed+3,seed+4];

  return <AdminShell>
    <PageIntro eyebrow="Beat Art Studio" title={cleanBeatTitle(String(beat.title))} description="Brand-controlled artwork: no AI text glitches, no random logos. Pick a visual direction and EM Records keeps the typography and metadata consistent." actions={<Link href="/admin/beats" className="rounded-full border border-white/15 px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-white/70">Back to Beats</Link>}/>

    <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <article className="admin-surface rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Current Cover</p>
        <div className="mt-4 aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black"><img src={String(beat.art_mode||"generated")==="generated"?current:String(beat.cover_url||current)} alt="" className="h-full w-full object-cover"/></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <form action={regenerateBeatArtAction}><input type="hidden" name="id" value={beat.id}/><button className="w-full rounded-full bg-gold px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-black">Regenerate</button></form>
          {beat.cover_url?<form action={String(beat.art_mode||"generated")==="generated"?useManualBeatCoverAction:useGeneratedBeatCoverAction}><input type="hidden" name="id" value={beat.id}/><button className="w-full rounded-full border border-white/15 px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/70">{String(beat.art_mode||"generated")==="generated"?"Use Manual Cover":"Use Generated Cover"}</button></form>:null}
        </div>

        <form action={setBeatArtStyleAction} className="mt-5 grid gap-3">
          <input type="hidden" name="id" value={beat.id}/>
          <label className="text-[10px] uppercase tracking-[0.16em] text-white/45">Visual Style</label>
          <div className="flex gap-2"><select name="style" defaultValue={style} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white">{styles.map(s=><option key={s} value={s}>{s}</option>)}</select><button className="rounded-xl border border-gold/50 px-4 text-xs uppercase tracking-[0.14em] text-gold">Apply</button></div>
        </form>

        <div className="mt-5 grid gap-2 text-xs text-white/50">
          <p>{beat.genre||"EM Records"} · {beat.bpm||"BPM from title"} · {beat.key||"Key open"} · {beat.mood||"Mood auto"}</p>
          <p>Seed {seed} · Version {version}</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <a href={"/api/beat-art/"+beat.id+"?format=square&download=1&v="+version} className="rounded-xl border border-white/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.12em] text-white/60">3000×3000</a>
          <a href={"/api/beat-art/"+beat.id+"?format=youtube&download=1&v="+version} className="rounded-xl border border-white/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.12em] text-white/60">1280×720</a>
          <a href={"/api/beat-art/"+beat.id+"?format=vertical&download=1&v="+version} className="rounded-xl border border-white/10 px-3 py-2 text-center text-[10px] uppercase tracking-[0.12em] text-white/60">1080×1920</a>
        </div>
      </article>

      <article className="admin-surface rounded-3xl p-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Variations</p>
        <h2 className="mt-2 font-display text-3xl text-white">Choose a direction</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {variants.map(v=><div key={v} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div className="aspect-square"><img src={"/api/beat-art/"+beat.id+"?format=square&style="+encodeURIComponent(style)+"&seed="+v} alt="" loading="lazy" className="h-full w-full object-cover"/></div>
            <form action={useBeatArtVariantAction} className="p-3"><input type="hidden" name="id" value={beat.id}/><input type="hidden" name="style" value={style}/><input type="hidden" name="seed" value={v}/><button className="w-full rounded-full border border-gold/50 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-gold">Use this variation</button></form>
          </div>)}
        </div>
      </article>
    </section>

    {beat.cover_url?<section className="admin-surface rounded-3xl p-5"><p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Original cover preserved</p><div className="mt-4 flex items-center gap-4"><img src={beat.cover_url} alt="" className="h-24 w-24 rounded-xl object-cover"/><p className="max-w-xl text-sm text-white/55">Your old artwork is untouched. You can switch back to it at any time.</p></div></section>:null}
  </AdminShell>;
}
