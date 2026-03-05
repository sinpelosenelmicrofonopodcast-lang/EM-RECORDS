import { createServiceClient } from "@/lib/supabase/service";
import { errorJson, requireApiHubContext } from "@/lib/artist-hub/http";
import { refreshLightroomConnection } from "@/lib/artist-hub/lightroom";
import { hasArtistAccess, normalizeExternalAssetUrl, parseStorageUrl } from "@/lib/artist-hub/service";

type Params = { params: Promise<{ assetId: string }> };

function isImageContentType(value: string | null): boolean {
  return Boolean(value && value.toLowerCase().startsWith("image/"));
}

function isHtmlContentType(value: string | null): boolean {
  return Boolean(value && value.toLowerCase().includes("text/html"));
}

function isAdobeUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.includes("adobe") || host.includes("lightroom");
  } catch {
    return false;
  }
}

function extractOgImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return null;
}

async function fetchBinaryWithFallback(url: string, accessToken?: string): Promise<Response | null> {
  const headers: HeadersInit = {
    "User-Agent": "EMRecordsBot/1.0 (+https://emrecordsmusic.com)"
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
    if (process.env.LIGHTROOM_CLIENT_ID) {
      headers["x-api-key"] = process.env.LIGHTROOM_CLIENT_ID;
    }
  }

  const response = await fetch(url, { headers, cache: "no-store", redirect: "follow" }).catch(() => null);
  if (!response || !response.ok) return null;

  const contentType = response.headers.get("content-type");
  if (isImageContentType(contentType)) {
    return response;
  }

  if (!isHtmlContentType(contentType)) {
    return null;
  }

  const html = await response.text();
  const ogImage = extractOgImage(html);
  if (!ogImage) return null;

  const nextResponse = await fetch(ogImage, { headers, cache: "no-store", redirect: "follow" }).catch(() => null);
  if (!nextResponse || !nextResponse.ok) return null;
  return isImageContentType(nextResponse.headers.get("content-type")) ? nextResponse : null;
}

export async function GET(request: Request, { params }: Params) {
  const auth = await requireApiHubContext();
  if ("error" in auth) return auth.error;

  const { assetId } = await params;
  const requestUrl = new URL(request.url);
  const artistId = String(requestUrl.searchParams.get("artistId") ?? "").trim();
  const size = String(requestUrl.searchParams.get("size") ?? "thumb").trim().toLowerCase();

  if (!artistId) {
    return errorJson("artistId is required.");
  }

  if (!hasArtistAccess(auth.ctx, artistId)) {
    return errorJson("Forbidden", 403);
  }

  const service = createServiceClient();
  const { data: asset, error: assetError } = await service
    .from("media_assets")
    .select("id,artist_id,source,url,thumb_url,metadata")
    .eq("id", assetId)
    .eq("artist_id", artistId)
    .maybeSingle();

  if (assetError || !asset) {
    return errorJson("Asset not found.", 404);
  }

  const candidates = [
    size === "thumb" ? asset.thumb_url : null,
    asset.url,
    asset.thumb_url
  ]
    .map((item) => normalizeExternalAssetUrl(item))
    .filter(Boolean) as string[];

  let lightroomToken: string | null = null;
  for (const candidate of candidates) {
    const parsed = parseStorageUrl(candidate);
    if (parsed) {
      const { data: signed, error: signError } = await service.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 30);
      if (signError || !signed?.signedUrl) continue;
      const signedResponse = await fetch(signed.signedUrl, { cache: "no-store" }).catch(() => null);
      if (!signedResponse || !signedResponse.ok) continue;
      const bytes = await signedResponse.arrayBuffer();
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": signedResponse.headers.get("content-type") || "application/octet-stream",
          "Cache-Control": "private, max-age=300"
        }
      });
    }

    const needsAdobeAuth = isAdobeUrl(candidate);
    if (needsAdobeAuth && !lightroomToken) {
      lightroomToken = await refreshLightroomConnection(artistId).catch(() => null);
    }

    const proxied = await fetchBinaryWithFallback(candidate, needsAdobeAuth ? lightroomToken ?? undefined : undefined);
    if (!proxied) continue;

    const bytes = await proxied.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": proxied.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=300"
      }
    });
  }

  return errorJson("Preview unavailable for this asset.", 404);
}
