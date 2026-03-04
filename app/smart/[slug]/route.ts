import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { absoluteUrl } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

function normalizeUrl(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function GET(_: Request, { params }: Params) {
  const { slug } = await params;
  const service = createServiceClient();

  const { data } = await service.from("smartlinks").select("links,release_id").eq("slug", slug).maybeSingle();
  if (!data) {
    return NextResponse.redirect(absoluteUrl("/releases"));
  }

  const links = (data.links ?? {}) as Record<string, unknown>;
  const priority = [links.spotify, links.apple, links.youtube, links.tiktok, links.soundcloud, links.url].map(normalizeUrl).filter(Boolean) as string[];

  if (priority.length > 0) {
    return NextResponse.redirect(priority[0]);
  }

  return NextResponse.redirect(absoluteUrl("/releases"));
}
