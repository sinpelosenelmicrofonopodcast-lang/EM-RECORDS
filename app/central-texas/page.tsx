import Link from "next/link";

export default function CentralTexasPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-10">
      <p className="text-xs uppercase tracking-[0.25em] text-gold">EM Records · Central Texas</p>
      <h1 className="mt-4 max-w-4xl font-display text-5xl text-white md:text-7xl">Local artists. Real infrastructure. Real records.</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">Create a professional artist profile, complete your readiness checklist, apply for the production program and — once approved — access the protected Production Vault to request beats and submit private demos.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/artist/signup" className="rounded-full bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-black">Create artist profile</Link>
        <Link href="/artist/login" className="rounded-full border border-gold px-6 py-3 text-xs uppercase tracking-[0.18em] text-gold">Artist login</Link>
      </div>
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5"><p className="text-gold">1</p><h2 className="mt-3 text-xl font-semibold text-white">Build your professional profile</h2><p className="mt-2 text-sm leading-6 text-white/60">Identity, contact, socials, PRO/IPI and rights disclosures are organized in one place.</p></article>
        <article className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5"><p className="text-gold">2</p><h2 className="mt-3 text-xl font-semibold text-white">Get approved for the program</h2><p className="mt-2 text-sm leading-6 text-white/60">A&R reviews readiness, missing information and program eligibility.</p></article>
        <article className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5"><p className="text-gold">3</p><h2 className="mt-3 text-xl font-semibold text-white">Request beats & submit privately</h2><p className="mt-2 text-sm leading-6 text-white/60">Protected demo access requires approval and the current Beat Demo Access Agreement.</p></article>
      </div>
    </div>
  );
}
