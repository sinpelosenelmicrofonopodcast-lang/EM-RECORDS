import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubUserContext } from "@/lib/artist-hub/auth";
import { createServiceClient } from "@/lib/supabase/service";

export function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiHubContext() {
  const ctx = await getHubUserContext();
  if (!ctx) {
    return { error: errorJson("Unauthorized", 401) } as const;
  }

  const supabase = await createClient();
  return { ctx, supabase, service: createServiceClient() } as const;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}
