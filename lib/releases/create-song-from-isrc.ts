import { supabase } from "../supabase";
import { lookupIsrc } from "./isrc-lookup";

export async function createSongFromIsrc(isrc: string) {

  const { data: existing } = await supabase
    .from("songs")
    .select("*")
    .eq("isrc", isrc)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const metadata = await lookupIsrc(isrc);

  if (!metadata) {
    throw new Error("Metadata not found");
  }

  const { data, error } = await supabase
    .from("songs")
    .insert({
      title: metadata.title ?? "Untitled Song",
      isrc: metadata.isrc,
      language: "SPANISH",
      links: {
        spotify: metadata.spotifyEmbed,
        apple: metadata.appleEmbed,
        youtube: metadata.youtubeEmbed,
        tiktok: null
      }
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}