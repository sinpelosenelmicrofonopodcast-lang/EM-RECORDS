import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export const VAULT_COOKIE = "em_records_beat_vault";
export const VAULT_SESSION_SECONDS = 7 * 24 * 60 * 60;
export const BEAT_BUCKET = "em-records-private";

export function vaultHash(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function newVaultSecret(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function getPrivateBeatPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const prefix = "storage://" + BEAT_BUCKET + "/";
  if (!raw.startsWith(prefix)) return null;
  const path = raw.slice(prefix.length);
  if (!path.startsWith("beats/audio/") || path.length > 512) return null;
  if (path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  if (/[\r\n?#]/.test(path)) return null;
  return path;
}

export async function getBeatVaultAccess(): Promise<{ keyId: string; label: string } | null> {
  const token = (await cookies()).get(VAULT_COOKIE)?.value ?? "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;

  const service = createServiceClient();
  const { data: session, error: sessionError } = await service
    .from("beat_vault_sessions")
    .select("key_id,expires_at")
    .eq("token_hash", vaultHash(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError || !session) return null;

  const { data: key, error: keyError } = await service
    .from("beat_vault_keys")
    .select("id,label,is_active,expires_at")
    .eq("id", session.key_id)
    .maybeSingle();

  if (keyError || !key || !key.is_active) return null;
  if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) return null;
  return { keyId: String(key.id), label: String(key.label) };
}
