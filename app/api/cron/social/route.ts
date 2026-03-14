import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { processSocialPublishingQueue } from "@/lib/social-publishing";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queue = await processSocialPublishingQueue({ limit: 20 });
  return NextResponse.json({
    ok: true,
    queue
  });
}
