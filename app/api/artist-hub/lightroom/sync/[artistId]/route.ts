import { NextResponse } from "next/server";
import { syncLightroomAlbum } from "@/lib/artist-hub/lightroom";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { hasArtistAccess, insertAuditLog } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ artistId: string }> };

export async function POST(_: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { artistId } = await params;

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  try {
    const synced = await syncLightroomAlbum(artistId);

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId,
      action: "lightroom_sync",
      entityType: "gallery",
      entityId: artistId,
      details: {
        synced: synced.synced
      }
    }).catch(() => undefined);

    return NextResponse.json(synced);
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to sync Lightroom album.", 400);
  }
}
