import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { newVaultSecret, vaultHash } from "@/lib/beat-vault";

export const runtime = "nodejs";
const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("No autorizado.", 401);

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.is_admin) return jsonError("Acceso de administrador requerido.", 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Solicitud inválida.", 400);
  } catch {
    return jsonError("Solicitud inválida.", 400);
  }

  if (body.action === "create") {
    const label = typeof body.label === "string" ? body.label.trim() : "";
    const days = Number(body.days ?? 30);
    if (!label || label.length > 80 || ![0, 7, 30, 90].includes(days)) {
      return jsonError("Etiqueta o vencimiento inválido.", 400);
    }
    const code = "EM-" + newVaultSecret(18);
    const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { data: record, error } = await service
      .from("beat_vault_keys")
      .insert({ label, code_hash: vaultHash(code), expires_at: expiresAt })
      .select("id,label,is_active,created_at,expires_at")
      .single();
    if (error || !record) return jsonError("No se pudo crear la clave.", 500);
    return NextResponse.json({ key: record, code }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "revoke") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Clave inválida.", 400);
    const { error } = await service.from("beat_vault_keys").update({ is_active: false }).eq("id", id);
    if (error) return jsonError("No se pudo revocar la clave.", 500);
    await service.from("beat_vault_sessions").delete().eq("key_id", id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }
  return jsonError("Acción desconocida.", 400);
}
