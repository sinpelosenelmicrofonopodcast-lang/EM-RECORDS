import { createServiceClient } from "@/lib/supabase/service";
import { submitStudioInquiryAction } from "@/lib/actions/platform";

export const dynamic = "force-dynamic";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const params = await searchParams;
  const service = createServiceClient();
  const { data: services } = await service.from("services").select("id,name,description,price,category,delivery_time,revisions").order("name");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-10">
      <p className="text-xs uppercase tracking-[0.22em] text-gold">EM Records Studio & Services</p>
      <h1 className="mt-4 font-display text-5xl text-white md:text-7xl">Record. Mix. Master. Produce.</h1>
      <p className="mt-5 max-w-3xl text-white/65">Start a project request. EM Records reviews scope, availability and deposit requirements before a session is confirmed.</p>
      {params.submitted === "1" ? <p className="mt-5 rounded-xl border border-gold/30 bg-gold/10 p-4 text-gold">Request received. It is now in the EM Records project pipeline.</p> : null}

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {(services ?? []).map((serviceItem: any) => (
          <article key={serviceItem.id} className="rounded-2xl border border-white/10 p-5">
            <h2 className="text-xl font-semibold text-white">{serviceItem.name}</h2>
            <p className="mt-2 text-sm text-white/60">{serviceItem.description}</p>
            <p className="mt-3 text-gold">{serviceItem.price ? "From $" + (Number(serviceItem.price) / 100).toFixed(2) : "Custom quote"}</p>
          </article>
        ))}
      </div>

      <form action={submitStudioInquiryAction} className="mt-12 grid gap-3 rounded-[28px] border border-white/10 bg-white/[0.02] p-6 md:grid-cols-2">
        <input name="name" required placeholder="Name" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="email" type="email" required placeholder="Email" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="title" placeholder="Project / song title" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <input name="preferredDate" type="datetime-local" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white" />
        <select name="projectType" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white">
          {["recording", "mixing", "mastering", "production", "vocal_production", "custom"].map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}
        </select>
        <select name="serviceId" className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white">
          <option value="">Custom / choose later</option>
          {(services ?? []).map((serviceItem: any) => <option key={serviceItem.id} value={serviceItem.id}>{serviceItem.name}</option>)}
        </select>
        <textarea name="notes" rows={5} placeholder="Tell us what you need, number of songs, files available, deadlines..." className="rounded-xl border border-white/15 bg-black px-4 py-3 text-white md:col-span-2" />
        <button className="justify-self-start rounded-full bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">Start project request</button>
      </form>
    </div>
  );
}
