import { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function analyzePerformance(service?: ServiceClient) {
  const supabase = getService(service);
  const [queueRes, analyticsRes] = await Promise.all([
    supabase.from("content_queue").select("id,content_type,hook,caption,scheduled_at"),
    supabase.from("post_analytics").select("content_id,engagement_rate,views")
  ]);

  const queue = queueRes.data ?? [];
  const analytics = analyticsRes.data ?? [];
  const analyticsByContent = new Map<string, Array<{ engagement_rate: number; views: number }>>();

  for (const row of analytics as any[]) {
    const key = String(row.content_id);
    if (!analyticsByContent.has(key)) analyticsByContent.set(key, []);
    analyticsByContent.get(key)?.push({
      engagement_rate: Number(row.engagement_rate ?? 0),
      views: Number(row.views ?? 0)
    });
  }

  const hookScores = new Map<string, number[]>();
  const timeScores = new Map<number, number[]>();
  const formatScores = new Map<string, number[]>();

  for (const item of queue as any[]) {
    const contentId = String(item.id);
    const itemAnalytics = analyticsByContent.get(contentId) ?? [];
    const engagement = average(itemAnalytics.map((metric) => metric.engagement_rate));
    if (!engagement) continue;

    const hook = String(item.hook ?? "").trim();
    if (hook) {
      if (!hookScores.has(hook)) hookScores.set(hook, []);
      hookScores.get(hook)?.push(engagement);
    }

    const hour = item.scheduled_at ? new Date(String(item.scheduled_at)).getHours() : null;
    if (typeof hour === "number" && Number.isFinite(hour)) {
      if (!timeScores.has(hour)) timeScores.set(hour, []);
      timeScores.get(hour)?.push(engagement);
    }

    const format = String(item.content_type ?? "unknown");
    if (!formatScores.has(format)) formatScores.set(format, []);
    formatScores.get(format)?.push(engagement);
  }

  const bestHooks = Array.from(hookScores.entries())
    .map(([hook, scores]) => ({ hook, score: average(scores) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const bestTimes = Array.from(timeScores.entries())
    .map(([hour, scores]) => ({ hour, score: average(scores) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const bestFormats = Array.from(formatScores.entries())
    .map(([format, scores]) => ({ format, score: average(scores) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const insights = [
    ...bestHooks.map((entry) => ({
      pattern: `Best hook: ${entry.hook}`,
      confidence_score: Number(entry.score.toFixed(4)),
      pattern_type: "hook",
      metadata: { hook: entry.hook, winnerWord: entry.hook.split(/\s+/)[0] ?? entry.hook }
    })),
    ...bestTimes.map((entry) => ({
      pattern: `Best posting hour: ${entry.hour}:00`,
      confidence_score: Number(entry.score.toFixed(4)),
      pattern_type: "time",
      metadata: { hour: entry.hour }
    })),
    ...bestFormats.map((entry) => ({
      pattern: `Best format: ${entry.format}`,
      confidence_score: Number(entry.score.toFixed(4)),
      pattern_type: "format",
      metadata: { format: entry.format }
    }))
  ];

  if (insights.length > 0) {
    await supabase.from("learning_memory").insert(insights);
  }

  return {
    bestHooks,
    bestTimes,
    bestFormats
  };
}
