import { NextResponse } from "next/server";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { getSocialEngineDashboardData, publishSmart } from "@/modules/social-engine/service";

export async function GET() {
  const auth = await requireGrowthApiContext("admin");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const data = await getSocialEngineDashboardData(auth.service);
  return NextResponse.json({ ok: true, data });
}

export async function POST() {
  const auth = await requireGrowthApiContext("owner");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await publishSmart({ limit: 10 }, auth.service);
  return NextResponse.json({ ok: true, result });
}
