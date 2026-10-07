import { createServiceClient } from "@/lib/supabase/service";

export type ActionSignal = { key:string; label:string; detail:string; count:number; href:string; tone:"critical"|"warning"|"info" };
export type InboxRow = { id:string; type:"demo"|"beat"|"studio"|"sync"|"booking"|"message"; title:string; person:string; email?:string|null; status:string; createdAt:string; detail?:string|null };

async function countRows(service: ReturnType<typeof createServiceClient>, table:string, apply?:(q:any)=>any) {
  let q:any=service.from(table).select("id",{count:"exact",head:true});
  if(apply) q=apply(q);
  const {count,error}=await q;
  if(error) throw new Error(table+": "+error.message);
  return Number(count??0);
}
function sum(rows:any[]|null|undefined, field:string){return (rows??[]).reduce((n,row)=>n+Number(row?.[field]??0),0);}

export async function getAdminControlCenterData(){
  const service=createServiceClient();
  try{
    const [
      artists,releases,beats,publishedBeats,beatsNeedReview,pendingDemos,openOnboarding,
      socialFailed,socialSent,socialSkipped,seoErrors,draftDeals,draftContracts,leads,
      beatRequests,studioProjects,syncRequests,bookings,unreadMessages,paidOrders,paidTickets,
      quotedProjects,recentReleases
    ]=await Promise.all([
      countRows(service,"artists",(q)=>q.eq("active",true)),
      countRows(service,"releases"),
      countRows(service,"beats"),
      countRows(service,"beats",(q)=>q.eq("status","published")),
      countRows(service,"beats",(q)=>q.eq("status","needs_review")),
      countRows(service,"demo_submissions",(q)=>q.eq("status","pending")),
      countRows(service,"onboarding_tasks",(q)=>q.eq("completed",false)),
      countRows(service,"social_post_jobs",(q)=>q.eq("status","failed")),
      countRows(service,"social_post_jobs",(q)=>q.eq("status","sent")),
      countRows(service,"social_post_jobs",(q)=>q.eq("status","skipped")),
      countRows(service,"seo_queue",(q)=>q.eq("status","error")),
      countRows(service,"deal_offers",(q)=>q.eq("status","draft")),
      countRows(service,"contracts",(q)=>q.eq("status","draft")),
      countRows(service,"artist_leads",(q)=>q.neq("status","archived")),
      countRows(service,"beat_inquiries",(q)=>q.in("status",["new","in_review","awaiting_customer","negotiating"])),
      countRows(service,"client_projects",(q)=>q.not("status","in","(completed,cancelled)")),
      countRows(service,"sync_inquiries",(q)=>q.not("status","in","(licensed,declined,expired)")),
      countRows(service,"booking_requests",(q)=>q.not("status","in","(done,declined)")),
      countRows(service,"messages",(q)=>q.eq("status","unread")),
      service.from("orders").select("price,status").in("status",["paid","fulfilled"]),
      service.from("ticket_orders").select("amount_total,status").eq("status","paid"),
      service.from("client_projects").select("quoted_cents,status").not("status","in","(completed,cancelled)"),
      service.from("releases").select("id,title,artist_name,artist_slug,release_date").order("release_date",{ascending:false}).limit(5)
    ]);

    const actions:ActionSignal[]=[
      {key:"demos",label:"Demos need review",detail:"New artist submissions waiting on a decision.",count:pendingDemos,href:"/admin/demos",tone:"critical"},
      {key:"beats",label:"Beats need review",detail:"Catalog items are not ready for public request.",count:beatsNeedReview,href:"/admin/releases",tone:"critical"},
      {key:"social",label:"Publishing failures",detail:"Social jobs failed and need inspection.",count:socialFailed,href:"/admin/social-publishing",tone:"critical"},
      {key:"onboarding",label:"Onboarding tasks open",detail:"Artist onboarding requirements are incomplete.",count:openOnboarding,href:"/admin/signing",tone:"warning"},
      {key:"seo",label:"SEO queue errors",detail:"Submission jobs failed and need inspection.",count:seoErrors,href:"/admin/seo",tone:"warning"},
      {key:"deals",label:"Deal offers in draft",detail:"Offers started but not sent.",count:draftDeals,href:"/admin/signing/deals",tone:"info"},
      {key:"contracts",label:"Contracts in draft",detail:"Contracts require completion or archival.",count:draftContracts,href:"/admin/signing/contracts",tone:"info"},
      {key:"inbox",label:"Customer conversations open",detail:"Beat, studio, sync, booking and signing messages.",count:beatRequests+studioProjects+syncRequests+bookings+unreadMessages,href:"/admin/inbox",tone:"info"}
    ].filter(x=>x.count>0).sort((a,b)=>b.count-a.count);

    return {
      unavailable:false, actions,
      catalog:{artists,releases,beats,publishedBeats,beatsNeedReview},
      pipeline:{leads,draftDeals,draftContracts,onboardingOpen:openOnboarding},
      revenue:{beatAndServiceCents:sum(paidOrders.data,"price"),ticketCents:sum(paidTickets.data,"amount_total"),studioQuotedCents:sum(quotedProjects.data,"quoted_cents")},
      content:{sent:socialSent,failed:socialFailed,skipped:socialSkipped,seoErrors},
      inbox:{demos:pendingDemos,beatRequests,studioProjects,syncRequests,bookings,unreadMessages},
      recentReleases:(recentReleases.data??[]).map((r:any)=>({id:String(r.id),title:String(r.title),artist:String(r.artist_name??r.artist_slug??"EM Records"),releaseDate:String(r.release_date)}))
    };
  }catch(error){
    console.error("Admin control center unavailable",error);
    return {unavailable:true,actions:[] as ActionSignal[],catalog:{artists:0,releases:0,beats:0,publishedBeats:0,beatsNeedReview:0},pipeline:{leads:0,draftDeals:0,draftContracts:0,onboardingOpen:0},revenue:{beatAndServiceCents:0,ticketCents:0,studioQuotedCents:0},content:{sent:0,failed:0,skipped:0,seoErrors:0},inbox:{demos:0,beatRequests:0,studioProjects:0,syncRequests:0,bookings:0,unreadMessages:0},recentReleases:[]};
  }
}

