import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-api";
import { fetchGscPerformance } from "@/lib/gsc";

function parseRangeDays(raw: string | null): number {
  const value = Number(raw ?? "28");
  if (!Number.isFinite(value)) return 28;
  return Math.min(Math.max(Math.round(value), 1), 365);
}

export async function GET(request: Request) {
  const ctx = await requireAdminApiContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const url = new URL(request.url);
  const rangeDays = parseRangeDays(url.searchParams.get("range"));
  const payload = await fetchGscPerformance(rangeDays);

  return NextResponse.json(payload);
}

