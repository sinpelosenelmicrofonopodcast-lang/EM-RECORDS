import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { BeatVaultManager } from "@/components/admin/beat-vault-manager";
import { getCurrentUser } from "@/lib/auth";
import { getPrivateBeatPath } from "@/lib/beat-vault";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function AdminBeatVaultPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/");

  const [keysResponse, beatsResponse] = await Promise.all([
    service.from("beat_vault_keys").select("id,label,is_active,expires_at,created_at").order("created_at", { ascending: false }),
    service.from("beats").select("id,audio_url").eq("status", "published")
  ]);
  const keys = keysResponse.data ?? [];
  const beats = beatsResponse.data ?? [];

  return (
    <AdminShell>
      <BeatVaultManager initialKeys={keys} totalBeats={beats.length} availableBeats={beats.filter((beat) => getPrivateBeatPath(beat.audio_url)).length} />
    </AdminShell>
  );
}
