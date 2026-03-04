import { NextResponse } from "next/server";
import { buildLightroomAuthorizeUrl, handleLightroomOAuthCallback, isLightroomConfigured } from "@/lib/artist-hub/lightroom";
import { getHubUserContext } from "@/lib/artist-hub/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { errorJson } from "@/lib/artist-hub/http";
import { hasArtistAccess, insertAuditLog } from "@/lib/artist-hub/service";

export async function GET(request: Request) {
  if (!isLightroomConfigured()) {
    return errorJson("Lightroom OAuth is not configured in environment variables.", 400);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    try {
      const callback = await handleLightroomOAuthCallback({ code, state });
      const service = createServiceClient();
      const { data: artist } = await service.from("artists").select("slug").eq("id", callback.artistId).maybeSingle();

      await insertAuditLog({
        actorUserId: null,
        artistId: callback.artistId,
        action: "lightroom_oauth_connected",
        entityType: "lightroom_connection",
        entityId: callback.artistId,
        details: {}
      }).catch(() => undefined);

      const slug = artist?.slug ? String(artist.slug) : "";
      return NextResponse.redirect(new URL(slug ? `/dashboard/artist-hub/${slug}/gallery?lightroom=connected` : "/dashboard/artist-hub", url.origin));
    } catch (error: any) {
      return errorJson(error?.message ?? "Failed to complete Lightroom OAuth.", 400);
    }
  }

  const artistId = url.searchParams.get("artistId");
  if (!artistId) {
    return errorJson("artistId is required.");
  }

  const ctx = await getHubUserContext();
  if (!ctx) {
    return errorJson("Unauthorized", 401);
  }

  if (!hasArtistAccess(ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  try {
    const authorizeUrl = buildLightroomAuthorizeUrl(artistId, ctx.user.id);
    return NextResponse.redirect(authorizeUrl);
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to start Lightroom OAuth.", 400);
  }
}
