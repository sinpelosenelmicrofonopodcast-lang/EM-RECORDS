import { getBeatVaultAccess, getPrivateBeatPath, BEAT_BUCKET } from "@/lib/beat-vault";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ beatId: string }> };
const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request, { params }: RouteContext) {
  const access = await getBeatVaultAccess();
  if (!access) return new Response("Acceso no autorizado.", { status: 401, headers: privateHeaders });

  const { beatId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(beatId)) return new Response("No encontrado.", { status: 404 });
  const service = createServiceClient();
  const { data: beat, error } = await service.from("beats")
    .select("id,audio_url,status")
    .eq("id", beatId)
    .eq("status", "published")
    .maybeSingle();
  if (error || !beat) return new Response("No encontrado.", { status: 404 });

  const path = getPrivateBeatPath(beat.audio_url);
  if (!path) return new Response("Audio privado no disponible.", { status: 404 });
  const { data: signed, error: signingError } = await service.storage.from(BEAT_BUCKET).createSignedUrl(path, 60);
  if (signingError || !signed?.signedUrl) return new Response("Audio no disponible.", { status: 502 });

  const requestedRange = request.headers.get("range");
  const range = requestedRange && /^bytes=\d*-\d*$/.test(requestedRange) ? requestedRange : null;
  const upstream = await fetch(signed.signedUrl, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
    redirect: "error"
  }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response("No se pudo reproducir el audio.", { status: upstream?.status === 416 ? 416 : 502 });
  }

  const headers = new Headers(privateHeaders);
  headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
  headers.set("Content-Disposition", "inline");
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  for (const name of ["content-range", "content-length"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers });
}
