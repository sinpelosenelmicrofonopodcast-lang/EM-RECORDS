import { NextResponse } from "next/server";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { runGrowthAutomation } from "@/modules/growth-engine/service";

export async function POST() {
  const auth = await requireGrowthApiContext("owner");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runGrowthAutomation(
    {
      triggerType: "api_manual_run",
      autoApprove: true,
      publishDue: true
    },
    auth.service
  );

  return NextResponse.json({ ok: true, result });
}
