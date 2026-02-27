import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/service";

type IncomingBody = {
  event?: unknown;
  path?: unknown;
  locale?: unknown;
  metadata?: unknown;
};

function toCleanString(input: unknown, maxLength: number): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  return value.slice(0, maxLength);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = (await request.json().catch(() => null)) as IncomingBody | null;

    const eventName = toCleanString(body?.event, 80);
    if (!eventName) {
      return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
    }

    const path = toCleanString(body?.path, 512);
    const locale = toCleanString(body?.locale, 16);
    const referrer = toCleanString(request.headers.get("referer"), 1024);
    const userAgent = toCleanString(request.headers.get("user-agent"), 512);
    const ip = toCleanString(request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip"), 64);
    const metadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : null;

    const service = createServiceClient();
    await service.from("site_events").insert({
      event_name: eventName,
      path,
      locale,
      referrer,
      user_agent: userAgent,
      ip,
      metadata
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
