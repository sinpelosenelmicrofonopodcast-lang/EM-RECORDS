import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { syncArtistCatalog } from "@/lib/catalog-sync";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncArtistCatalog(undefined, { triggerType: "cron" });
  return NextResponse.json({ ok: true, result });
}
