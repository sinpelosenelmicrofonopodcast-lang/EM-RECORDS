import 'server-only';
import { createHash } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { PRIVATE_BUCKET, type Campaign } from './contracts';
export const publicCampaignFields='id,slug,title,description,project_artist,status,legal_entity,eligibility,promotion_commitment,submissions_start,submissions_end,voting_start,voting_end,max_submissions,rules_version,rules';
export async function verifiedUser() {
 const db=await createClient(); const {data:{user}}=await db.auth.getUser();
 if(!user || !user.email_confirmed_at || user.is_anonymous) throw new Error('Entra con una cuenta de correo verificado.');
 return user;
}
export function checked<T>(r:{data:T;error:any}):NonNullable<T> {if(r.error) throw new Error(r.error.message);return r.data as NonNullable<T>;}
export async function campaign(id:string) {const db=createServiceClient(); return checked(await db.from('collab_campaigns').select('*').eq('id',id).single()) as Campaign;}
export async function publicData() {
 const db=createServiceClient();
 const campaigns=checked(await db.from('collab_campaigns').select(publicCampaignFields).order('created_at',{ascending:false}));
 const ids=campaigns.map(c=>c.id);
 if(!ids.length) return {campaigns,beats:[],tracks:[]};
 const [b,t]=await Promise.all([
 db.from('collab_beats').select('id,campaign_id,title,producer,source_beat_id').in('campaign_id',ids).eq('active',true).eq('rights_confirmed',true),
 db.from('collab_submissions').select('id,campaign_id,artist_name,track_title,status').in('campaign_id',ids).in('status',['approved','selected','reserve','production','released']).eq('rights_verified',true).eq('preview_verified',true).eq('preview_consent',true)
 ]);
 const visible=campaigns.filter(c=>['voting','closed','production','released'].includes(c.status)).map(c=>c.id);
 return {campaigns,beats:checked(b),tracks:checked(t).filter(t=>visible.includes(t.campaign_id))};
}
export async function adminData() {
 const db=createServiceClient();
 const [c,s,b,v,a,cat]=await Promise.all([
 db.from('collab_campaigns').select('*').order('created_at',{ascending:false}),
 db.from('collab_submissions').select('*').order('created_at',{ascending:false}).limit(250),
 db.from('collab_beats').select('*'),db.rpc('collab_vote_counts'),
 db.from('collab_audit').select('*').order('created_at',{ascending:false}).limit(50),
 db.from('beats').select('id,title,status').order('title')]);
 const votes:Record<string,number>={};for(const row of checked(v)) votes[row.submission_id]=Number(row.votes);
 return {campaigns:checked(c),submissions:checked(s).map(x=>({...x,votes:votes[x.id]||0})),beats:checked(b),audit:checked(a),catalog:cat.error?[]:cat.data};
}
export async function audit(actor:string,action:string,campaignId:string,submissionId:string|null,details:Record<string,unknown>={}) {
 const db=createServiceClient();checked(await db.from('collab_audit').insert({actor_id:actor,action,campaign_id:campaignId,submission_id:submissionId,details}));
}
export function hashText(s:string){return createHash('sha256').update(s).digest('hex');}
export async function uploadToken(submissionId:string,kind:string,bytes:number) {
 const db=createServiceClient();const path=`${submissionId}/${kind}/${crypto.randomUUID()}.${kind==='demo'?'mp3':kind==='preview'?'wav':'pdf'}`;
 const id=checked(await db.rpc('collab_reserve_upload',{p_submission:submissionId,p_path:path,p_kind:kind,p_bytes:bytes}));
 const r=await db.storage.from(PRIVATE_BUCKET).createSignedUploadUrl(path,{upsert:false});
 if(r.error || !r.data) {await db.from('collab_uploads').delete().eq('id',id);throw new Error('No se pudo preparar la carga.');}
 return {path,token:r.data.token,bucket:PRIVATE_BUCKET,uploadId:id};
}
export async function verifyUpload(submissionId:string,uploadId:string) {
 const db=createServiceClient();const u=checked(await db.from('collab_uploads').select('*').eq('id',uploadId).eq('submission_id',submissionId).single());
 const info=await db.storage.from(PRIVATE_BUCKET).info(u.path);
 if(info.error || !info.data) throw new Error('La carga no ha terminado.');
 const size=Number(info.data.size);
 if(size!==Number(u.bytes)) throw new Error('El tamaño del archivo no coincide con la reserva.');
 return u;
}
export async function signed(path:string) {
 const db=createServiceClient();const r=await db.storage.from(PRIVATE_BUCKET).createSignedUrl(path,120);
 if(r.error || !r.data) throw new Error('Archivo no disponible.');return r.data.signedUrl;
}
