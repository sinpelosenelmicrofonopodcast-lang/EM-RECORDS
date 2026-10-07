import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";
import { getAdminInboxData } from "@/lib/admin-control-center";
import { requireAdminPage } from "@/lib/auth";
import { updateBookingRequestStatusAction,updateStudioProjectStatusAction,updateSyncInquiryStatusAction } from "@/lib/actions/admin-inbox";

const studio=["inquiry","quoted","awaiting_deposit","scheduled","in_progress","client_review","revision","completed","cancelled"];
const sync=["new","qualifying","rights_check","quoted","negotiating","approved","licensed","declined","expired"];
const booking=["new","in_review","negotiating","confirmed","done","declined"];
const label:Record<string,string>={demo:"Demo",beat:"Beat",studio:"Studio",sync:"Sync",booking:"Booking",message:"Signing"};

export default async function AdminInboxPage(){
  await requireAdminPage();
  const items=await getAdminInboxData();
  return <AdminShell>
    <PageIntro eyebrow="Unified Inbox" title="Requests & conversations" description="Demos, beat requests, studio work, sync licensing, bookings and signing messages in one queue."/>
    <div className="flex flex-wrap gap-2">{Object.keys(label).map(type=><span key={type} className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs text-white/55">{label[type]} · {items.filter(i=>i.type===type).length}</span>)}</div>
    <section className="space-y-3">
      {items.length===0?<div className="rounded-3xl border border-white/10 p-8 text-sm text-white/50">Inbox clear.</div>:items.map(item=><article key={item.type+"-"+item.id} className="admin-surface rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="rounded-full border border-gold/25 bg-gold/[0.07] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-gold">{label[item.type]}</span><span className="text-[10px] uppercase tracking-[0.14em] text-white/35">{item.status.replaceAll("_"," ")}</span></div>
            <h2 className="mt-3 text-lg font-semibold text-white">{item.title}</h2>
            <p className="mt-1 text-sm text-white/55">{item.person}{item.email?" · "+item.email:""}</p>
            {item.detail?<p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/48">{item.detail}</p>:null}
            <p className="mt-3 text-xs text-white/30">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
          {item.type==="demo"?<Link href="/admin/demos" className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/65">Review demo</Link>:null}
          {item.type==="beat"?<Link href="/admin/beat-requests" className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/65">Open thread</Link>:null}
          {item.type==="message"?<Link href="/admin/signing" className="rounded-full border border-white/15 px-4 py-2 text-xs text-white/65">Open signing</Link>:null}
          {item.type==="studio"?<form action={updateStudioProjectStatusAction} className="flex gap-2"><input type="hidden" name="id" value={item.id}/><select name="status" defaultValue={item.status} className="rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white">{studio.map(s=><option key={s}>{s}</option>)}</select><button className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/65">Save</button></form>:null}
          {item.type==="sync"?<form action={updateSyncInquiryStatusAction} className="flex gap-2"><input type="hidden" name="id" value={item.id}/><select name="status" defaultValue={item.status} className="rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white">{sync.map(s=><option key={s}>{s}</option>)}</select><button className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/65">Save</button></form>:null}
          {item.type==="booking"?<form action={updateBookingRequestStatusAction} className="flex gap-2"><input type="hidden" name="id" value={item.id}/><select name="status" defaultValue={item.status} className="rounded-xl border border-white/15 bg-black px-3 py-2 text-xs text-white">{booking.map(s=><option key={s}>{s}</option>)}</select><button className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/65">Save</button></form>:null}
        </div>
      </article>)}
    </section>
  </AdminShell>;
}
