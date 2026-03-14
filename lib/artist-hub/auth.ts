import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getCurrentUserRoleSnapshot } from "@/lib/auth";
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

  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot) return null;

  const service = createServiceClient();
  const { data: memberships, error: membershipsError } = await service
    .from("artist_members")
    .select("id,artist_id,user_id,role,permissions,created_at")
    .eq("user_id", snapshot.user.id);
  const safeMemberships = membershipsError ? [] : (memberships ?? []).map(mapMembership);
  const safeGlobalRoles = snapshot.globalRoles.map((role) => role as HubRole);
  const isAdmin = snapshot.isAdmin;
  const isApproved = isAdmin || safeMemberships.length > 0 || safeGlobalRoles.length > 0;

  return {
    user: snapshot.user,
    isAdmin,
    isApproved,
    globalRoles: safeGlobalRoles,
    memberships: safeMemberships
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

  const snapshot = await getCurrentUserRoleSnapshot(user);
  if (!snapshot) {
    throw new Error("Unauthorized");
  }
  if (!snapshot.isAdmin) {
    throw new Error("Forbidden");
  }

  return {
    user: snapshot.user,
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
