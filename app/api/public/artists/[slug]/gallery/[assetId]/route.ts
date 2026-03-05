import { createServiceClient } from "@/lib/supabase/service";
import { refreshLightroomConnection } from "@/lib/artist-hub/lightroom";
import { normalizeExternalAssetUrl, parseStorageUrl } from "@/lib/artist-hub/service";

type Params = {
  params: Promise<{
    slug: string;
    assetId: string;
  }>;
};

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

async function fetchImageWithFallback(url: string, accessToken?: string): Promise<Response | null> {
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
  if (isImageContentType(contentType)) return response;
  if (!isHtmlContentType(contentType)) return null;

  const html = await response.text();
  const ogImage = extractOgImage(html);
  if (!ogImage) return null;

  const imageResponse = await fetch(ogImage, { headers, cache: "no-store", redirect: "follow" }).catch(() => null);
  if (!imageResponse || !imageResponse.ok) return null;
  return isImageContentType(imageResponse.headers.get("content-type")) ? imageResponse : null;
}

function json(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" }
  });
}

export async function GET(_: Request, { params }: Params) {
  const { slug, assetId } = await params;
  const service = createServiceClient();

  const { data: artist, error: artistError } = await service.from("artists").select("id,slug").eq("slug", slug).maybeSingle();
  if (artistError || !artist?.id) {
    return json("Artist not found", 404);
  }

  const { data: asset, error: assetError } = await service
    .from("media_assets")
    .select("id,artist_id,source,url,thumb_url,type")
    .eq("id", assetId)
    .eq("artist_id", artist.id)
    .in("type", ["photo", "cover"])
    .maybeSingle();

  if (assetError || !asset) {
    return json("Asset not found", 404);
  }

  const candidates = [asset.thumb_url, asset.url]
    .map((item) => normalizeExternalAssetUrl(item))
    .filter(Boolean) as string[];

  let lightroomToken: string | null = null;
  for (const candidate of candidates) {
    const parsed = parseStorageUrl(candidate);
    if (parsed) {
      const { data: signed } = await service.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 30);
      if (!signed?.signedUrl) continue;
      const stored = await fetch(signed.signedUrl, { cache: "no-store" }).catch(() => null);
      if (!stored || !stored.ok) continue;
      const bytes = await stored.arrayBuffer();
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": stored.headers.get("content-type") || "image/jpeg",
          "Cache-Control": "public, max-age=120"
        }
      });
    }

    const needsAdobeAuth = isAdobeUrl(candidate);
    if (needsAdobeAuth && !lightroomToken) {
      lightroomToken = await refreshLightroomConnection(String(artist.id)).catch(() => null);
    }

    const proxied = await fetchImageWithFallback(candidate, needsAdobeAuth ? lightroomToken ?? undefined : undefined);
    if (!proxied) continue;

    const bytes = await proxied.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": proxied.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=120"
      }
    });
  }

  return json("Preview unavailable", 404);
}
