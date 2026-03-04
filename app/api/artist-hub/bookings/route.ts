import { NextResponse } from "next/server";
import { requireApiHubContext, errorJson } from "@/lib/artist-hub/http";
import { getBookingsByArtistId, hasArtistAccess, insertAuditLog, roleForArtist } from "@/lib/artist-hub/service";

export async function GET(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("artistId");
  if (!artistId) return errorJson("artistId is required.");
  if (!hasArtistAccess(auth.ctx, artistId)) return errorJson("Forbidden", 403);

  try {
    const bookings = await getBookingsByArtistId(artistId);
    return NextResponse.json({ bookings });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load bookings.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        artistId?: string;
        requesterName?: string;
        requesterEmail?: string;
        eventName?: string;
        eventLocation?: string;
        eventDate?: string | null;
        budget?: number | null;
        notes?: string;
        status?: "new" | "in_review" | "negotiating" | "confirmed" | "done" | "declined";
      }
    | null;

  if (!body?.artistId) return errorJson("artistId is required.");
  if (!hasArtistAccess(auth.ctx, body.artistId)) return errorJson("Forbidden", 403);

  const role = roleForArtist(auth.ctx, body.artistId);
  const canMoveStatus = auth.ctx.isAdmin || role === "manager" || role === "booking";

  if (!body.id) {
    const { data, error } = await auth.service
      .from("booking_requests")
      .insert({
        artist_id: body.artistId,
        requester_name: body.requesterName?.trim() || null,
        requester_email: body.requesterEmail?.trim() || null,
        event_name: body.eventName?.trim() || null,
        event_location: body.eventLocation?.trim() || null,
        event_date: body.eventDate ?? null,
        budget: body.budget ?? null,
        notes: body.notes?.trim() || null,
        status: canMoveStatus ? body.status ?? "new" : "new",
        created_by: auth.ctx.user.id,
        updated_by: auth.ctx.user.id
      })
      .select("*")
      .single();

    if (error || !data) return errorJson(error?.message ?? "Failed to create booking request.", 400);

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId: body.artistId,
      action: "create_booking_request",
      entityType: "booking_request",
      entityId: String(data.id),
      details: {
        status: data.status
      }
    }).catch(() => undefined);

    return NextResponse.json({ booking: data }, { status: 201 });
  }

  const { data: existing, error: existingError } = await auth.service.from("booking_requests").select("*").eq("id", body.id).maybeSingle();
  if (existingError || !existing) return errorJson("Booking request not found.", 404);

  const nextStatus = body.status ?? existing.status;
  if (nextStatus !== existing.status && !canMoveStatus) {
    return errorJson("Only manager/booking/admin can move booking status.", 403);
  }

  const { data, error } = await auth.service
    .from("booking_requests")
    .update({
      requester_name: body.requesterName ?? existing.requester_name,
      requester_email: body.requesterEmail ?? existing.requester_email,
      event_name: body.eventName ?? existing.event_name,
      event_location: body.eventLocation ?? existing.event_location,
      event_date: body.eventDate ?? existing.event_date,
      budget: body.budget ?? existing.budget,
      notes: body.notes ?? existing.notes,
      status: nextStatus,
      updated_by: auth.ctx.user.id
    })
    .eq("id", body.id)
    .select("*")
    .single();

    if (error || !data) return errorJson(error?.message ?? "Failed to update booking request.", 400);

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId: body.artistId,
      action: "update_booking_request",
      entityType: "booking_request",
      entityId: String(data.id),
      details: { status: data.status }
    }).catch(() => undefined);

    return NextResponse.json({ booking: data });
}
