import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubUserContext } from "@/lib/artist-hub/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { slugifyText } from "@/lib/utils";

export function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiHubContext() {
  const ctx = await getHubUserContext();
  if (!ctx) {
    return { error: errorJson("Unauthorized", 401) } as const;
  }
  if (!ctx.isApproved && !ctx.isAdmin) {
    return { error: errorJson("Account pending admin approval", 403) } as const;
  }

  const supabase = await createClient();
  return { ctx, supabase, service: createServiceClient() } as const;
}

export function slugify(input: string): string {
  return slugifyText(input);
}
