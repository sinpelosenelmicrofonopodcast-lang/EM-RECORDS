import { NextResponse } from "next/server";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { canApproveContent, getContentByArtistId, hasArtistAccess, insertAuditLog, roleForArtist } from "@/lib/artist-hub/service";

export async function GET(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId");
  if (!artistId) {
    return errorJson("artistId is required.");
  }

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  try {
    const items = await getContentByArtistId(artistId);
    return NextResponse.json({ items });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load content items.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        artistId?: string;
        type?: "reel" | "post" | "story";
        caption?: string;
        assets?: Record<string, unknown>[];
        scheduledAt?: string | null;
        status?: "draft" | "submitted" | "approved" | "scheduled" | "published" | "rejected";
        comment?: string;
      }
    | null;

  if (!body?.artistId) {
    return errorJson("artistId is required.");
  }

  if (!hasArtistAccess(auth.ctx, body.artistId)) {
    return errorJson("Forbidden", 403);
  }

  const role = roleForArtist(auth.ctx, body.artistId);

  if (!body.id) {
    const status = body.status ?? "draft";
    if ((status === "approved" || status === "scheduled" || status === "published") && !canApproveContent(role)) {
      return errorJson("Only manager/booking/admin can publish directly.", 403);
    }

    const { data, error } = await auth.service
      .from("content_items")
      .insert({
        artist_id: body.artistId,
        type: body.type ?? "post",
        caption: body.caption?.trim() || null,
        assets: body.assets ?? [],
        scheduled_at: body.scheduledAt ?? null,
        status,
        submitted_by: auth.ctx.user.id,
        approvals: []
      })
      .select("*")
      .single();

    if (error || !data) {
      return errorJson(error?.message ?? "Failed to create content item.", 400);
    }

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId: body.artistId,
      action: "create_content_item",
      entityType: "content_item",
      entityId: String(data.id),
      details: {
        status: data.status
      }
    }).catch(() => undefined);

    return NextResponse.json({ item: data }, { status: 201 });
  }

  const { data: existing, error: existingError } = await auth.service.from("content_items").select("*").eq("id", body.id).maybeSingle();
  if (existingError || !existing) {
    return errorJson("Content item not found.", 404);
  }

  if (String(existing.artist_id) !== body.artistId) {
    return errorJson("Artist mismatch.", 400);
  }

  const nextStatus = body.status ?? existing.status;
  const isApprovalTransition = ["approved", "rejected", "scheduled", "published"].includes(nextStatus);
  if (isApprovalTransition && !canApproveContent(role)) {
    return errorJson("Only manager/booking/admin can approve or schedule.", 403);
  }

  const approvals = Array.isArray(existing.approvals) ? [...existing.approvals] : [];
  if (body.status && body.status !== existing.status) {
    approvals.push({
      at: new Date().toISOString(),
      by: auth.ctx.user.id,
      from: existing.status,
      to: body.status,
      comment: body.comment ?? null
    });
  }

  const { data, error } = await auth.service
    .from("content_items")
    .update({
      type: body.type ?? existing.type,
      caption: body.caption ?? existing.caption,
      assets: body.assets ?? existing.assets,
      scheduled_at: body.scheduledAt ?? existing.scheduled_at,
      status: nextStatus,
      approved_by: canApproveContent(role) && isApprovalTransition ? auth.ctx.user.id : existing.approved_by,
      approvals
    })
    .eq("id", body.id)
    .select("*")
    .single();

  if (error || !data) {
    return errorJson(error?.message ?? "Failed to update content item.", 400);
  }

  await insertAuditLog({
    actorUserId: auth.ctx.user.id,
    artistId: body.artistId,
    action: "content_status_change",
    entityType: "content_item",
    entityId: String(data.id),
    details: {
      status: nextStatus,
      comment: body.comment ?? null
    }
  }).catch(() => undefined);

  return NextResponse.json({ item: data });
}
