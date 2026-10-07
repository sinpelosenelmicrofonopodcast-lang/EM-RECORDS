"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { syncArtistCatalog } from "@/lib/catalog-sync";

export async function runCatalogSyncAction(formData: FormData) {
  await requireAdminPage();
  const artistId = String(formData.get("artistId") ?? "").trim() || undefined;
  const result = await syncArtistCatalog(artistId, { triggerType: "manual_dashboard" });
  revalidatePath("/admin/catalog-sync");
  revalidatePath("/admin");
  revalidatePath("/admin/artists");
  revalidatePath("/music");
  revalidatePath("/artists");
  const message =
    "Sync complete: " +
    result.imported +
    " imported, " +
    result.updated +
    " updated, " +
    result.conflicts +
    " conflicts.";
  redirect("/admin/catalog-sync?success=" + encodeURIComponent(message));
}
