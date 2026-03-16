import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {

  try {

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "Spotify URL required" }, { status: 400 });
    }

    const oembed = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent(url));

    if (!oembed.ok) {
      return NextResponse.json({ error: "Invalid Spotify URL" }, { status: 400 });
    }

    const data: any = await oembed.json();

    const title = data.title ?? "Unknown Title";

    const supabase = createServiceClient();

    const { data: song, error } = await supabase
      .from("songs")
      .insert({
        title,
        language: "SPANISH",
        links: {
          spotify: url
        }
      })
      .select()
      .single();

    if (error) throw error;

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
