import { NextResponse } from "next/server";
import { hasGrowthAccess, requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { getContentQueue, reorderContentQueue, updateContentQueueItem } from "@/modules/social-engine/service";

export async function GET() {
  const auth = await requireGrowthApiContext("admin");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const queue = await getContentQueue(auth.service, 100);
  return NextResponse.json({ ok: true, queue });
}

export async function PATCH(request: Request) {
  const auth = await requireGrowthApiContext("admin");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: "reorder" | "update";
        ids?: string[];
        id?: string;
        patch?: Record<string, unknown>;
      }
    | null;

  if (body?.action === "reorder" && Array.isArray(body.ids)) {
    if (!auth.access.canEditContent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await reorderContentQueue(body.ids, auth.service);
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "update" && body.id && body.patch && auth.access.canEditContent) {
    if ("approvalState" in body.patch && !hasGrowthAccess(auth.access, "owner")) {
      return NextResponse.json({ error: "Only owners/developers can approve content." }, { status: 403 });
    }

    const item = await updateContentQueueItem(
      String(body.id),
      {
        title: typeof body.patch.title === "string" ? body.patch.title : undefined,
        caption: typeof body.patch.caption === "string" ? body.patch.caption : undefined,
        scheduledAt: typeof body.patch.scheduledAt === "string" ? body.patch.scheduledAt : undefined,
        status: typeof body.patch.status === "string" ? (body.patch.status as any) : undefined,
        approvalState: typeof body.patch.approvalState === "string" ? (body.patch.approvalState as any) : undefined,
        queuePosition: typeof body.patch.queuePosition === "number" ? body.patch.queuePosition : undefined
      },
      auth.service
    );

    return NextResponse.json({ ok: true, item });
  }

  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
