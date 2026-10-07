"use server";
import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export async function updateBeatCatalogStatusAction(formData:FormData){
  await requireAdminPage();
  const id=String(formData.get("id")??"").trim();
  const status=String(formData.get("status")??"").trim();
  if(!id||!["needs_review","published","draft","archived"].includes(status)) throw new Error("Invalid beat status.");
  const service=createServiceClient();
  const {error}=await service.from("beats").update({status}).eq("id",id);
  if(error) throw new Error(error.message);
  revalidatePath("/admin/beats");
  revalidatePath("/beats");
  revalidatePath("/admin");
}
