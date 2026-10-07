"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

const catalogStatuses=["needs_review","published","draft","archived"];
const artStyles=["signature","neon","noir","luxury","velvet"];
const artModes=["generated","manual"];

function refreshBeatPaths(id?:string){
  revalidatePath("/admin/beats");
  revalidatePath("/beats");
  revalidatePath("/admin");
  if(id){
    revalidatePath("/admin/beats/"+id);
    revalidatePath("/admin/beats/"+id+"/art");
  }
}

function field(formData:FormData,name:string){
  return String(formData.get(name)??"").trim();
}

function optionalText(formData:FormData,name:string){
  const value=field(formData,name);
  return value||null;
}

function integerField(formData:FormData,name:string,min:number,max:number){
  const raw=field(formData,name);
  const value=Number.parseInt(raw,10);
  if(!Number.isFinite(value)||value<min||value>max) throw new Error("Invalid "+name+".");
  return value;
}

function moneyToCents(formData:FormData,name:string){
  const raw=field(formData,name).replace(/[$,\s]/g,"");
  const value=Number(raw);
  if(!Number.isFinite(value)||value<0||value>1000000) throw new Error("Invalid "+name+".");
  return Math.round(value*100);
}

function parseTags(value:string){
  return Array.from(new Set(value.split(/[\n,]+/).map((item)=>item.trim()).filter(Boolean))).slice(0,40);
}

async function getBeatArtState(id:string){
  const service=createServiceClient();
  const {data,error}=await service.from("beats").select("art_seed,art_version,art_mode,art_style").eq("id",id).maybeSingle();
  if(error||!data) throw new Error(error?.message||"Beat not found.");
  return {
    service,
    seed:Number(data.art_seed||1),
    version:Number(data.art_version||1),
    mode:String(data.art_mode||"generated"),
    style:String(data.art_style||"signature")
  };
}

export async function updateBeatCatalogStatusAction(formData:FormData){
  await requireAdminPage();
  const id=field(formData,"id");
  const status=field(formData,"status");
  if(!id||!catalogStatuses.includes(status)) throw new Error("Invalid beat status.");
  const service=createServiceClient();
  const {error}=await service.from("beats").update({status}).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}

export async function updateBeatDetailsAction(formData:FormData){
  await requireAdminPage();
  const id=field(formData,"id");
  if(!id) throw new Error("Missing beat id.");

  const status=field(formData,"status");
  if(!catalogStatuses.includes(status)) throw new Error("Invalid beat status.");

  const categoryId=field(formData,"category_id")||null;
  const artMode=field(formData,"art_mode")||"generated";
  const artStyle=field(formData,"art_style")||"signature";
  if(!artModes.includes(artMode)) throw new Error("Invalid art mode.");
  if(!artStyles.includes(artStyle)) throw new Error("Invalid art style.");

  const title=field(formData,"title");
  const displayTitle=field(formData,"display_title");
  if(!title) throw new Error("Original title is required.");
  if(!displayTitle) throw new Error("Public title is required.");

  const bpm=integerField(formData,"bpm",0,400);
  const previewStart=integerField(formData,"preview_start_seconds",0,3600);
  const previewDuration=integerField(formData,"preview_duration_seconds",10,90);

  const service=createServiceClient();

  if(categoryId){
    const {data:category,error:categoryError}=await service.from("beat_categories").select("id").eq("id",categoryId).maybeSingle();
    if(categoryError||!category) throw new Error("Invalid category.");
  }

  const {data:current,error:currentError}=await service.from("beats")
    .select("art_mode,art_style,art_version")
    .eq("id",id)
    .maybeSingle();
  if(currentError||!current) throw new Error(currentError?.message||"Beat not found.");

  const artChanged=String(current.art_mode||"generated")!==artMode||String(current.art_style||"signature")!==artStyle;

  const payload={
    title,
    display_title:displayTitle,
    slug:field(formData,"slug")||null,
    status,
    category_id:categoryId,
    genre:optionalText(formData,"genre"),
    mood:optionalText(formData,"mood"),
    bpm,
    key:optionalText(formData,"key"),
    tags:parseTags(field(formData,"tags")),
    description:optionalText(formData,"description"),
    price_basic:moneyToCents(formData,"price_basic"),
    price_standard:moneyToCents(formData,"price_standard"),
    price_premium:moneyToCents(formData,"price_premium"),
    price_exclusive:moneyToCents(formData,"price_exclusive"),
    is_exclusive_sold:formData.get("is_exclusive_sold")==="on",
    preview_start_seconds:previewStart,
    preview_duration_seconds:previewDuration,
    art_mode:artMode,
    art_style:artStyle,
    art_version:Number(current.art_version||1)+(artChanged?1:0),
    art_updated_at:artChanged?new Date().toISOString():undefined
  };

  const cleanPayload=Object.fromEntries(Object.entries(payload).filter(([,value])=>value!==undefined));
  const {error}=await service.from("beats").update(cleanPayload).eq("id",id);
  if(error) throw new Error(error.message);

  refreshBeatPaths(id);
  redirect("/admin/beats/"+id+"?saved=1");
}

export async function useBeatArtVariantAction(formData:FormData){
  await requireAdminPage();
  const id=field(formData,"id");
  const style=field(formData,"style")||"signature";
  const seed=Number.parseInt(field(formData,"seed")||"1",10);
  if(!id||!artStyles.includes(style)||!Number.isFinite(seed)) throw new Error("Invalid beat art selection.");
  const state=await getBeatArtState(id);
  const {error}=await state.service.from("beats").update({
    art_mode:"generated",art_style:style,art_seed:Math.max(1,seed),
    art_version:state.version+1,art_updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}

export async function regenerateBeatArtAction(formData:FormData){
  await requireAdminPage();
  const id=field(formData,"id");
  if(!id) throw new Error("Missing beat id.");
  const state=await getBeatArtState(id);
  const {error}=await state.service.from("beats").update({
    art_mode:"generated",art_seed:state.seed+1,art_version:state.version+1,art_updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}

export async function setBeatArtStyleAction(formData:FormData){
  await requireAdminPage();
  const id=field(formData,"id");
  const style=field(formData,"style")||"signature";
  if(!id||!artStyles.includes(style)) throw new Error("Invalid art style.");
  const state=await getBeatArtState(id);
  const {error}=await state.service.from("beats").update({
    art_mode:"generated",art_style:style,art_version:state.version+1,art_updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}

export async function useManualBeatCoverAction(formData:FormData){
  await requireAdminPage();
  const id=field(formData,"id");
  if(!id) throw new Error("Missing beat id.");
  const state=await getBeatArtState(id);
  const {error}=await state.service.from("beats").update({
    art_mode:"manual",art_version:state.version+1,art_updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}

export async function useGeneratedBeatCoverAction(formData:FormData){
  await requireAdminPage();
  const id=field(formData,"id");
  if(!id) throw new Error("Missing beat id.");
  const state=await getBeatArtState(id);
  const {error}=await state.service.from("beats").update({
    art_mode:"generated",art_version:state.version+1,art_updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}
