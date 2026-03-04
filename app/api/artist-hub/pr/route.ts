import { NextResponse } from "next/server";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { getPrByArtistId, hasArtistAccess, insertAuditLog, roleForArtist } from "@/lib/artist-hub/service";

export async function GET(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId");
  if (!artistId) return errorJson("artistId is required.");

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  try {
    const requests = await getPrByArtistId(artistId);
    return NextResponse.json({ requests });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load PR inbox.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        artistId?: string;
        outlet?: string;
        contact?: string;
        requestedAt?: string | null;
        topic?: string;
        status?: "new" | "in_review" | "accepted" | "scheduled" | "done" | "declined";
        notes?: string;
        attachments?: Record<string, unknown>[];
      }
    | null;

  if (!body?.artistId) return errorJson("artistId is required.");
  if (!hasArtistAccess(auth.ctx, body.artistId)) return errorJson("Forbidden", 403);

  const role = roleForArtist(auth.ctx, body.artistId);
  const canManagePipeline = auth.ctx.isAdmin || role === "manager" || role === "booking";

  if (!body.id) {
    if (!body.outlet?.trim()) {
      return errorJson("outlet is required.");
    }

    const { data, error } = await auth.service
      .from("pr_requests")
      .insert({
        artist_id: body.artistId,
        outlet: body.outlet.trim(),
        contact: body.contact?.trim() || null,
        requested_at: body.requestedAt ?? null,
        topic: body.topic?.trim() || null,
        status: canManagePipeline ? body.status ?? "new" : "new",
        notes: body.notes?.trim() || null,
        attachments: body.attachments ?? [],
        created_by: auth.ctx.user.id
      })
      .select("*")
      .single();

    if (error || !data) {
      return errorJson(error?.message ?? "Failed to create PR request.", 400);
    }

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId: body.artistId,
      action: "create_pr_request",
      entityType: "pr_request",
      entityId: String(data.id),
      details: { status: data.status }
    }).catch(() => undefined);

    return NextResponse.json({ request: data }, { status: 201 });
  }

  const { data: existing, error: existingError } = await auth.service.from("pr_requests").select("*").eq("id", body.id).maybeSingle();
  if (existingError || !existing) return errorJson("PR request not found.", 404);

  const nextStatus = body.status ?? existing.status;
  if (nextStatus !== existing.status && !canManagePipeline) {
    return errorJson("Only manager/booking/admin can move PR pipeline status.", 403);
  }

  const { data, error } = await auth.service
    .from("pr_requests")
    .update({
      outlet: body.outlet?.trim() || existing.outlet,
      contact: body.contact?.trim() || existing.contact,
      requested_at: body.requestedAt ?? existing.requested_at,
      topic: body.topic?.trim() || existing.topic,
      status: nextStatus,
      notes: body.notes?.trim() ?? existing.notes,
      attachments: body.attachments ?? existing.attachments
    })
    .eq("id", body.id)
    .select("*")
    .single();

  if (error || !data) return errorJson(error?.message ?? "Failed to update PR request.", 400);

  await insertAuditLog({
    actorUserId: auth.ctx.user.id,
    artistId: body.artistId,
    action: "update_pr_request",
    entityType: "pr_request",
    entityId: String(data.id),
    details: {
      status: data.status
    }
  }).catch(() => undefined);

  return NextResponse.json({ request: data });
}
