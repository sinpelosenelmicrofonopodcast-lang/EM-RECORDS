import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-api";
import { processSeoQueue } from "@/lib/seo-queue";

export async function POST() {
  const ctx = await requireAdminApiContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const result = await processSeoQueue({ service: ctx.service });
  if (result.error) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}

