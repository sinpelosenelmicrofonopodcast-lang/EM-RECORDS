import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { publicData,verifiedUser,campaign,checked,uploadToken,verifyUpload,audit,hashText,signed } from '@/lib/collaborations/service';
import { TERMS_VERSION,SUBMISSION_TERMS,MAX_DEMO_BYTES,MAX_DOCUMENT_BYTES,PRIVATE_BUCKET } from '@/lib/collaborations/contracts';
export const dynamic='force-dynamic';
const json=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'private, no-store'}});
const uuid=z.string().uuid();const str=z.string().trim().min(1).max(200);
const submit=z.object({campaignId:uuid,artist_name:str,legal_name:str,track_title:str,pro:str,ipi:z.string().regex(/^\d{6,15}$/),publisher:str,publisher_ipi:z.string().max(30).default(''),message:z.string().max(2000).default(''),beat_source:z.enum(['catalog','external']),beat_id:uuid.optional(),beat_rights:z.string().max(3000).default(''),preview_consent:z.literal(true),adult:z.literal(true),terms:z.literal(true),rulesVersion:z.number().int(),bytes:z.number().int().min(1).max(MAX_DEMO_BYTES)});
export async function GET(req:NextRequest) {
 try {
 const kind=req.nextUrl.searchParams.get('kind');const id=req.nextUrl.searchParams.get('id');
 if(kind==='preview' && id) {
 const db=createServiceClient();const s=checked(await db.from('collab_submissions').select('campaign_id,preview_path,status,preview_verified,preview_consent,rights_verified').eq('id',uuid.parse(id)).single());
 const c=await campaign(s.campaign_id);
 const expiry=c.voting_end?Date.parse(c.voting_end)+90*86400000:0;
 if(!['voting','closed','production','released'].includes(c.status) || Date.now()>expiry || !['approved','selected','reserve','production','released'].includes(s.status) || !s.preview_verified || !s.preview_consent || !s.rights_verified || !s.preview_path) return json({error:'Preview no disponible.'},404);
 return json({url:await signed(s.preview_path)});
 }
 if(kind==='mine') {
 const user=await verifiedUser();const db=createServiceClient();
 const submissions=checked(await db.from('collab_submissions').select('id,campaign_id,track_title,artist_name,status,created_at,contract_ready,contract_text,contract_hash,contract_revision,contract_signature,splits').eq('user_id',user.id).order('created_at',{ascending:false}));
 const votes=checked(await db.from('collab_votes').select('submission_id,campaign_id').eq('user_id',user.id));return json({submissions,votes});
 }
 return json(await publicData());
 }catch(e:any){return json({error:e.message},400);}
}
export async function POST(req:NextRequest) {
 try {
 if(req.headers.get('origin')!==req.nextUrl.origin) return json({error:'Origen inválido.'},403);
 if(Number(req.headers.get('content-length')||0)>20000) return json({error:'Solicitud demasiado grande.'},413);
 const user=await verifiedUser();const body=await req.json();const db=createServiceClient();
 if(body.action==='submit') {
 const x=submit.parse(body);const c=await campaign(x.campaignId);
 if(c.rules_version!==x.rulesVersion) throw new Error('Las bases cambiaron. Vuelve a revisarlas.');
 if(x.beat_source==='external' && !x.beat_rights.trim()) throw new Error('Describe la propiedad o licencia del beat.');
 const terms={version:TERMS_VERSION,text:SUBMISSION_TERMS,campaign:c,accepted_name:x.legal_name};
 const id=checked(await db.rpc('collab_create_submission',{p_campaign:c.id,p_user:user.id,p_data:{...x,email:user.email,submission_terms:terms}}));
 let token;try{token=await uploadToken(id,'demo',x.bytes);}catch(e){await db.from('collab_submissions').delete().eq('id',id);throw e;}
 checked(await db.from('collab_submissions').update({demo_path:token.path}).eq('id',id));
 await audit(user.id,'submission_reserved',c.id,id,{terms_version:TERMS_VERSION});return json({id,...token});
 }
 const id=uuid.parse(body.id);
 if(body.action==='vote') {
 const s=checked(await db.from('collab_submissions').select('campaign_id').eq('id',id).single());
 checked(await db.rpc('collab_vote',{p_campaign:s.campaign_id,p_submission:id,p_user:user.id}));return json({ok:true});
 }
 const s=checked(await db.from('collab_submissions').select('*').eq('id',id).eq('user_id',user.id).single());
 if(body.action==='resume') {
 if(s.status!=='uploading') throw new Error('El demo ya fue recibido.');
 const u=checked(await db.from('collab_uploads').select('*').eq('submission_id',id).eq('kind','demo').order('created_at',{ascending:false}).limit(1).single());
 const info=await db.storage.from(PRIVATE_BUCKET).info(u.path);
 if(info.data) return json({alreadyUploaded:true,uploadId:u.id});
 if(Number(body.bytes)!==Number(u.bytes)) throw new Error('Reintenta con el archivo original y el mismo tamaño.');
 const r=await db.storage.from(PRIVATE_BUCKET).createSignedUploadUrl(u.path,{upsert:false});
 if(r.error||!r.data)throw new Error('No se pudo reanudar.');
 return json({path:u.path,token:r.data.token,bucket:PRIVATE_BUCKET,uploadId:u.id});
 }
 if(body.action==='document') {
 if(!['uploading','received','rights_pending'].includes(s.status)) throw new Error('El expediente ya está en revisión avanzada.');
 const bytes=z.number().int().min(1).max(MAX_DOCUMENT_BYTES).parse(body.bytes);
 return json(await uploadToken(id,'document',bytes));
 }
 if(body.action==='complete') {
 const u=await verifyUpload(id,uuid.parse(body.uploadId));
 if(!['demo','document'].includes(u.kind)) throw new Error('Archivo inválido.');
 if(u.kind==='demo' && s.status!=='uploading') throw new Error('Demo ya recibida.');
 // Inspect magic bytes; private data never becomes public.
 const {data,error}=await db.storage.from(PRIVATE_BUCKET).download(u.path);if(error||!data) throw new Error('Archivo no disponible.');
 const b=Buffer.from(await data.arrayBuffer());
 if(u.kind==='document' && b.toString('ascii',0,5)!=='%PDF-') throw new Error('El documento debe ser PDF.');
 if(u.kind==='demo' && !(b.toString('ascii',0,3)==='ID3' || (b[0]===255 && (b[1]&224)===224))) throw new Error('El demo debe ser MP3 válido.');
 checked(await db.from('collab_uploads').update({completed:true}).eq('id',u.id));
 checked(await db.from('collab_submissions').update(u.kind==='demo'?{status:'received'}:{document_path:u.path}).eq('id',id));
 await audit(user.id,'upload_completed',s.campaign_id,id,{kind:u.kind});return json({ok:true});
 }
 if(body.action==='accept_contract') {
 if(!s.contract_ready || !s.contract_hash || s.contract_signature) throw new Error('Acuerdo no disponible para aceptar.');
 if(body.hash!==s.contract_hash) throw new Error('El acuerdo cambió. Revísalo otra vez.');
 const name=str.parse(body.name);if(name.toLowerCase()!==s.legal_name.toLowerCase() || body.consent!==true) throw new Error('Usa tu nombre legal y acepta el documento.');
 const signature={name,user_id:user.id,email:user.email,accepted_at:new Date().toISOString(),hash:s.contract_hash,version:TERMS_VERSION,revision:s.contract_revision};
 const rows=checked(await db.from('collab_submissions').update({contract_signature:signature}).eq('id',id).eq('contract_hash',body.hash).is('contract_signature',null).select('id'));
 if(!rows.length) throw new Error('El acuerdo cambió o ya fue aceptado.');
 await audit(user.id,'artist_contract_accepted',s.campaign_id,id,{hash:hashText(s.contract_text),revision:s.contract_revision});return json({ok:true});
 }
 return json({error:'Acción inválida.'},400);
 }catch(e:any){return json({error:e.message},400);}
}
