import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireApiHubContext, errorJson, slugify } from "@/lib/artist-hub/http";
import { hasArtistAccess, insertAuditLog, resolveMaybeSignedUrl, smartlinkUrl, toStorageUrl } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ releaseId: string }> };

function dataUrlToBuffer(dataUrl: string): Buffer {
  const [, b64 = ""] = dataUrl.split(",");
  return Buffer.from(b64, "base64");
}

async function getRelease(service: ReturnType<typeof import("@/lib/supabase/service").createServiceClient>, releaseId: string) {
  const { data, error } = await service.from("releases").select("id,artist_id,title,smartlink_slug").eq("id", releaseId).maybeSingle();
  if (error || !data) {
    throw new Error("Release not found.");
  }
  if (!data.artist_id) {
    throw new Error("Release has no linked artist_id.");
  }
  return data;
}

async function ensureUniqueSlug(service: ReturnType<typeof import("@/lib/supabase/service").createServiceClient>, desired: string, releaseId: string): Promise<string> {
  let candidate = desired || `release-${releaseId.slice(0, 8)}`;

  for (let i = 0; i < 8; i += 1) {
    const { data } = await service.from("smartlinks").select("id,release_id").eq("slug", candidate).maybeSingle();
    if (!data || data.release_id === releaseId) {
      return candidate;
    }
    candidate = `${desired}-${Math.floor(Math.random() * 9999)}`;
  }

  return `${desired}-${Date.now().toString().slice(-5)}`;
}

export async function GET(_: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { releaseId } = await params;

  try {
    const release = await getRelease(auth.service, releaseId);
    if (!hasArtistAccess(auth.ctx, String(release.artist_id))) {
      return errorJson("Forbidden", 403);
    }

    const { data: smartlink, error } = await auth.service
      .from("smartlinks")
      .select("id,release_id,slug,links,presave,qr_asset_id,media_assets(id,url,thumb_url)")
      .eq("release_id", releaseId)
      .maybeSingle();

    if (error) {
      return errorJson(error.message, 400);
    }

    const mediaAssetRow = Array.isArray((smartlink as any)?.media_assets)
      ? (smartlink as any).media_assets[0]
      : (smartlink as any)?.media_assets;
    const qrUrl = await resolveMaybeSignedUrl(mediaAssetRow?.url ?? null);

    return NextResponse.json({
      smartlink: smartlink
        ? {
            id: smartlink.id,
            releaseId: smartlink.release_id,
            slug: smartlink.slug,
            url: smartlinkUrl(smartlink.slug),
            links: smartlink.links ?? {},
            presave: smartlink.presave ?? {},
            qrAssetId: smartlink.qr_asset_id,
            qrUrl
          }
        : null
    });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to load smartlink.", 404);
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;
  const { releaseId } = await params;

  const body = (await request.json().catch(() => null)) as
    | {
        slug?: string;
        links?: Record<string, string>;
        presave?: Record<string, unknown>;
      }
    | null;

  try {
    const release = await getRelease(auth.service, releaseId);
    const artistId = String(release.artist_id);

    if (!hasArtistAccess(auth.ctx, artistId)) {
      return errorJson("Forbidden", 403);
    }

    const baseSlug = slugify(body?.slug || release.title || `release-${releaseId.slice(0, 8)}`);
    const slug = await ensureUniqueSlug(auth.service, baseSlug, releaseId);
    const linkUrl = smartlinkUrl(slug);

    const qrDataUrl = await QRCode.toDataURL(linkUrl, {
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#C6A85B", light: "#000000" }
    });

    const qrBuffer = dataUrlToBuffer(qrDataUrl);
    const qrPath = `${artistId}/releases/${releaseId}/qr-${slug}.png`;

    const { error: uploadError } = await auth.service.storage.from("artist-hub-assets").upload(qrPath, qrBuffer, {
      contentType: "image/png",
      upsert: true
    });
    if (uploadError) {
      return errorJson(uploadError.message, 400);
    }

    const qrStorageUrl = toStorageUrl("artist-hub-assets", qrPath);

    const { data: qrAsset, error: qrAssetError } = await auth.service
      .from("media_assets")
      .insert({
        artist_id: artistId,
        release_id: releaseId,
        type: "qr",
        source: "generated",
        source_id: slug,
        url: qrStorageUrl,
        metadata: { smartlinkSlug: slug }
      })
      .select("id,url")
      .single();

    if (qrAssetError || !qrAsset) {
      return errorJson(qrAssetError?.message ?? "Failed to save QR asset.", 400);
    }

    const { data: smartlink, error: smartlinkError } = await auth.service
      .from("smartlinks")
      .upsert(
        {
          release_id: releaseId,
          slug,
          links: body?.links ?? {},
          presave: body?.presave ?? {},
          qr_asset_id: qrAsset.id
        },
        { onConflict: "release_id" }
      )
      .select("*")
      .single();

    if (smartlinkError || !smartlink) {
      return errorJson(smartlinkError?.message ?? "Failed to save smartlink.", 400);
    }

    await auth.service.from("releases").update({ smartlink_slug: slug }).eq("id", releaseId);

    await insertAuditLog({
      actorUserId: auth.ctx.user.id,
      artistId,
      action: "generate_smartlink",
      entityType: "smartlink",
      entityId: String(smartlink.id),
      details: {
        releaseId,
        slug,
        url: linkUrl
      }
    }).catch(() => undefined);

    const qrUrl = await resolveMaybeSignedUrl(qrStorageUrl);

    return NextResponse.json({
      smartlink: {
        id: smartlink.id,
        slug,
        url: linkUrl,
        qrUrl,
        links: smartlink.links ?? {},
        presave: smartlink.presave ?? {}
      }
    });
  } catch (error: any) {
    return errorJson(error?.message ?? "Failed to save smartlink.", 400);
  }
}
