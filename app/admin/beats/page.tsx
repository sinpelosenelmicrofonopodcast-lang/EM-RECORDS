import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { updateBeatCatalogStatusAction } from "@/lib/actions/admin-beats";
import { requireAdminPage } from "@/lib/auth";
import { beatArtUrl } from "@/lib/beat-art";
import { createServiceClient } from "@/lib/supabase/service";

const statuses=["needs_review","published","draft","archived"];

export default async function AdminBeatsPage(){
  await requireAdminPage();
  const service=createServiceClient();
  const {data,error}=await service.from("beats")
    .select("id,title,slug,bpm,key,genre,mood,status,preview_url,cover_url,price_basic,price_standard,price_premium,price_exclusive,is_exclusive_sold,created_at,art_mode,art_style,art_seed,art_version")
    .order("created_at",{ascending:false});
  if(error) throw new Error(error.message);
  const beats=data??[];
  const counts=statuses.reduce((acc:Record<string,number>,status)=>{acc[status]=beats.filter((b:any)=>String(b.status)===status).length;return acc;},{});

  return <AdminShell>
    <PageIntro eyebrow="Catalog" title="Beats" description="Every beat now has automatic branded cover art. Open Art Studio to regenerate, change style, compare variations or restore the original cover."/>
    <div className="grid gap-3 sm:grid-cols-4">{statuses.map(status=><div key={status} className="metric-card rounded-2xl p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{status.replaceAll("_"," ")}</p><p className="mt-2 font-display text-3xl text-white">{counts[status]??0}</p></div>)}</div>
    <section className="space-y-3">{beats.map((beat:any)=>{
      const generated=String(beat.art_mode||"generated")==="generated";
      const cover=generated?beatArtUrl(String(beat.id),Number(beat.art_version||1)):beat.cover_url;
      return <article key={beat.id} className="admin-surface rounded-2xl p-5">
        <div className="grid gap-4 md:grid-cols-[88px_1fr_auto] md:items-center">
          <div className="h-[88px] w-[88px] overflow-hidden rounded-xl bg-white/[0.03]">{cover?<img src={cover} alt="" className="h-full w-full object-cover"/>:null}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-white">{beat.title}</h2>{beat.is_exclusive_sold?<span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase text-white/35">exclusive sold</span>:null}</div>
            <p className="mt-1 text-xs text-white/40">{beat.genre||"—"} · {beat.bpm||0} BPM · {beat.key||"—"} · {beat.mood||"—"}</p>
            <p className="mt-2 text-xs text-white/30">{"Basic $"+(Number(beat.price_basic||0)/100).toFixed(0)+" · Standard $"+(Number(beat.price_standard||0)/100).toFixed(0)+" · Premium $"+(Number(beat.price_premium||0)/100).toFixed(0)+" · Exclusive $"+(Number(beat.price_exclusive||0)/100).toFixed(0)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-gold">{generated?"Auto Art · "+String(beat.art_style||"signature"):"Manual Cover"}</span>
              <Link href={"/admin/beats/"+beat.id+"/art"} className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70 hover:border-gold hover:text-gold">Art Studio</Link>
            </div>
          </div>
          <form action={updateBeatCatalogStatusAction} className="flex gap-2"><input type="hidden" name="id" value={beat.id}/><select name="status" defaultValue={beat.status||"needs_review"} className="rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white">{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select><button className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/65">Save</button></form>
        </div>
      </article>
    })}</section>
  </AdminShell>;
}
