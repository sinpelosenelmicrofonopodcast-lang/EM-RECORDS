import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { requireAdminPage } from "@/lib/auth";
import { getAdminControlCenterData } from "@/lib/admin-control-center";

function money(c:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(c/100);}
function tone(t:string){return t==="critical"?"border-red-400/25 bg-red-400/[0.07]":t==="warning"?"border-amber-400/25 bg-amber-400/[0.06]":"border-white/10 bg-white/[0.025]";}

export default async function AdminDashboardPage(){
  await requireAdminPage();
  const d=await getAdminControlCenterData();
  const inbox=d.inbox.demos+d.inbox.beatRequests+d.inbox.studioProjects+d.inbox.syncRequests+d.inbox.bookings+d.inbox.unreadMessages;
  return <AdminShell>
    <PageIntro eyebrow="EM Records · Operations" title="Control Center" description="What needs attention now, what is moving, and where money or catalog activity is actually happening." actions={<Link href="/admin/inbox" className="rounded-full bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-black">Open Inbox</Link>}/>
    {d.unavailable?<section className="rounded-3xl border border-red-400/30 bg-red-400/10 p-6"><p className="text-xs uppercase tracking-[0.2em] text-red-200">Data unavailable</p><h2 className="mt-2 font-display text-3xl text-white">The dashboard will not invent numbers.</h2><p className="mt-3 text-sm text-white/65">Check Supabase connectivity before making decisions.</p></section>:null}
    <section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.24em] text-gold">Needs attention</p><h2 className="mt-2 font-display text-3xl text-white">Today</h2></div><p className="text-xs text-white/35">Live operational signals</p></div>
      {d.actions.length?<div className="grid gap-3 xl:grid-cols-2">{d.actions.map(x=><Link key={x.key} href={x.href} className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-gold/35 ${tone(x.tone)}`}><div className="flex items-start justify-between gap-5"><div><p className="text-sm font-semibold text-white">{x.label}</p><p className="mt-1 text-sm leading-relaxed text-white/50">{x.detail}</p></div><span className="font-display text-4xl text-white">{x.count}</span></div><p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-gold">Open workflow →</p></Link>)}</div>:<div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-5 text-sm text-emerald-100">No active exceptions.</div>}
    </section>
    <Link href="/admin/collaborations" className="rounded-2xl border border-gold/30 p-5 text-gold">Collaborations · demos privados, previews, votos, derechos y acuerdos →</Link>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
      ["Catalog",d.catalog.releases,`${d.catalog.artists} artists · ${d.catalog.publishedBeats}/${d.catalog.beats} beats public`,"/admin/releases"],
      ["Artist Pipeline",d.pipeline.leads,`${d.pipeline.draftDeals} deals · ${d.pipeline.draftContracts} contracts · ${d.pipeline.onboardingOpen} onboarding`,"/admin/signing"],
      ["Open Inbox",inbox,`${d.inbox.demos} demos · ${d.inbox.beatRequests} beat requests`,"/admin/inbox"],
      ["Publishing Health",d.content.failed,`${d.content.sent} sent · ${d.content.skipped} skipped · ${d.content.seoErrors} SEO errors`,"/admin/social-publishing"]
    ].map(([a,b,c,e])=><Link href={String(e)} key={String(a)} className="metric-card rounded-[24px] p-5 transition hover:border-gold/30"><p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{a}</p><p className="mt-2 font-display text-4xl text-white">{b}</p><p className="mt-2 text-xs leading-relaxed text-white/45">{c}</p></Link>)}</section>
    <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><article className="admin-surface rounded-[28px] p-6"><p className="text-[10px] uppercase tracking-[0.24em] text-gold">Money</p><h2 className="mt-2 font-display text-3xl text-white">Commercial snapshot</h2><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Paid orders",d.revenue.beatAndServiceCents],["Ticket revenue",d.revenue.ticketCents],["Studio quoted",d.revenue.studioQuotedCents]].map(([a,b])=><div key={String(a)} className="rounded-2xl bg-white/[0.035] p-4"><p className="text-xs text-white/45">{a}</p><p className="mt-2 font-display text-2xl text-white">{money(Number(b))}</p></div>)}</div><p className="mt-5 text-xs text-white/35">Only persisted business records. No mock revenue.</p></article>
    <article className="admin-surface rounded-[28px] p-6"><p className="text-[10px] uppercase tracking-[0.24em] text-gold">Recent catalog</p><h2 className="mt-2 font-display text-3xl text-white">Latest releases</h2><div className="mt-5 space-y-2">{d.recentReleases.length?d.recentReleases.map(r=><div key={r.id} className="flex items-center justify-between gap-4 border-b border-white/8 py-3 last:border-0"><div><p className="text-sm font-medium text-white">{r.title}</p><p className="mt-1 text-xs text-white/40">{r.artist}</p></div><p className="text-xs text-white/45">{r.releaseDate}</p></div>):<p className="text-sm text-white/45">No releases.</p>}</div></article></section>
  </AdminShell>;
}
