import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { updateBeatDetailsAction } from "@/lib/actions/admin-beats";
import { requireAdminPage } from "@/lib/auth";
import { beatArtUrl } from "@/lib/beat-art";
import { createServiceClient } from "@/lib/supabase/service";

const statuses=["needs_review","published","draft","archived"];
const artStyles=["signature","neon","noir","luxury","velvet"];

function dollarsOrBlank(cents:number|null|undefined){
  const value=Number(cents||0);
  return value>0?(value/100).toFixed(2):"";
}

function FieldLabel({children}:{children:React.ReactNode}){
  return <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">{children}</label>;
}

export default async function AdminBeatEditor({
  params,
  searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{saved?:string}>;
}){
  await requireAdminPage();
  const {id}=await params;
  const query=await searchParams;
  const service=createServiceClient();

  const [{data:beat,error},{data:categories,error:categoryError}]=await Promise.all([
    service.from("beats")
      .select("id,title,display_title,slug,bpm,key,genre,mood,tags,description,status,category_id,price_basic,price_standard,price_premium,price_exclusive,is_exclusive_sold,preview_start_seconds,preview_duration_seconds,preview_url,audio_url,cover_url,art_mode,art_style,art_seed,art_version")
      .eq("id",id)
      .maybeSingle(),
    service.from("beat_categories").select("id,name,slug").order("name",{ascending:true})
  ]);

  if(error) throw new Error(error.message);
  if(categoryError) throw new Error(categoryError.message);
  if(!beat) notFound();

  const generated=String(beat.art_mode||"generated")==="generated";
  const cover=generated?beatArtUrl(String(beat.id),Number(beat.art_version||1)):beat.cover_url;

  return <AdminShell>
    <PageIntro
      eyebrow="Beat Manager"
      title={String(beat.display_title||beat.title)}
      description="Edit catalog data, pricing, availability, preview behavior and publishing state from one place."
      actions={<div className="flex flex-wrap gap-2">
        <Link href="/admin/beats" className="rounded-full border border-white/15 px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-white/65">Back to catalog</Link>
        <Link href={"/admin/beats/"+beat.id+"/art"} className="rounded-full border border-gold/50 px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-gold">Art Studio</Link>
      </div>}
    />

    {query.saved==="1"?<div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">Beat updated successfully.</div>:null}

    <form action={updateBeatDetailsAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <input type="hidden" name="id" value={beat.id}/>

      <div className="space-y-6">
        <section className="admin-surface rounded-3xl p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Publishing</p><h2 className="mt-1 text-xl font-semibold text-white">Identity & status</h2></div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45">{String(beat.status).replaceAll("_"," ")}</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2"><FieldLabel>Public title</FieldLabel><input name="display_title" required defaultValue={beat.display_title||beat.title} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Original / internal title</FieldLabel><input name="title" required defaultValue={beat.title} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Status</FieldLabel><select name="status" defaultValue={beat.status||"needs_review"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">{statuses.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></div>
            <div className="grid gap-2"><FieldLabel>Category</FieldLabel><select name="category_id" defaultValue={beat.category_id||""} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"><option value="">Uncategorized</option>{(categories||[]).map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="grid gap-2"><FieldLabel>Genre</FieldLabel><input name="genre" defaultValue={beat.genre||""} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Mood</FieldLabel><input name="mood" defaultValue={beat.mood||""} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>BPM</FieldLabel><input type="number" min="0" max="400" name="bpm" defaultValue={Number(beat.bpm||0)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Key</FieldLabel><input name="key" defaultValue={beat.key||""} placeholder="F# Minor" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2 md:col-span-2"><FieldLabel>Slug</FieldLabel><input name="slug" defaultValue={beat.slug||""} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2 md:col-span-2"><FieldLabel>Tags — comma or line separated</FieldLabel><textarea name="tags" rows={3} defaultValue={Array.isArray(beat.tags)?beat.tags.join(", "):""} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2 md:col-span-2"><FieldLabel>Description</FieldLabel><textarea name="description" rows={5} defaultValue={beat.description||""} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
          </div>
        </section>

        <section className="admin-surface rounded-3xl p-5 md:p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Licensing</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Pricing & availability</h2>
          <p className="mt-3 text-xs text-white/45">Leave any price blank or set it to 0 and the public catalog will show <span className="text-gold">Contact for pricing</span> instead of a dollar amount.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2"><FieldLabel>Basic $</FieldLabel><input type="number" min="0" step="0.01" name="price_basic" defaultValue={dollarsOrBlank(beat.price_basic)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Standard $</FieldLabel><input type="number" min="0" step="0.01" name="price_standard" defaultValue={dollarsOrBlank(beat.price_standard)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Premium $</FieldLabel><input type="number" min="0" step="0.01" name="price_premium" defaultValue={dollarsOrBlank(beat.price_premium)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Exclusive $</FieldLabel><input type="number" min="0" step="0.01" name="price_exclusive" defaultValue={dollarsOrBlank(beat.price_exclusive)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
          </div>
          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 p-4 text-sm text-white/70"><input type="checkbox" name="is_exclusive_sold" defaultChecked={Boolean(beat.is_exclusive_sold)} className="h-4 w-4"/><span><strong className="text-white">Exclusive sold</strong><br/><span className="text-xs text-white/40">Marks the exclusive license unavailable on the public catalog.</span></span></label>
        </section>

        <section className="admin-surface rounded-3xl p-5 md:p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Playback</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Preview control</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><FieldLabel>Start second</FieldLabel><input type="number" min="0" max="3600" name="preview_start_seconds" defaultValue={Number(beat.preview_start_seconds||15)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
            <div className="grid gap-2"><FieldLabel>Duration seconds</FieldLabel><input type="number" min="10" max="90" name="preview_duration_seconds" defaultValue={Number(beat.preview_duration_seconds||45)} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"/></div>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-white/35">
            <p>Preview source: {beat.preview_url?"Dedicated preview":"Private master fallback"}</p>
            <p>Audio master: {beat.audio_url?"Available":"Missing"}</p>
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="admin-surface sticky top-24 rounded-3xl p-5">
          <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black">{cover?<img src={cover} alt="" className="h-full w-full object-cover"/>:null}</div>
          <div className="mt-5 grid gap-4">
            <div className="grid gap-2"><FieldLabel>Artwork mode</FieldLabel><select name="art_mode" defaultValue={beat.art_mode||"generated"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"><option value="generated">Generated</option><option value="manual">Manual cover</option></select></div>
            <div className="grid gap-2"><FieldLabel>Generated style</FieldLabel><select name="art_style" defaultValue={beat.art_style||"signature"} className="rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white">{artStyles.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <Link href={"/admin/beats/"+beat.id+"/art"} className="rounded-xl border border-white/15 px-4 py-3 text-center text-xs uppercase tracking-[0.14em] text-white/65">Open Art Studio</Link>
          </div>
          <button type="submit" className="mt-5 w-full rounded-xl bg-gold px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-black">Save all changes</button>
          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.12em] text-white/30">One save updates public catalog + admin</p>
        </section>
      </aside>
    </form>
  </AdminShell>;
}