export async function getAdminInboxData():Promise<InboxRow[]>{
  const service=createServiceClient();
  const [demos,beats,projects,sync,bookings,messages]=await Promise.all([
    service.from("demo_submissions").select("id,artist_name,email,track_title,status,created_at,message").eq("status","pending").order("created_at",{ascending:false}).limit(20),
    service.from("beat_inquiries").select("id,requester_name,requester_email,license_type,status,created_at,beats(title)").in("status",["new","in_review","awaiting_customer","negotiating"]).order("last_message_at",{ascending:false}).limit(20),
    service.from("client_projects").select("id,client_name,client_email,title,project_type,status,created_at").not("status","in","(completed,cancelled)").order("created_at",{ascending:false}).limit(20),
    service.from("sync_inquiries").select("id,requester_name,requester_email,production_name,media_type,status,created_at,usage").not("status","in","(licensed,declined,expired)").order("created_at",{ascending:false}).limit(20),
    service.from("booking_requests").select("id,requester_name,requester_email,event_name,event_location,status,created_at,artists(name)").not("status","in","(done,declined)").order("created_at",{ascending:false}).limit(20),
    service.from("messages").select("id,subject,body,status,created_at,artist_leads(stage_name,legal_name,email)").eq("status","unread").order("created_at",{ascending:false}).limit(20)
  ]);
  const error=[demos.error,beats.error,projects.error,sync.error,bookings.error,messages.error].find(Boolean);
  if(error) throw new Error(error.message);
  const rows:InboxRow[]=[];
  for(const r of demos.data??[]) rows.push({id:String(r.id),type:"demo",title:String(r.track_title),person:String(r.artist_name),email:String(r.email),status:String(r.status),createdAt:String(r.created_at),detail:r.message?String(r.message):null});
  for(const r of beats.data??[]){const b=Array.isArray((r as any).beats)?(r as any).beats[0]:(r as any).beats;rows.push({id:String(r.id),type:"beat",title:String(b?.title??"Beat request"),person:String(r.requester_name),email:String(r.requester_email),status:String(r.status),createdAt:String(r.created_at),detail:String(r.license_type)+" license"});}
  for(const r of projects.data??[]) rows.push({id:String(r.id),type:"studio",title:String(r.title),person:String(r.client_name),email:String(r.client_email),status:String(r.status),createdAt:String(r.created_at),detail:String(r.project_type)});
  for(const r of sync.data??[]) rows.push({id:String(r.id),type:"sync",title:String(r.production_name??"Sync licensing request"),person:String(r.requester_name),email:String(r.requester_email),status:String(r.status),createdAt:String(r.created_at),detail:String(r.media_type??r.usage??"")});
  for(const r of bookings.data??[]){const a=Array.isArray((r as any).artists)?(r as any).artists[0]:(r as any).artists;rows.push({id:String(r.id),type:"booking",title:String(r.event_name??"Artist booking"),person:String(r.requester_name??"Requester"),email:r.requester_email?String(r.requester_email):null,status:String(r.status),createdAt:String(r.created_at),detail:[a?.name,r.event_location].filter(Boolean).join(" · ")});}
  for(const r of messages.data??[]){const l=Array.isArray((r as any).artist_leads)?(r as any).artist_leads[0]:(r as any).artist_leads;rows.push({id:String(r.id),type:"message",title:String(r.subject??"Signing message"),person:String(l?.stage_name??l?.legal_name??"Artist"),email:l?.email?String(l.email):null,status:String(r.status),createdAt:String(r.created_at),detail:String(r.body).slice(0,220)});}
  return rows.sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt));
}
