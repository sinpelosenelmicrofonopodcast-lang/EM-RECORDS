import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/utils";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { hasArtistAccess, insertAuditLog } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ songId: string }> };

async function getSong(service: ReturnType<typeof import("@/lib/supabase/service").createServiceClient>, songId: string) {
  const { data, error } = await service.from("songs").select("id,title,artist_id").eq("id", songId).maybeSingle();
  if (error || !data) {
    throw new Error("Song not found.");
  }
  return data;
}

export async function GET(_: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { songId } = await params;

  try {
    const song = await getSong(auth.service, songId);
    if (!hasArtistAccess(auth.ctx, String(song.artist_id))) {
      return errorJson("Forbidden", 403);
    }

    const [pkgRes, documentsRes, assetsRes] = await Promise.all([
      auth.service.from("sync_packages").select("*").eq("song_id", songId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      auth.service.from("documents").select("id,type,url,version,status").eq("song_id", songId).is("deleted_at", null),
      auth.service.from("media_assets").select("id,type,url").eq("song_id", songId)
    ]);

    if (pkgRes.error) return errorJson(pkgRes.error.message, 400);

    return NextResponse.json({
      song,
      syncPackage: pkgRes.data,
      oneStop: {
        documents: documentsRes.data ?? [],
        assets: assetsRes.data ?? []
      }
    });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load sync package.", 400);
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { songId } = await params;

  const body = (await request.json().catch(() => null)) as
    | {
        tags?: Record<string, unknown>;
        expiresAt?: string | null;
      }
    | null;

  try {
    const song = await getSong(auth.service, songId);
    const artistId = String(song.artist_id);

    if (!hasArtistAccess(auth.ctx, artistId)) {
      return errorJson("Forbidden", 403);
    }

    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
    const link = absoluteUrl(`/api/artist-hub/sync/${songId}?token=${token}`);

    const { data, error } = await auth.service
      .from("sync_packages")
      .insert({
        song_id: songId,
        tags: body?.tags ?? {},
        link,
        expires_at: body?.expiresAt ?? null,
        created_by: auth.ctx.user.id
      })
      .select("*")
      .single();

    if (error || !data) {
      return errorJson(error?.message ?? "Failed to create sync package.", 400);
    }

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId,
      action: "create_sync_package",
      entityType: "sync_package",
      entityId: String(data.id),
      details: {
        songId,
        link,
        expiresAt: body?.expiresAt ?? null
      }
    }).catch(() => undefined);

    return NextResponse.json({ syncPackage: data }, { status: 201 });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to create sync package.", 400);
  }
}
