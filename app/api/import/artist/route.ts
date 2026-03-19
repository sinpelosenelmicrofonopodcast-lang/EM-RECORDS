import { NextResponse } from "next/server";
import { importArtistCatalog } from "@/lib/importers/spotify";

export async function POST(req: Request) {

  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "Missing artist URL" }, { status: 400 });
  }

  try {

    const releases = await importArtistCatalog(url);

    return NextResponse.json({
      success: true,
      imported: Array.isArray(releases) ? releases.length : 0
    });

  } catch (err:any) {

    return NextResponse.json({
      error: err.message
    }, { status: 500 });

  }

}
