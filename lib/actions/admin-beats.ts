"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

const catalogStatuses=["needs_review","published","draft","archived"];
const artStyles=["signature","neon","noir","luxury","velvet"];

function refreshBeatPaths(id?:string){
  revalidatePath("/admin/beats");
  revalidatePath("/beats");
  revalidatePath("/admin");
  if(id) revalidatePath("/admin/beats/"+id+"/art");
}

async function getBeatArtState(id:string){
  const service=createServiceClient();
  const {data,error}=await service.from("beats").select("art_seed,art_version").eq("id",id).maybeSingle();
  if(error||!data) throw new Error(error?.message||"Beat not found.");
  return {service,seed:Number(data.art_seed||1),version:Number(data.art_version||1)};
}

export async function updateBeatCatalogStatusAction(formData:FormData){
  await requireAdminPage();
  const id=String(formData.get("id")??"").trim();
  const status=String(formData.get("status")??"").trim();
  if(!id||!catalogStatuses.includes(status)) throw new Error("Invalid beat status.");
  const service=createServiceClient();
  const {error}=await service.from("beats").update({status}).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}

export async function useBeatArtVariantAction(formData:FormData){
  await requireAdminPage();
  const id=String(formData.get("id")??"").trim();
  const style=String(formData.get("style")??"signature").trim();
  const seed=Number.parseInt(String(formData.get("seed")??"1"),10);
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
  const id=String(formData.get("id")??"").trim();
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
  const id=String(formData.get("id")??"").trim();
  const style=String(formData.get("style")??"signature").trim();
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
  const id=String(formData.get("id")??"").trim();
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
  const id=String(formData.get("id")??"").trim();
  if(!id) throw new Error("Missing beat id.");
  const state=await getBeatArtState(id);
  const {error}=await state.service.from("beats").update({
    art_mode:"generated",art_version:state.version+1,art_updated_at:new Date().toISOString()
  }).eq("id",id);
  if(error) throw new Error(error.message);
  refreshBeatPaths(id);
}
