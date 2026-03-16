import { NextRequest, NextResponse } from "next/server";
import { createSongFromIsrc } from "@/lib/releases/create-song-from-isrc";

export async function POST(req: NextRequest) {

  try {

    const body = await req.json();
    const { isrc } = body;

    if (!isrc) {
      return NextResponse.json(
        { error: "ISRC required" },
        { status: 400 }
      );
    }

    const song = await createSongFromIsrc(isrc);

    return NextResponse.json({
      success: true,
      song
    });

  } catch (error: any) {

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );

  }

}
