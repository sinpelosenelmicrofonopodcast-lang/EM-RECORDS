import { createServiceClient } from "@/lib/supabase/service";
import { analyzePerformance } from "@/modules/ai-optimizer/service";
import { getAutomationSettings, upsertAutomationSettings } from "@/modules/social-engine/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

export async function learnFromData(service?: ServiceClient) {
  const supabase = getService(service);
  const analysis = await analyzePerformance(supabase);

  const summaryPatterns = [
    {
      pattern: analysis.bestHooks[0] ? `Winning hook tendency: ${analysis.bestHooks[0].hook}` : "No hook pattern detected yet.",
      confidence_score: Number((analysis.bestHooks[0]?.score ?? 0).toFixed(4)),
      pattern_type: "summary",
      metadata: {
        topHook: analysis.bestHooks[0]?.hook ?? null
      }
    },
    {
      pattern: analysis.bestFormats[0] ? `Winning format tendency: ${analysis.bestFormats[0].format}` : "No format pattern detected yet.",
      confidence_score: Number((analysis.bestFormats[0]?.score ?? 0).toFixed(4)),
      pattern_type: "summary",
      metadata: {
        topFormat: analysis.bestFormats[0]?.format ?? null
      }
    }
  ];

  await supabase.from("learning_memory").insert(summaryPatterns);

  return {
    createdPatterns: summaryPatterns.length,
    analysis
  };
}

export async function applyLearning(service?: ServiceClient) {
  const supabase = getService(service);
  const settings = await getAutomationSettings(supabase);
  const { data } = await supabase
    .from("learning_memory")
    .select("*")
    .order("confidence_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  const bestTimes = (data ?? [])
    .filter((row: any) => String(row.pattern_type) === "time")
    .map((row: any) => Number((row.metadata as any)?.hour))
    .filter((hour) => Number.isFinite(hour))
    .slice(0, 4);

  const topFormats = (data ?? [])
    .filter((row: any) => String(row.pattern_type) === "format")
    .map((row: any) => String((row.metadata as any)?.format ?? ""))
    .filter(Boolean)
    .slice(0, 3);

  const nextMix = { ...settings.contentMix };
  for (const format of topFormats) {
    nextMix[format] = Number(((nextMix[format] ?? 0.1) + 0.08).toFixed(2));
  }

  const nextSettings = await upsertAutomationSettings(
    {
      bestPostingWindows: bestTimes.length > 0 ? bestTimes : settings.bestPostingWindows,
      contentMix: nextMix,
      learningAppliedAt: new Date().toISOString()
    },
    supabase
  );

  return {
    settings: nextSettings,
    bestTimes: nextSettings.bestPostingWindows,
    topFormats
  };
}
