import { createServiceClient } from "@/lib/supabase/service";
import { submitSyncInquiryAction } from "@/lib/actions/platform";

export const dynamic = "force-dynamic";

export default async function SyncLicensingPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const params = await searchParams;
  const service = createServiceClient();
  const { data: releases } = await service.from("releases").select("id").eq("is_published", true);
  const releaseIds = (releases ?? []).map((row: any) => row.id);
  let songs: any[] = [];
  if (releaseIds.length) {
    const result = await service.from("songs").select("id,title,isrc,language,bpm,key,release_id").in("release_id", releaseIds).order("title");
    songs = result.data ?? [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-10">
      <p className="text-xs uppercase tracking-[0.22em] text-gold">EM Records Sync</p>
      <h1 className="mt-4 font-display text-5xl text-white md:text-7xl">Music for picture, brands and stories.</h1>
      <p className="mt-5 max-w-3xl text-white/65">Send a professional sync inquiry. Rights and clearance are checked before any binding license is issued.</p>
      {params.submitted === "1" ? <p className="mt-5 rounded-xl border border-gold/30 bg-gold/10 p-4 text-gold">Sync inquiry received.</p> : null}

      <form action={submitSyncInquiryAction} className="mt-10 grid gap-3 rounded-[28px] border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2">
        <input name="name" required placeholder="Contact name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="email" type="email" required placeholder="Business email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="company" placeholder="Company" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="productionName" placeholder="Production / campaign" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <select name="songId" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white md:col-span-2">
          <option value="">Open brief / recommend music</option>
          {songs.map((song: any) => <option key={song.id} value={song.id}>{song.title}{song.isrc ? " · " + song.isrc : ""}</option>)}
        </select>
        <input name="mediaType" placeholder="Film / TV / ad / game / digital" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="usage" placeholder="Usage (background, featured, trailer...)" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="territory" placeholder="Territory" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="term" placeholder="Term" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="exclusivity" placeholder="Exclusivity" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="media" placeholder="Media / platforms" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="budget" placeholder="Budget USD" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="deadline" type="date" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <textarea name="sceneContext" rows={5} placeholder="Scene, creative context and anything the music supervisor should tell us" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white md:col-span-2" />
        <button className="justify-self-start rounded-full bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">Submit sync inquiry</button>
      </form>
    </div>
  );
}
