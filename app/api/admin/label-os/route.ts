import { NextResponse } from "next/server";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { getLabelOsDashboardData, runLabelOpsCycle } from "@/modules/label-os/service";

export async function GET() {
  const auth = await requireGrowthApiContext("admin");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const data = await getLabelOsDashboardData(auth.service);
  return NextResponse.json({ ok: true, data });
}

export async function POST() {
  const auth = await requireGrowthApiContext("owner");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runLabelOpsCycle(auth.service);
  return NextResponse.json({ ok: true, result });
}
