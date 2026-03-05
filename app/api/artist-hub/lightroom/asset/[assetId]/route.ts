import { errorJson, requireApiHubContext } from "@/lib/artist-hub/http";
import { refreshLightroomConnection } from "@/lib/artist-hub/lightroom";
import { hasArtistAccess } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ assetId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { assetId } = await params;
  const url = new URL(request.url);
  const artistId = String(url.searchParams.get("artistId") ?? "").trim();
  const size = String(url.searchParams.get("size") ?? "thumb").trim().toLowerCase();

  if (!artistId) {
    return errorJson("artistId is required.");
  }

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  const { data: asset, error: assetError } = await auth.service
    .from("media_assets")
    .select("id,artist_id,source,url,thumb_url")
    .eq("id", assetId)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (assetError || !asset) {
    return errorJson("Asset not found.", 404);
  }

  if (String(asset.source) !== "lightroom") {
    return errorJson("Asset is not a Lightroom source.", 400);
  }

  const targetUrl = size === "full" ? String(asset.url ?? "") : String(asset.thumb_url ?? asset.url ?? "");
  if (!targetUrl) {
    return errorJson("Lightroom asset URL is missing.", 404);
  }

  let accessToken = "";
  try {
    accessToken = await refreshLightroomConnection(artistId);
  } catch (error: any) {
    return errorJson(error?.message ?? "Could not refresh Lightroom access token.", 400);
  }

  const apiKey = process.env.LIGHTROOM_CLIENT_ID;

  const upstream = await fetch(targetUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(apiKey ? { "x-api-key": apiKey } : {})
    },
    cache: "no-store"
  });

  if (!upstream.ok) {
    return errorJson(`Lightroom asset fetch failed (${upstream.status}).`, 502);
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  const bytes = await upstream.arrayBuffer();

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=120"
    }
  });
}
