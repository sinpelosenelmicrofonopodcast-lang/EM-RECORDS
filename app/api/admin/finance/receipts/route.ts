import { NextResponse } from "next/server";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";

export const dynamic = "force-dynamic";
const ALLOWED: Record<string, { ext: string; valid: (bytes: Uint8Array) => boolean }> = {
  "application/pdf": { ext: "pdf", valid: (b) => b[0] === 37 && b[1] === 80 && b[2] === 68 && b[3] === 70 },
  "image/jpeg": { ext: "jpg", valid: (b) => b[0] === 255 && b[1] === 216 && b[2] === 255 },
  "image/png": { ext: "png", valid: (b) => b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 },
  "image/webp": { ext: "webp", valid: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" }
};

export async function POST(request: Request) {
  const auth = await requireGrowthApiContext("admin");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona un comprobante." }, { status: 400 });
    if (file.size < 4 || file.size > 8 * 1024 * 1024 || !ALLOWED[file.type])
      return NextResponse.json({ error: "Solo PDF, JPG, PNG o WEBP de hasta 8 MB." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!ALLOWED[file.type].valid(bytes))
      return NextResponse.json({ error: "El tipo del archivo no coincide con su contenido." }, { status: 400 });
    const path = `receipts/${crypto.randomUUID()}.${ALLOWED[file.type].ext}`;
    const { error } = await auth.service.storage.from("em-finance-receipts")
      .upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "private, max-age=0" });
    if (error) throw error;
    return NextResponse.json({ ok: true, path });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error subiendo comprobante." }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const auth = await requireGrowthApiContext("admin");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!/^receipts\/[a-f0-9-]{36}\.(pdf|png|jpg|webp)$/.test(path))
    return NextResponse.json({ error: "Ruta de comprobante inválida." }, { status: 400 });
  const { data, error } = await auth.service.storage.from("em-finance-receipts").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "No se pudo abrir el comprobante." }, { status: 404 });
  return NextResponse.json({ url: data.signedUrl });
}
