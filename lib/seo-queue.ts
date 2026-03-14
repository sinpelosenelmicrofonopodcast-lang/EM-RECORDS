import { createServiceClient } from "@/lib/supabase/service";
import { absoluteUrl, getSiteOrigin } from "@/lib/utils";

type QueueStatus = "pending" | "submitted" | "error";
type QueueType = "artist" | "release" | "page";

type QueueRow = {
  id: string;
  url: string;
  type: string;
  status: QueueStatus;
  attempts: number;
  last_error: string | null;
  submitted_at: string | null;
  updated_at: string;
  created_at: string;
};

function sanitizeCanonicalUrl(rawUrl: string): string | null {
  const siteOrigin = getSiteOrigin();
  try {
    const parsed = new URL(rawUrl, siteOrigin);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function enqueueSeoUrl(input: { url: string; type: QueueType; service?: ReturnType<typeof createServiceClient> }) {
  const canonical = sanitizeCanonicalUrl(input.url);
  if (!canonical) return { ok: false, error: "Invalid URL" };

  const service = input.service ?? createServiceClient();
  const { error } = await service.from("seo_queue").upsert(
    {
      url: canonical,
      type: input.type,
      status: "pending",
      last_error: null
    },
    {
      onConflict: "url",
      ignoreDuplicates: false
    }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function isEligibleForSitemap(url: string): boolean {
  const origin = getSiteOrigin();
  if (!url.startsWith(origin)) return false;
  const path = url.slice(origin.length);

  if (path === "" || path === "/") return true;
  if (path === "/artists" || path === "/music" || path === "/videos" || path === "/events" || path === "/press" || path === "/publishing" || path === "/join") {
    return true;
  }

  return (
    path.startsWith("/artists/") ||
    path.startsWith("/music/") ||
    path.startsWith("/news/")
  );
}

export async function processSeoQueue(input?: { limit?: number; service?: ReturnType<typeof createServiceClient> }) {
  const limit = input?.limit ?? 50;
  const service = input?.service ?? createServiceClient();
  const { data, error } = await service
    .from("seo_queue")
    .select("id,url,type,status,attempts,last_error,submitted_at,updated_at,created_at")
    .in("status", ["pending", "error"])
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) {
    return {
      processed: 0,
      submitted: 0,
      failed: 0,
      error: error.message
    };
  }

  const rows = (data ?? []) as QueueRow[];
  let submitted = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      if (!isEligibleForSitemap(row.url)) {
        failed += 1;
        await service
          .from("seo_queue")
          .update({
            status: "error",
            attempts: (row.attempts ?? 0) + 1,
            last_error: "URL is outside sitemap-eligible routes."
          })
          .eq("id", row.id);
        continue;
      }

      submitted += 1;
      await service
        .from("seo_queue")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          last_error: null,
          attempts: (row.attempts ?? 0) + 1
        })
        .eq("id", row.id);
    } catch (errorObject) {
      failed += 1;
      await service
        .from("seo_queue")
        .update({
          status: "error",
          attempts: (row.attempts ?? 0) + 1,
          last_error: errorObject instanceof Error ? errorObject.message.slice(0, 500) : "Unknown processing error."
        })
        .eq("id", row.id);
    }
  }

  return {
    processed: rows.length,
    submitted,
    failed
  };
}

export async function getSeoQueueStats(serviceInput?: ReturnType<typeof createServiceClient>) {
  const service = serviceInput ?? createServiceClient();
  const [{ count: pending }, { count: submitted }, { count: errored }, { data: errors }] = await Promise.all([
    service.from("seo_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    service.from("seo_queue").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    service.from("seo_queue").select("id", { count: "exact", head: true }).eq("status", "error"),
    service
      .from("seo_queue")
      .select("id,url,last_error,updated_at")
      .eq("status", "error")
      .order("updated_at", { ascending: false })
      .limit(20)
  ]);

  return {
    pending: pending ?? 0,
    submitted: submitted ?? 0,
    error: errored ?? 0,
    recentErrors: (errors ?? []).map((row: any) => ({
      id: String(row.id),
      url: String(row.url),
      message: String(row.last_error ?? "Unknown"),
      updatedAt: String(row.updated_at ?? "")
    }))
  };
}

export async function getIndexingCandidates(serviceInput?: ReturnType<typeof createServiceClient>) {
  const service = serviceInput ?? createServiceClient();

  const [artistRows, releaseRows, queueRows] = await Promise.all([
    service.from("artists").select("slug,is_published").eq("is_published", true),
    service.from("releases").select("slug,is_published").eq("is_published", true),
    service.from("seo_queue").select("url")
  ]);

  const queued = new Set((queueRows.data ?? []).map((row: any) => String(row.url)));
  const candidates: string[] = [];

  (artistRows.data ?? []).forEach((row: any) => {
    const url = absoluteUrl(`/artists/${String(row.slug)}`);
    if (!queued.has(url)) candidates.push(url);
  });

  (releaseRows.data ?? []).forEach((row: any) => {
    const slug = String(row.slug ?? "").trim();
    if (!slug) return;
    const url = absoluteUrl(`/music/${slug}`);
    if (!queued.has(url)) candidates.push(url);
  });

  return candidates.slice(0, 100);
}

export async function runSeoAudit(serviceInput?: ReturnType<typeof createServiceClient>) {
  const service = serviceInput ?? createServiceClient();
  const queue = await getSeoQueueStats(service);
  const candidates = await getIndexingCandidates(service);

  const issues: Array<{ type: string; message: string; count?: number }> = [];
  if (queue.error > 0) {
    issues.push({ type: "queue_errors", message: "Queue has failed entries.", count: queue.error });
  }
  if (queue.pending > 100) {
    issues.push({ type: "queue_backlog", message: "Queue backlog is high.", count: queue.pending });
  }
  if (candidates.length > 0) {
    issues.push({ type: "indexing_candidates", message: "Published URLs not present in queue.", count: candidates.length });
  }

  await service.from("seo_audit_runs").insert({
    issues_count: issues.length,
    summary: {
      issues,
      queue,
      indexingCandidates: candidates.slice(0, 25)
    }
  });

  return {
    issues,
    queue,
    candidates
  };
}

