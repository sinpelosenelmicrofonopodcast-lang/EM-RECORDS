import { NextResponse } from "next/server";
import { requireApiHubContext, errorJson, slugify } from "@/lib/artist-hub/http";
import { hasArtistAccess, insertAuditLog } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const { data, error } = await auth.service.from("artists").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    return errorJson("Artist not found.", 404);
  }

  if (!hasArtistAccess(auth.ctx, id)) {
    return errorJson("Forbidden", 403);
  }

  return NextResponse.json({ artist: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  if (!hasArtistAccess(auth.ctx, id)) {
    return errorJson("Forbidden", 403);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return errorJson("Invalid payload.");
  }

  const { data: existing, error: existingError } = await auth.service.from("artists").select("*").eq("id", id).maybeSingle();
  if (existingError || !existing) {
    return errorJson("Artist not found.", 404);
  }

  const merged = {
    ...existing,
    name: typeof body.name === "string" ? body.name.trim() : existing.name,
    stage_name: typeof body.stageName === "string" ? body.stageName.trim() : existing.stage_name,
    slug: typeof body.slug === "string" && body.slug.trim() ? slugify(String(body.slug)) : existing.slug,
    tagline: typeof body.tagline === "string" ? body.tagline.trim() : existing.tagline,
    bio_short: typeof body.bioShort === "string" ? body.bioShort.trim() : existing.bio_short,
    bio_med: typeof body.bioMed === "string" ? body.bioMed.trim() : existing.bio_med,
    bio_long: typeof body.bioLong === "string" ? body.bioLong.trim() : existing.bio_long,
    bio: typeof body.bioMed === "string" ? body.bioMed.trim() : existing.bio,
    primary_genre: typeof body.primaryGenre === "string" ? body.primaryGenre.trim() : existing.primary_genre,
    territory: typeof body.territory === "string" ? body.territory.trim() : existing.territory,
    contacts: typeof body.contacts === "object" && body.contacts ? body.contacts : existing.contacts,
    social_links: typeof body.socialLinks === "object" && body.socialLinks ? body.socialLinks : existing.social_links,
    brand_kit: typeof body.brandKit === "object" && body.brandKit ? body.brandKit : existing.brand_kit,
    status: typeof body.status === "string" ? body.status : existing.status
  };

  const { data, error } = await auth.service
    .from("artists")
    .update({
      name: merged.name,
      stage_name: merged.stage_name,
      slug: merged.slug,
      tagline: merged.tagline,
      bio_short: merged.bio_short,
      bio_med: merged.bio_med,
      bio_long: merged.bio_long,
      bio: merged.bio,
      primary_genre: merged.primary_genre,
      territory: merged.territory,
      contacts: merged.contacts,
      social_links: merged.social_links,
      brand_kit: merged.brand_kit,
      status: merged.status
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return errorJson(error?.message ?? "Failed to update artist.", 400);
  }

  await insertAuditLog({
    actorUserId: auth.ctx.user.id,
    artistId: id,
    action: "update_artist",
    entityType: "artist",
    entityId: id,
    details: {
      fields: Object.keys(body)
    }
  }).catch(() => undefined);

  return NextResponse.json({ artist: data });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { id } = await params;

  if (!auth.ctx.isAdmin) {
    return errorJson("Forbidden", 403);
  }

  const { error } = await auth.service.from("artists").delete().eq("id", id);
  if (error) {
    return errorJson(error.message, 400);
  }

  await insertAuditLog({
    actorUserId: auth.ctx.user.id,
    artistId: id,
    action: "delete_artist",
    entityType: "artist",
    entityId: id,
    details: {}
  }).catch(() => undefined);

  return NextResponse.json({ success: true });
}
