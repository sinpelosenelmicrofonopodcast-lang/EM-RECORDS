import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-api";
import { submitGscSitemap } from "@/lib/gsc";

export async function POST() {
  const ctx = await requireAdminApiContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const result = await submitGscSitemap();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.configured ? 502 : 400 });
  }

  return NextResponse.json(result);
}

