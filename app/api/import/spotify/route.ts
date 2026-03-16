import { NextResponse } from "next/server";
import { importSpotifyRelease } from "@/lib/importers/spotify";

export async function POST(req: Request) {

  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  try {

    const release = await importSpotifyRelease(url);

    return NextResponse.json({
      success: true,
      release
    });

  } catch (err:any) {

    return NextResponse.json({
      error: err.message
    }, { status: 500 });

  }

}
