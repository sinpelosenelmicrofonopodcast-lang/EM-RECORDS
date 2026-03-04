import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { HubMembership, HubRole, HubUserContext } from "@/lib/artist-hub/types";

function mapMembership(row: any): HubMembership {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    userId: String(row.user_id),
    role: String(row.role) as HubRole,
    permissions: (row.permissions ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at)
  };
}

export async function getHubUserContext(): Promise<HubUserContext | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  let isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    isAdmin = Boolean(profile?.is_admin);
  }

  const [{ data: memberships, error: membershipsError }, { data: globalRoles, error: globalRolesError }] = await Promise.all([
    supabase.from("artist_members").select("id,artist_id,user_id,role,permissions,created_at").eq("user_id", user.id),
    supabase.from("user_roles").select("role").eq("user_id", user.id)
  ]);

  return {
    user,
    isAdmin,
    globalRoles: globalRolesError ? [] : (globalRoles ?? []).map((row: any) => String(row.role) as HubRole),
    memberships: membershipsError ? [] : (memberships ?? []).map(mapMembership)
  };
}

export async function requireHubUserContext(): Promise<HubUserContext> {
  const ctx = await getHubUserContext();

  if (!ctx) {
    redirect("/admin/login");
  }

  return ctx;
}

export function hasArtistAccess(ctx: HubUserContext, artistId: string): boolean {
  if (ctx.isAdmin) return true;
  return ctx.memberships.some((item) => item.artistId === artistId);
}

export function hasArtistRole(ctx: HubUserContext, artistId: string, roles: HubRole[]): boolean {
  if (ctx.isAdmin) return true;
  return ctx.memberships.some((item) => item.artistId === artistId && roles.includes(item.role));
}

export function roleCanApproveContent(role: HubRole): boolean {
  return role === "manager" || role === "booking" || role === "admin";
}

export function bestArtistRole(ctx: HubUserContext, artistId: string): HubRole | null {
  if (ctx.isAdmin) return "admin";

  const ordered: HubRole[] = ["manager", "booking", "artist", "staff"];
  for (const role of ordered) {
    if (ctx.memberships.some((item) => item.artistId === artistId && item.role === role)) {
      return role;
    }
  }

  return null;
}

export async function requireHubAdmin(user?: User) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = await createClient();
  const resolvedUser = user ?? (await supabase.auth.getUser()).data.user;
  if (!resolvedUser) {
    throw new Error("Unauthorized");
  }

  let isAdmin = resolvedUser.user_metadata?.role === "admin";
  if (!isAdmin) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", resolvedUser.id).maybeSingle();
    isAdmin = Boolean(profile?.is_admin);
  }

  if (!isAdmin) {
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", resolvedUser.id).eq("role", "admin").maybeSingle();
    isAdmin = Boolean(roleRow?.role);
  }

  if (!isAdmin) {
    throw new Error("Forbidden");
  }

  return {
    user: resolvedUser,
    service: createServiceClient()
  };
}

export async function requireArtistAccessOrThrow(artistId: string): Promise<HubUserContext> {
  const ctx = await requireHubUserContext();
  if (!hasArtistAccess(ctx, artistId)) {
    throw new Error("Forbidden");
  }
  return ctx;
}
