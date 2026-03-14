import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type UserRoleSnapshot = {
  user: User;
  profileRole: string | null;
  profileIsAdmin: boolean;
  globalRoles: string[];
  isAdmin: boolean;
  isStaff: boolean;
};

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return user;
}

export async function getCurrentUserRoleSnapshot(user?: User): Promise<UserRoleSnapshot | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const resolvedUser = user ?? (await supabase.auth.getUser()).data.user;

  if (!resolvedUser) {
    return null;
  }

  let profile: { is_admin?: boolean | null; role?: string | null } | null = null;
  let roleRows: Array<{ role: string | null }> = [];

  try {
    const service = createServiceClient();
    const [profileResult, rolesResult] = await Promise.all([
      service.from("profiles").select("is_admin,role").eq("id", resolvedUser.id).maybeSingle(),
      service.from("user_roles").select("role").eq("user_id", resolvedUser.id)
    ]);

    profile = profileResult.data;
    roleRows = (rolesResult.data ?? []) as Array<{ role: string | null }>;
  } catch {
    const { data } = await supabase.from("profiles").select("is_admin,role").eq("id", resolvedUser.id).maybeSingle();
    profile = data;
  }

  const profileRole = profile?.role ? String(profile.role) : null;
  const profileIsAdmin = Boolean(profile?.is_admin);
  const globalRoles = (roleRows ?? []).map((row: any) => String(row.role));
  const isAdmin = Boolean(resolvedUser.user_metadata?.role === "admin" || profileIsAdmin || globalRoles.includes("admin"));
  const isStaff =
    isAdmin ||
    profileRole === "admin" ||
    profileRole === "staff" ||
    globalRoles.some((role) => role === "admin" || role === "manager" || role === "staff" || role === "booking");

  return {
    user: resolvedUser,
    profileRole,
    profileIsAdmin,
    globalRoles,
    isAdmin,
    isStaff
  };
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot || snapshot.user.id !== userId) {
    return false;
  }

  return snapshot.isAdmin;
}

export async function requireAdminPage() {
  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot) {
    redirect("/admin/login");
  }

  if (!snapshot.isAdmin) {
    redirect("/");
  }

  return snapshot.user;
}
