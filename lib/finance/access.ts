import { redirect } from "next/navigation";
import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/service";

// Financial data requires an admin role stored in the database. User-editable
// auth.user_metadata is intentionally NOT an authorization signal here.
function hasFinanceAccess(snapshot: Awaited<ReturnType<typeof getCurrentUserRoleSnapshot>>) {
  return Boolean(
    snapshot && (
      snapshot.profileIsAdmin ||
      ["admin", "owner", "developer"].includes(snapshot.profileRole ?? "") ||
      snapshot.globalRoles.some((role) => ["admin", "owner", "developer"].includes(role))
    )
  );
}

export async function requireFinancePageAccess() {
  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot) redirect("/admin/login");
  if (!hasFinanceAccess(snapshot)) redirect("/admin");
  return snapshot.user;
}

export async function requireFinanceApiContext() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 500, error: "Supabase no configurado." };
  }
  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot) return { ok: false as const, status: 401, error: "No autenticado." };
  if (!hasFinanceAccess(snapshot)) return { ok: false as const, status: 403, error: "Acceso denegado." };
  return { ok: true as const, service: createServiceClient(), userId: snapshot.user.id };
}
