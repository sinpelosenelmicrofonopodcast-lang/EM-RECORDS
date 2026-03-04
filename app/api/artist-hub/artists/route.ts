import { NextResponse } from "next/server";
import { listArtistsForContext, insertAuditLog } from "@/lib/artist-hub/service";
import { requireApiHubContext, errorJson, slugify } from "@/lib/artist-hub/http";

export async function GET() {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  try {
    const artists = await listArtistsForContext(auth.ctx);
    return NextResponse.json({ artists });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load artists.", 500);
  }
}

export async function POST(request: Request) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  if (!auth.ctx.isAdmin) {
    return errorJson("Forbidden", 403);
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        name?: string;
        stageName?: string;
        slug?: string;
        tagline?: string;
        bioShort?: string;
        bioMed?: string;
        bioLong?: string;
        primaryGenre?: string;
        territory?: string;
        contacts?: Record<string, unknown>;
        socialLinks?: Record<string, unknown>;
        brandKit?: Record<string, unknown>;
        status?: string;
        memberAssignments?: Array<{ userId: string; role: "artist" | "manager" | "booking" | "staff" | "admin" }>;
      }
    | null;

  if (!body?.name) {
    return errorJson("Missing artist name.");
  }

  const computedSlug = (body.slug && slugify(body.slug)) || slugify(body.stageName || body.name || "artist");
  if (!computedSlug) {
    return errorJson("Could not build artist slug.");
  }

  const payload: Record<string, unknown> = {
    name: body.name.trim(),
    slug: computedSlug,
    stage_name: body.stageName?.trim() || null,
    tagline: body.tagline?.trim() || "EM Records Artist",
    bio: body.bioMed?.trim() || body.bioShort?.trim() || "",
    bio_short: body.bioShort?.trim() || null,
    bio_med: body.bioMed?.trim() || null,
    bio_long: body.bioLong?.trim() || null,
    hero_media_url: "",
    avatar_url: "",
    booking_email: String(body.contacts?.bookingEmail ?? body.contacts?.email ?? "booking@emrecordsmusic.com"),
    primary_genre: body.primaryGenre?.trim() || null,
    territory: body.territory?.trim() || null,
    contacts: body.contacts ?? {},
    social_links: body.socialLinks ?? {},
    brand_kit: body.brandKit ?? {},
    status: body.status?.trim() || "active"
  };

  if (body.id) {
    payload.id = body.id;
  }

  const { data, error } = await auth.service.from("artists").upsert(payload).select("id,name,slug").single();
  if (error || !data) {
    return errorJson(error?.message ?? "Failed to save artist.", 400);
  }

  if (body.memberAssignments?.length) {
    const rows = body.memberAssignments
      .filter((item) => item.userId && item.role)
      .map((item) => ({
        artist_id: data.id,
        user_id: item.userId,
        role: item.role
      }));

    if (rows.length) {
      const { error: membersError } = await auth.service.from("artist_members").upsert(rows, { onConflict: "artist_id,user_id,role" });
      if (membersError) {
        return errorJson(membersError.message, 400);
      }
    }
  }

  await insertAuditLog({
    actorUserId: auth.ctx.user.id,
    artistId: String(data.id),
    action: body.id ? "update_artist" : "create_artist",
    entityType: "artist",
    entityId: String(data.id),
    details: {
      slug: String(data.slug),
      name: String(data.name)
    }
  }).catch(() => undefined);

  return NextResponse.json({ artist: data }, { status: body.id ? 200 : 201 });
}
