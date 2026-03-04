import { NextResponse } from "next/server";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { getAuditByArtistId, getAuditGlobal, hasArtistAccess } from "@/lib/artist-hub/service";

export async function GET(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId");
  const limit = Math.max(1, Math.min(Number(searchParams.get("limit") ?? 100), 300));

  try {
    if (artistId) {
      if (!hasArtistAccess(auth.ctx, artistId)) {
        return errorJson("Forbidden", 403);
      }

      const events = await getAuditByArtistId(artistId, limit);
      return NextResponse.json({ events });
    }

    if (!auth.ctx.isAdmin) {
      return errorJson("artistId is required for non-admin users.", 403);
    }

    const events = await getAuditGlobal(limit);
    return NextResponse.json({ events });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load audit log.", 500);
  }
}
