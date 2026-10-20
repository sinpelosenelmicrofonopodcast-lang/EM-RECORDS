import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { newVaultSecret, vaultHash, VAULT_COOKIE, VAULT_SESSION_SECONDS } from "@/lib/beat-vault";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const responseError = (message: string, status: number) =>
    NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return responseError("Solicitud inválida.", 400);
  }
  const code = typeof body === "object" && body && "code" in body && typeof body.code === "string"
    ? body.code.trim() : "";
  if (!code || code.length > 120) return responseError("Ingresa una clave válida.", 400);

  const sourceIp = (request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown")
    .split(",")[0].trim().slice(0, 128);
  const ipHash = createHash("sha256").update(sourceIp).digest("hex");
  const service = createServiceClient();
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { count, error: rateError } = await service
    .from("beat_vault_attempts")
    .select("id", { head: true, count: "exact" })
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);
  if (rateError) return responseError("Servicio temporalmente no disponible.", 503);
  if ((count ?? 0) >= 12) return responseError("Demasiados intentos. Intenta de nuevo en 15 minutos.", 429);

  const { data: pass, error } = await service.from("beat_vault_keys")
    .select("id,is_active,expires_at")
    .eq("code_hash", vaultHash(code))
    .maybeSingle();
  if (error) return responseError("Servicio temporalmente no disponible.", 503);

  if (!pass || !pass.is_active || (pass.expires_at && Date.parse(pass.expires_at) <= Date.now())) {
    await service.from("beat_vault_attempts").insert({ ip_hash: ipHash });
    return responseError("Clave incorrecta o caducada.", 401);
  }

  const token = newVaultSecret(32);
  const expiresAt = Math.min(
    Date.now() + VAULT_SESSION_SECONDS * 1000,
    pass.expires_at ? Date.parse(pass.expires_at) : Infinity
  );
  const { error: sessionError } = await service.from("beat_vault_sessions").insert({
    key_id: pass.id,
    token_hash: vaultHash(token),
    expires_at: new Date(expiresAt).toISOString()
  });
  if (sessionError) return responseError("No se pudo crear la sesión.", 500);

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({
    name: VAULT_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))
  });
  return response;
}
