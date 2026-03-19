import { createServiceClient } from "@/lib/supabase/service";
import type { ReelDraft } from "@/modules/growth-engine/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

export async function generateReel(artistId: string, service?: ServiceClient): Promise<ReelDraft> {
  const supabase = getService(service);
  const [artistRes, cacheRes, assetsRes] = await Promise.all([
    supabase.from("artists").select("id,name,stage_name").eq("id", artistId).maybeSingle(),
    supabase
      .from("artist_content_cache")
      .select("*")
      .eq("artist_id", artistId)
      .in("type", ["video", "short"])
      .order("last_synced", { ascending: false })
      .limit(10),
    supabase
      .from("artist_assets")
      .select("*")
      .eq("artist_id", artistId)
      .in("type", ["video", "other"])
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  const artistName = String(artistRes.data?.stage_name ?? artistRes.data?.name ?? "EM Records");
  const candidates = [
    ...(cacheRes.data ?? []).map((row: any) => ({
      source: row.type === "short" ? "youtube_short" : "youtube_video",
      mediaUrl: row.url ? String(row.url) : row.thumbnail ? String(row.thumbnail) : null,
      duration: Number((row.metadata as any)?.duration ?? 15)
    })),
    ...(assetsRes.data ?? []).map((row: any) => ({
      source: String(row.source ?? "asset"),
      mediaUrl: row.url ? String(row.url) : null,
      duration: Number((row.metadata as any)?.duration ?? 15)
    }))
  ].filter((item) => item.mediaUrl);

  const source = candidates[0] ?? { source: "fallback", mediaUrl: null, duration: 15 };
  const clipDuration = Math.min(15, Math.max(5, Math.round(source.duration > 15 ? source.duration / 2 : source.duration || 8)));
  const clipStart = 0;
  const clipEnd = clipStart + clipDuration;
  const overlays = ["SI NO LO HAS ESCUCHADO… ESTAS ATRAS 🔥", "ESTO ES LO QUE ESTA SONANDO 🔥"];
  const overlayText = overlays[Math.floor(Math.random() * overlays.length)] ?? overlays[0];
  const caption = `${artistName} en modo replay. Dale play, comparte y entra al perfil para seguir el movimiento.`;

  return {
    mediaUrl: source.mediaUrl,
    video_data: {
      source: source.source,
      clipStart,
      clipEnd,
      duration: clipDuration
    },
    overlay_text: overlayText,
    caption,
    hashtags: [`#${artistName.replace(/[^a-zA-Z0-9]/g, "")}`, "#EMRecords", "#Reels", "#MusicaNueva"]
  };
}
