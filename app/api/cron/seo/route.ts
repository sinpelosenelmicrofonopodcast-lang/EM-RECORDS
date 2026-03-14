import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { submitGscSitemap } from "@/lib/gsc";
import { processSeoQueue } from "@/lib/seo-queue";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queueResult = await processSeoQueue({ limit: 120 });
  let sitemapResult: { configured: boolean; ok: boolean; error?: string } | null = null;

  const utcDay = new Date().getUTCDay();
  const shouldSubmitSitemap = queueResult.submitted > 0 || utcDay === 1;
  if (shouldSubmitSitemap) {
    sitemapResult = await submitGscSitemap();
  }

  return NextResponse.json({
    ok: true,
    queue: queueResult,
    sitemap: sitemapResult
  });
}

