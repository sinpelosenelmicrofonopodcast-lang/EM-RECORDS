import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseStorageUrl } from "@/lib/artist-hub/service";
import { getSiteOrigin } from "@/lib/utils";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

function extractIp(request: Request): string | null {
  const fromForward = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const fromReal = request.headers.get("x-real-ip")?.trim();
  return fromForward || fromReal || null;
}

async function resolveDownloadUrl(service: ReturnType<typeof createServiceClient>, raw: string): Promise<string | null> {
  const parsed = parseStorageUrl(raw);
  if (!parsed) return raw;

  const { data, error } = await service.storage.from(parsed.bucket).createSignedUrl(parsed.path, 60 * 15);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const service = createServiceClient();
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") === "media" ? "media_kit" : "press_kit";

  const { data: artist, error } = await service
    .from("artists")
    .select("id,slug,name,press_kit_url,media_kit_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !artist?.id) {
    return NextResponse.redirect(new URL(`/artists/${slug}`, getSiteOrigin()));
  }

  const sourceUrl = kind === "media_kit" ? artist.media_kit_url : artist.press_kit_url;
  if (!sourceUrl) {
    return NextResponse.redirect(new URL(`/artists/${slug}`, getSiteOrigin()));
  }

  const downloadUrl = await resolveDownloadUrl(service, String(sourceUrl));
  if (!downloadUrl) {
    return NextResponse.redirect(new URL(`/artists/${slug}`, getSiteOrigin()));
  }

  const ip = extractIp(request);
  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");

  await Promise.all([
    service.from("press_kit_downloads").insert({
      artist_id: artist.id,
      kind,
      file_url: String(sourceUrl),
      ip,
      user_agent: userAgent,
      referrer
    }),
    service.from("site_events").insert({
      event_name: kind === "press_kit" ? "press_kit_downloaded" : "media_kit_downloaded",
      path: `/artists/${slug}`,
      locale: null,
      referrer,
      user_agent: userAgent,
      ip,
      metadata: {
        artistSlug: slug,
        artistName: artist.name,
        kind
      }
    })
  ]).catch(() => undefined);

  const target = /^https?:\/\//i.test(downloadUrl) ? downloadUrl : new URL(downloadUrl, getSiteOrigin()).toString();
  return NextResponse.redirect(target);
}
