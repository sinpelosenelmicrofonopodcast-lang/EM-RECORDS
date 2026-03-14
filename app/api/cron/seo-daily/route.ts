import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { runSeoAudit } from "@/lib/seo-queue";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const audit = await runSeoAudit();
  return NextResponse.json({
    ok: true,
    issues: audit.issues,
    queue: audit.queue,
    candidateCount: audit.candidates.length
  });
}

