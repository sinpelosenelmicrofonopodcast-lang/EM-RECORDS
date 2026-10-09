import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApiContext } from '@/lib/admin-api';
import { adminData,campaign,checked,uploadToken,verifyUpload,audit,signed,hashText } from '@/lib/collaborations/service';
import { campaignBlockers,contractBlockers,renderAgreement,validatePreviewWav,MAX_PREVIEW_BYTES,MAX_DOCUMENT_BYTES,PRIVATE_BUCKET } from '@/lib/collaborations/contracts';
export const dynamic='force-dynamic';
const json=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'private, no-store'}});
const uuid=z.string().uuid();
export async function GET(req:NextRequest) {
 const ctx=await requireAdminApiContext();if(!ctx.ok)return json({error:ctx.error},ctx.status);
 try {
 const kind=req.nextUrl.searchParams.get('kind');const id=req.nextUrl.searchParams.get('id');
 if(kind==='file' && id) {
 const s=checked(await ctx.service.from('collab_submissions').select('*').eq('id',uuid.parse(id)).single());
 const field=req.nextUrl.searchParams.get('field');
 if(!['demo_path','document_path','preview_path','signed_contract'].includes(field||'')) throw new Error('Archivo inválido.');
 const path=field==='signed_contract'?s.production_checklist?.signed_contract:s[field!];
 if(!path) throw new Error('Archivo no disponible.');
 return json({url:await signed(path)});
 }
 if(kind==='legacy' && id) {
 const s=checked(await ctx.service.from('demo_submissions').select('file_url').eq('id',uuid.parse(id)).single());
 const pointer=String(s.file_url);let path='';
 if(pointer.startsWith('storage://demo-submissions/')) path=pointer.slice('storage://demo-submissions/'.length);
 else {const url=new URL(pointer);const base=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);if(url.origin!==base.origin || !url.pathname.startsWith('/storage/v1/object/public/demo-submissions/')) throw new Error('El demo usa un enlace externo; revisa su origen.');path=decodeURIComponent(url.pathname.split('/demo-submissions/')[1]);}
 const r=await ctx.service.storage.from('demo-submissions').createSignedUrl(path,120);if(r.error||!r.data) throw new Error('Demo no disponible.');return json({url:r.data.signedUrl});
 }
 return json(await adminData());
 }catch(e:any){return json({error:e.message},400);}
}
export async function POST(req:NextRequest) {
 const ctx=await requireAdminApiContext();if(!ctx.ok)return json({error:ctx.error},ctx.status);
 try {
 if(req.headers.get('origin')!==req.nextUrl.origin)return json({error:'Origen inválido.'},403);
 if(Number(req.headers.get('content-length')||0)>50000)return json({error:'Solicitud demasiado grande.'},413);
 const b=await req.json();const db=ctx.service;
 if(b.action==='create_campaign') {
 const title=z.string().trim().min(1).max(150).parse(b.title);
 const base=checked(await db.from('collab_campaigns').select('rules').order('created_at').limit(1).single());
 const row=checked(await db.from('collab_campaigns').insert({title,slug:title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,70)+'-'+crypto.randomUUID().slice(0,8),description:'Proyecto de cinco canciones de RBELD × EM Records.',rules:base.rules}).select('id').single());
 await audit(ctx.user.id,'campaign_created',row.id,null);return json({ok:true,id:row.id});
 }
 if(b.action==='campaign') {
 const id=uuid.parse(b.id);const old=await campaign(id);
 const x=z.object({title:z.string().trim().min(1).max(150),description:z.string().max(3000),project_artist:z.string().min(1).max(100),legal_entity:z.string().max(300),eligibility:z.string().max(2000),promotion_commitment:z.string().max(2000),submissions_start:z.string().nullable(),submissions_end:z.string().nullable(),voting_start:z.string().nullable(),voting_end:z.string().nullable(),max_submissions:z.number().int().min(5).max(50),legal_reviewed:z.boolean(),status:z.enum(['draft','submissions','voting','closed','production','released'])}).parse(b.campaign);
 const next={...old,...x};
 if(old.status!=='draft' && ['title','description','legal_entity','eligibility','promotion_commitment','project_artist','submissions_start','submissions_end','voting_start','voting_end','max_submissions'].some(k=>(old as any)[k]!== (next as any)[k])) throw new Error('Las bases se bloquean al abrir. No cambies condiciones de participantes existentes.');
 const allowed:Record<string,string[]>={draft:['draft','submissions'],submissions:['submissions','voting','closed'],voting:['voting','closed'],closed:['closed','production'],production:['production','released'],released:['released']};
 if(!allowed[old.status].includes(x.status)) throw new Error('Transición de convocatoria inválida.');
 if(x.status!=='draft'){const errors=campaignBlockers(next);if(errors.length)throw new Error('Pendiente: '+errors.join(', '));}
 if(x.status==='voting' && Date.now()<Date.parse(next.submissions_end!)) throw new Error('Primero debe terminar la recepción.');
 if(['production','released'].includes(x.status)) {
 const selected=checked(await db.from('collab_submissions').select('status,contract_signature,production_checklist').eq('campaign_id',id).in('status',['selected','production','released']));
 if(selected.length!==5 || selected.some(s=>!s.contract_signature || !s.production_checklist?.all_signatures || !s.production_checklist?.signed_contract))throw new Error('Se requieren cinco seleccionados con acuerdos completos.');
 if(x.status==='released' && selected.some(s=>s.status!=='released'))throw new Error('Las cinco canciones deben completar lanzamiento.');
 }
 checked(await db.from('collab_campaigns').update({...x,rules_version:old.status==='draft'?old.rules_version+1:old.rules_version}).eq('id',id));await audit(ctx.user.id,'campaign_updated',id,null,{status:x.status});return json({ok:true});
 }
 if(b.action==='retention') {
 const c=await campaign(uuid.parse(b.campaignId));
 if(!c.voting_end||Date.now()<Date.parse(c.voting_end)+90*86400000)throw new Error('La retención de 90 días aún no terminó.');
 const rows=checked(await db.from('collab_submissions').select('*').eq('campaign_id',c.id).in('status',['uploading','received','rights_pending','approved','reserve','rejected']));
 let removed=0;
 for(const row of rows){
 if(row.contract_signature||row.production_checklist?.legal_hold)continue;
 const uploads=checked(await db.from('collab_uploads').select('path').eq('submission_id',row.id));
 if(uploads.length){const r=await db.storage.from(PRIVATE_BUCKET).remove(uploads.map(x=>x.path));if(r.error)throw new Error(r.error.message);}
 checked(await db.from('collab_uploads').delete().eq('submission_id',row.id));
 checked(await db.from('collab_submissions').update({demo_path:'',document_path:null,preview_path:null,preview_verified:false}).eq('id',row.id));removed++;
 }
 await audit(ctx.user.id,'retention_cleanup',c.id,null,{removed});return json({ok:true,removed});
 }
 if(b.action==='beat') {
 const id=uuid.parse(b.campaignId);const c=await campaign(id);if(c.status!=='draft')throw new Error('El catálogo se define antes de abrir.');
 const source=uuid.parse(b.sourceId);const existing=checked(await db.from('beats').select('id,title').eq('id',source).single());
 checked(await db.from('collab_beats').insert({campaign_id:id,source_beat_id:source,title:existing.title,producer:z.string().min(1).max(150).parse(b.producer),rights_confirmed:b.rights===true,license_notes:z.string().min(1).max(3000).parse(b.notes)}));await audit(ctx.user.id,'beat_added',id,null,{source});return json({ok:true});
 }
 if(b.action==='select') {
 const c=await campaign(uuid.parse(b.campaignId));if(c.status!=='closed' || !c.voting_end || Date.now()<Date.parse(c.voting_end))throw new Error('Cierra la votación después de su fecha final.');
 const ids=z.array(uuid).length(5).parse(b.winners);const reserves=z.array(uuid).max(2).parse(b.reserves||[]);
 if(new Set([...ids,...reserves]).size!==ids.length+reserves.length)throw new Error('Seleccionados duplicados.');
 const all=await adminData();const eligible=all.submissions.filter(s=>s.campaign_id===c.id && s.status==='approved' && s.rights_verified && s.preview_verified && s.preview_consent).sort((a,b)=>b.votes-a.votes);
 if(ids.some(id=>!eligible.some(s=>s.id===id)))throw new Error('Solo temas elegibles.');
 const threshold=Math.min(...ids.map(id=>eligible.find(s=>s.id===id)!.votes));
 if(eligible.some(s=>!ids.includes(s.id)&&s.votes>threshold))throw new Error('Los cinco seleccionados deben tener los votos más altos.');
 if(reserves.some(id=>!eligible.some(s=>s.id===id)))throw new Error('Suplente no elegible.');
 const ties=eligible.filter(s=>s.votes===threshold);const note=z.string().max(3000).parse(b.reason||'');if(ties.some(s=>!ids.includes(s.id))&&!note.trim())throw new Error('Documenta el desempate.');
 checked(await db.rpc('collab_select',{p_campaign:c.id,p_winners:ids,p_reserves:reserves,p_actor:ctx.user.id,p_reason:note}));return json({ok:true});
 }
 const id=uuid.parse(b.id);const s=checked(await db.from('collab_submissions').select('*').eq('id',id).single());const c=await campaign(s.campaign_id);
 if(b.action==='upload') {
 const kind=z.enum(['preview','contract']).parse(b.kind);const bytes=z.number().int().min(1).max(kind==='preview'?MAX_PREVIEW_BYTES:MAX_DOCUMENT_BYTES).parse(b.bytes);
 if(kind==='preview' && !['draft','submissions'].includes(c.status))throw new Error('Los previews se bloquean antes de votar.');
 return json(await uploadToken(id,kind,bytes));
 }
 if(b.action==='complete') {
 const u=await verifyUpload(id,uuid.parse(b.uploadId));
 if(!['preview','contract'].includes(u.kind))throw new Error('Archivo inválido.');
 if(u.kind==='preview'&&!['draft','submissions'].includes(c.status))throw new Error('Preview bloqueado.');
 const r=await db.storage.from(PRIVATE_BUCKET).download(u.path);if(r.error||!r.data)throw new Error('Carga incompleta.');
 const buffer=Buffer.from(await r.data.arrayBuffer());
 if(u.kind==='preview') {
 const seconds=validatePreviewWav(buffer);checked(await db.from('collab_submissions').update({preview_path:u.path,preview_verified:true}).eq('id',id));await audit(ctx.user.id,'preview_verified',c.id,id,{seconds});
 }else{
 if(buffer.toString('ascii',0,5)!=='%PDF-')throw new Error('El acuerdo firmado debe ser PDF.');
 checked(await db.from('collab_submissions').update({production_checklist:{...s.production_checklist,signed_contract:u.path}}).eq('id',id));await audit(ctx.user.id,'signed_contract_uploaded',c.id,id);
 }
 checked(await db.from('collab_uploads').update({completed:true}).eq('id',u.id));return json({ok:true});
 }
 if(b.action==='review') {
 const x=z.object({status:z.enum(['received','rights_pending','approved','selected','reserve','rejected','production','released']),rights_verified:z.boolean(),notes:z.string().max(5000),splits:z.record(z.string(),z.unknown()),production_checklist:z.record(z.string(),z.unknown())}).parse(b.review);
 if(['voting','closed','production','released'].includes(c.status) && x.rights_verified!==s.rights_verified)throw new Error('Derechos bloqueados durante votación; registra la incidencia y rechaza si corresponde.');
 if(x.status==='approved'&&(!x.rights_verified||!s.preview_verified||!s.preview_consent||(s.beat_source==='external'&&!s.document_path)))throw new Error('Faltan derechos, preview verificado o consentimiento.');
 if(['selected','reserve'].includes(x.status) && x.status!==s.status)throw new Error('Usa la selección por ranking.');
 if(s.contract_ready && JSON.stringify(x.splits)!==JSON.stringify(s.splits))throw new Error('No se cambian splits después de emitir el acuerdo.');
 x.production_checklist={...x.production_checklist,signed_contract:s.production_checklist?.signed_contract||null};
 if(['production','released'].includes(x.status)){
 const blockers=contractBlockers(c,{...s,...x});if(blockers.length||!s.contract_signature||!x.production_checklist.all_signatures||!x.production_checklist.signed_contract)throw new Error('Faltan contratos, firmas o anexos completos: '+blockers.join(', '));
 if(!['selected','production','released'].includes(s.status))throw new Error('Solo seleccionados pasan a producción.');
 }
 if(x.status==='released' && ['audio','art','credits','pro_registration','mlc_registration','distrokid_splits','distribution'].some(k=>!x.production_checklist[k]))throw new Error('Completa audio, arte, créditos, registros, Splits y distribución.');
 checked(await db.from('collab_submissions').update(x).eq('id',id));await audit(ctx.user.id,'submission_reviewed',c.id,id,{status:x.status,rights:x.rights_verified});return json({ok:true});
 }
 if(b.action==='contract') {
 if(!['selected','production'].includes(s.status))throw new Error('Emite contratos para seleccionados.');
 const errors=contractBlockers(c,s);if(errors.length)throw new Error(errors.join(', '));
 if(s.contract_ready)throw new Error('El acuerdo ya fue emitido.');
 const text=renderAgreement(c,s);checked(await db.from('collab_submissions').update({contract_ready:true,contract_snapshot:{campaign:c,splits:s.splits},contract_text:text,contract_hash:hashText(text)}).eq('id',id));await audit(ctx.user.id,'contract_issued',c.id,id,{hash:hashText(text)});return json({ok:true});
 }
 return json({error:'Acción inválida.'},400);
 }catch(e:any){return json({error:e.message},400);}
}
