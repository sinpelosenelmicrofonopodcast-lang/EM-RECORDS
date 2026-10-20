import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { vaultHash, VAULT_COOKIE } from "@/lib/beat-vault";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(VAULT_COOKIE)?.value;
  if (token && /^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    await createServiceClient().from("beat_vault_sessions").delete().eq("token_hash", vaultHash(token));
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({ name: VAULT_COOKIE, value: "", maxAge: 0, httpOnly: true, path: "/", sameSite: "lax" });
  return response;
}
