import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { updateBeatCatalogStatusAction } from "@/lib/actions/admin-beats";
import { requireAdminPage } from "@/lib/auth";
import { beatArtUrl } from "@/lib/beat-art";
import { createServiceClient } from "@/lib/supabase/service";

const statuses=["needs_review","published","draft","archived"];

function dollars(cents:number|null|undefined){
  return "$"+(Number(cents||0)/100).toFixed(0);
}

export default async function AdminBeatsPage({
  searchParams
}:{
  searchParams:Promise<{q?:string;status?:string;category?:string}>;
}){
  await requireAdminPage();
  const query=await searchParams;
  const q=String(query.q||"").trim().toLowerCase();
  const statusFilter=String(query.status||"");
  const categoryFilter=String(query.category||"");

  const service=createServiceClient();
  const [{data,error},{data:categories,error:categoryError}]=await Promise.all([
    service.from("beats")
      .select("id,title,display_title,slug,bpm,key,genre,mood,status,preview_url,audio_url,cover_url,price_basic,price_standard,price_premium,price_exclusive,is_exclusive_sold,created_at,art_mode,art_style,art_seed,art_version,category_id")
      .order("created_at",{ascending:false}),
    service.from("beat_categories").select("id,name,slug").order("name",{ascending:true})
  ]);
  if(error) throw new Error(error.message);
  if(categoryError) throw new Error(categoryError.message);

  const allBeats=data??[];
  const categoryById=new Map((categories??[]).map((c:any)=>[String(c.id),String(c.name)]));
  const counts=statuses.reduce((acc:Record<string,number>,status)=>{acc[status]=allBeats.filter((b:any)=>String(b.status)===status).length;return acc;},{});

  const beats=allBeats.filter((beat:any)=>{
    if(statusFilter&&String(beat.status)!==statusFilter) return false;
    if(categoryFilter&&String(beat.category_id||"")!==categoryFilter) return false;
    if(q){
      const haystack=[beat.title,beat.display_title,beat.genre,beat.mood,beat.key,categoryById.get(String(beat.category_id||""))].filter(Boolean).join(" ").toLowerCase();
      if(!haystack.includes(q)) return false;
    }
    return true;
  });

  return <AdminShell>
    <PageIntro eyebrow="Catalog" title="Beat Manager" description="Manage publishing, metadata, prices, availability, preview timing and artwork from one control center."/>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="metric-card rounded-2xl p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Total</p><p className="mt-2 font-display text-3xl text-white">{allBeats.length}</p></div>
      {statuses.map(status=><Link key={status} href={"/admin/beats?status="+status} className="metric-card rounded-2xl p-4 hover:border-gold/30"><p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{status.replaceAll("_"," ")}</p><p className="mt-2 font-display text-3xl text-white">{counts[status]??0}</p></Link>)}
    </div>

    <form method="get" className="admin-surface grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_220px_260px_auto]">
      <input name="q" defaultValue={query.q||""} placeholder="Search title, genre, key..." className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/>
      <select name="status" defaultValue={statusFilter} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"><option value="">All statuses</option>{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select>
      <select name="category" defaultValue={categoryFilter} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"><option value="">All categories</option>{(categories??[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <div className="flex gap-2"><button className="rounded-xl bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-black">Filter</button><Link href="/admin/beats" className="rounded-xl border border-white/15 px-4 py-3 text-xs uppercase tracking-[0.14em] text-white/55">Reset</Link></div>
    </form>

    <div className="flex items-center justify-between text-xs text-white/40"><span>{beats.length} beats shown</span><span>Click Edit for full control</span></div>

    <section className="space-y-3">{beats.map((beat:any)=>{
      const generated=String(beat.art_mode||"generated")==="generated";
      const cover=generated?beatArtUrl(String(beat.id),Number(beat.art_version||1)):beat.cover_url;
      const displayTitle=String(beat.display_title||beat.title);
      return <article key={beat.id} className="admin-surface rounded-2xl p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[96px_minmax(0,1fr)_360px] lg:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-xl bg-white/[0.03]">{cover?<img src={cover} alt="" className="h-full w-full object-cover"/>:null}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-white">{displayTitle}</h2>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/45">{String(beat.status).replaceAll("_"," ")}</span>
              {beat.is_exclusive_sold?<span className="rounded-full border border-red-300/20 bg-red-300/5 px-2 py-1 text-[9px] uppercase text-red-200/70">exclusive sold</span>:<span className="rounded-full border border-gold/20 px-2 py-1 text-[9px] uppercase text-gold/70">exclusive open</span>}
            </div>
            <p className="mt-1 truncate text-xs text-white/35">{beat.title!==displayTitle?beat.title:""}</p>
            <p className="mt-2 text-xs text-white/50">{categoryById.get(String(beat.category_id||""))||beat.genre||"Uncategorized"} · {Number(beat.bpm||0)} BPM · {beat.key||"—"} · {beat.mood||"—"}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/45">
              <span className="rounded-lg border border-white/10 px-2 py-1">Basic {dollars(beat.price_basic)}</span>
              <span className="rounded-lg border border-white/10 px-2 py-1">Std {dollars(beat.price_standard)}</span>
              <span className="rounded-lg border border-white/10 px-2 py-1">Prem {dollars(beat.price_premium)}</span>
              <span className="rounded-lg border border-white/10 px-2 py-1">Excl {dollars(beat.price_exclusive)}</span>
            </div>
          </div>
          <div className="grid gap-2">
            <form action={updateBeatCatalogStatusAction} className="grid grid-cols-[1fr_auto] gap-2">
              <input type="hidden" name="id" value={beat.id}/>
              <select name="status" defaultValue={beat.status||"needs_review"} className="rounded-xl border border-white/15 bg-black px-3 py-2.5 text-xs text-white">{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select>
              <button className="rounded-xl border border-white/15 px-4 py-2.5 text-xs text-white/70 hover:border-gold hover:text-gold">Update</button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <Link href={"/admin/beats/"+beat.id} className="rounded-xl bg-gold px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-black">Edit beat</Link>
              <Link href={"/admin/beats/"+beat.id+"/art"} className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-xs uppercase tracking-[0.14em] text-white/65">Art Studio</Link>
            </div>
          </div>
        </div>
      </article>
    })}</section>
  </AdminShell>;
}
