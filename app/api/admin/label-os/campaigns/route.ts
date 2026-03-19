import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { upsertCampaign } from "@/modules/label-os/service";

const schema = z.object({
  id: z.string().uuid().optional().nullable(),
  artistId: z.string().uuid().optional().nullable(),
  releaseId: z.string().uuid().optional().nullable(),
  songId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  status: z.enum(["draft", "scheduled", "active", "boosting", "paused", "completed"]).optional(),
  strategy: z.string().trim().optional().nullable(),
  budgetCents: z.number().int().min(0).optional(),
  startAt: z.string().trim().optional().nullable(),
  endAt: z.string().trim().optional().nullable(),
  automationEnabled: z.boolean().optional()
});

export async function POST(request: Request) {
  const auth = await requireGrowthApiContext("owner");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const payload = schema.parse(await request.json());
    const campaign = await upsertCampaign(payload, auth.service);
    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    return NextResponse.json({ error: String((error as Error).message ?? "Failed to save campaign.") }, { status: 400 });
  }
}
