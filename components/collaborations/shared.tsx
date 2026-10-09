'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/client';
export const input='w-full rounded-xl border border-white/20 bg-black px-4 py-3 text-sm text-white';
export const button='rounded-full border border-gold px-5 py-2 text-sm text-gold disabled:opacity-40';
export async function api(path:string,body?:unknown){const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store'});const x=await r.json();if(!r.ok)throw new Error(x.error||'No se pudo completar.');return x;}
export async function directUpload(file:Blob,token:any){const db=createClient();const r=await db.storage.from(token.bucket).uploadToSignedUrl(token.path,token.token,file,{contentType:token.path.endsWith('.wav')?'audio/wav':token.path.endsWith('.pdf')?'application/pdf':'audio/mpeg'});if(r.error)throw new Error(r.error.message);}
export function FilePlayer({id,field='demo_path',admin=false,legacy=false}:{id:string;field?:string;admin?:boolean;legacy?:boolean}){
 const [url,setUrl]=useState(''),[err,setErr]=useState('');
 async function open(){try{const x=await api(admin?`/api/admin/collaborations?kind=${legacy?'legacy':'file'}&id=${id}&field=${field}`:`/api/collaborations?kind=preview&id=${id}`);setUrl(x.url);}catch(e:any){setErr(e.message);}}
 const document=field==='document_path'||field==='signed_contract';
 return <div className="space-y-2">{!url?<button type="button" className={button} onClick={open}>{document?'Abrir documento':admin?'Escuchar en player':'Escuchar preview'}</button>:document?<a href={url} target="_blank" rel="noreferrer" className="text-gold underline">Ver PDF</a>:<audio className="w-full" controls preload="none" src={url}/>}<button type="button" hidden={!url} onClick={()=>{setUrl('');setErr('');}} className="text-xs text-white/50">Renovar acceso</button>{err?<p role="alert" className="text-sm text-red-300">{err}</p>:null}</div>;
}
export function downloadText(name:string,text:string){const u=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);}
