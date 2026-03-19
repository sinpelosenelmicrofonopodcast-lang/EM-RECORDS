import { NextResponse } from "next/server";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { getLabelOsAuditChecks } from "@/modules/label-os/service";

export async function GET() {
  const auth = await requireGrowthApiContext("admin");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const checks = await getLabelOsAuditChecks(auth.service);
  return NextResponse.json({ ok: true, checks });
}
