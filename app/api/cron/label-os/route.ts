import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { runLabelOpsCycle } from "@/modules/label-os/service";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runLabelOpsCycle();
  return NextResponse.json({ ok: true, result });
}
