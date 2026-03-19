import { createServiceClient } from "@/lib/supabase/service";
import type { AutomationSettingsRecord, ViralContentRecord } from "@/modules/growth-engine/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

export async function fetchViralContent(service?: ServiceClient): Promise<ViralContentRecord[]> {
  const supabase = getService(service);
  const { data: existing } = await supabase
    .from("viral_content_pool")
    .select("*")
    .order("performance_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  if ((existing ?? []).length >= 6) {
    return (existing ?? []).map((row: any) => ({
      id: String(row.id),
      source: String(row.source),
      contentUrl: String(row.content_url),
      caption: row.caption ? String(row.caption) : null,
      performanceScore: Number(row.performance_score ?? 0),
      reusable: Boolean(row.reusable ?? true),
      repurposedCaption: row.repurposed_caption ? String(row.repurposed_caption) : null,
      metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {},
      createdAt: row.created_at ? String(row.created_at) : null
    }));
  }

  const seeds = [
    {
      source: "trend_watch",
      content_url: "https://example.com/trends/hook-heavy-performance-snippet",
      caption: "Short hook + face-cam reaction + loud CTA.",
      performance_score: 0.84,
      reusable: true,
      metadata: { format: "reaction", theme: "high-energy" }
    },
    {
      source: "trend_watch",
      content_url: "https://example.com/trends/street-performance-cut",
      caption: "Performance cut with text overlays that hit in the first second.",
      performance_score: 0.79,
      reusable: true,
      metadata: { format: "performance", theme: "street" }
    },
    {
      source: "trend_watch",
      content_url: "https://example.com/trends/preview-loop",
      caption: "Loop the strongest 8 seconds and end with artist CTA.",
      performance_score: 0.76,
      reusable: true,
      metadata: { format: "loop", theme: "preview" }
    }
  ];

  const { data, error } = await supabase.from("viral_content_pool").insert(seeds).select("*");
  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: String(row.id),
    source: String(row.source),
    contentUrl: String(row.content_url),
    caption: row.caption ? String(row.caption) : null,
    performanceScore: Number(row.performance_score ?? 0),
    reusable: Boolean(row.reusable ?? true),
    repurposedCaption: row.repurposed_caption ? String(row.repurposed_caption) : null,
    metadata: typeof row.metadata === "object" && row.metadata ? (row.metadata as Record<string, unknown>) : {},
    createdAt: row.created_at ? String(row.created_at) : null
  }));
}

export function repurposeContent(
  input: { caption?: string | null; source?: string | null; artistName?: string | null },
  settings?: Pick<AutomationSettingsRecord, "tone" | "language">
) {
  const artistName = input.artistName || "EM Records";
  const tone = settings?.tone || "urban latino";
  const base = input.caption?.trim() || "Contenido viral detectado con potencial de alto replay.";
  return `${base}\n\nLo aterrizamos en tono ${tone} para ${artistName}. Dale share, etiqueta a tu combo y entra al perfil para escuchar lo nuevo.`;
}
