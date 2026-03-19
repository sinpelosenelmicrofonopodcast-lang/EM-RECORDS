import { NextResponse } from "next/server";
import { requireGrowthApiContext } from "@/modules/growth-engine/auth";
import { syncArtistContent } from "@/modules/artist-ingestion/service";

type RouteContext = {
  params: Promise<{ artistId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireGrowthApiContext("owner");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { artistId } = await context.params;
  const result = await syncArtistContent(artistId, auth.service);
  return NextResponse.json({ ok: true, result });
}
