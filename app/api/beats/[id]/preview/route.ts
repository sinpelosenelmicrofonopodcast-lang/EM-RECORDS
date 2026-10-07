import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function parseStorageUrl(value: string): { bucket: string; path: string } | null {
  if (!value.startsWith("storage://")) return null;
  const body = value.slice("storage://".length);
  const slash = body.indexOf("/");
  if (slash <= 0 || slash >= body.length - 1) return null;
  return { bucket: body.slice(0, slash), path: body.slice(slash + 1) };
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceClient();
  const { data: beat, error } = await service
    .from("beats")
    .select("status,preview_url,audio_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !beat || beat.status !== "published") {
    return new Response("Not found", { status: 404 });
  }

  const source = String(beat.preview_url || beat.audio_url || "").trim();
  if (!source) return new Response("Preview unavailable", { status: 404 });

  const storage = parseStorageUrl(source);
  if (storage) {
    const { data, error: signError } = await service.storage
      .from(storage.bucket)
      .createSignedUrl(storage.path, 120);

    if (signError || !data?.signedUrl) {
      return new Response("Preview unavailable", { status: 404 });
    }

    const response = NextResponse.redirect(data.signedUrl, 307);
    response.headers.set("cache-control", "private, no-store, max-age=0");
    response.headers.set("x-robots-tag", "noindex, nofollow");
    return response;
  }

  const direct = safeHttpUrl(source);
  if (!direct) return new Response("Preview unavailable", { status: 404 });

  const response = NextResponse.redirect(direct, 307);
  response.headers.set("cache-control", "private, no-store, max-age=0");
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}
