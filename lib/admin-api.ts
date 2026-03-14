import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function requireAdminApiContext() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 500, error: "Supabase is not configured." };
  }

  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  if (!snapshot.isAdmin) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, user: snapshot.user, service: createServiceClient() };
}
