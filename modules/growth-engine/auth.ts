import { redirect } from "next/navigation";
import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/service";
import type { GrowthAccess, GrowthRole } from "@/modules/growth-engine/types";

const ROLE_ORDER: Record<GrowthRole, number> = {
  admin: 1,
  owner: 2,
  developer: 3
};

function normalizeRole(value: string | null | undefined): GrowthRole | null {
  if (value === "admin" || value === "owner" || value === "developer") return value;
  return null;
}

function resolveGrowthRole(snapshot: Awaited<ReturnType<typeof getCurrentUserRoleSnapshot>>): GrowthRole | null {
  if (!snapshot) return null;

  const explicitRoles = [
    normalizeRole(snapshot.profileRole),
    ...snapshot.globalRoles.map((role) => normalizeRole(role))
  ].filter(Boolean) as GrowthRole[];

  if (explicitRoles.includes("developer")) return "developer";
  if (explicitRoles.includes("owner")) return "owner";
  if (explicitRoles.includes("admin")) return "admin";

  // Preserve backwards compatibility for existing admin users already controlling the app.
  if (snapshot.isAdmin) return "developer";
  return null;
}

export function hasGrowthAccess(access: GrowthAccess | null | undefined, minimumRole: GrowthRole): boolean {
  if (!access) return false;
  return ROLE_ORDER[access.role] >= ROLE_ORDER[minimumRole];
}

export async function getGrowthAccessSnapshot(): Promise<GrowthAccess | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const snapshot = await getCurrentUserRoleSnapshot();
  const role = resolveGrowthRole(snapshot);
  if (!snapshot || !role) return null;

  return {
    role,
    canEditContent: true,
    canApproveContent: role === "owner" || role === "developer",
    canManageAutomation: role === "owner" || role === "developer",
    canManageTokens: role === "developer"
  };
}

export async function requireGrowthPageAccess(minimumRole: GrowthRole = "admin") {
  const access = await getGrowthAccessSnapshot();
  if (!access) {
    redirect("/admin/login");
  }

  if (!hasGrowthAccess(access, minimumRole)) {
    redirect("/admin");
  }

  return access;
}

export async function requireGrowthApiContext(minimumRole: GrowthRole = "admin") {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, status: 500, error: "Supabase is not configured." };
  }

  const access = await getGrowthAccessSnapshot();
  if (!access) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  if (!hasGrowthAccess(access, minimumRole)) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, access, service: createServiceClient() };
}
