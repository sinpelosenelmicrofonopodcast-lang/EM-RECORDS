import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { runGrowthAutomation } from "@/modules/growth-engine/service";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runGrowthAutomation({
    triggerType: "daily_cron",
    autoApprove: true,
    publishDue: true
  });

  return NextResponse.json({
    ok: true,
    result
  });
}
