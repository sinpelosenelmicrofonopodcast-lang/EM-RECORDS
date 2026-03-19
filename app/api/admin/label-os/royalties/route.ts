import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { recordRoyaltyStatement } from "@/modules/label-os/service";

const schema = z.object({
  artistId: z.string().uuid().optional().nullable(),
  releaseId: z.string().uuid().optional().nullable(),
  songId: z.string().uuid().optional().nullable(),
  contributorId: z.string().uuid().optional().nullable(),
  source: z.string().trim().min(1),
  statementPeriod: z.string().trim().min(1),
  grossAmount: z.number(),
  netAmount: z.number(),
  sharePct: z.number(),
  payoutAmount: z.number(),
  currency: z.string().trim().optional(),
  status: z.enum(["pending", "approved", "paid", "disputed"]).optional(),
  notes: z.string().trim().optional().nullable()
});

export async function POST(request: Request) {
  const auth = await requireGrowthApiContext("owner");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = schema.parse(await request.json());
    const royalty = await recordRoyaltyStatement(payload, auth.service);
    return NextResponse.json({ ok: true, royalty });
  } catch (error) {
    return NextResponse.json({ error: String((error as Error).message ?? "Failed to record royalty statement.") }, { status: 400 });
  }
}
