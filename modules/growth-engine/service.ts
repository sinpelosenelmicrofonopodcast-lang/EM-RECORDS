import { createServiceClient } from "@/lib/supabase/service";
import { syncArtistContent } from "@/modules/artist-ingestion/service";
import { analyzePerformance } from "@/modules/ai-optimizer/service";
import type {
  ApprovalState,
  GeneratorContentType,
  GrowthEngineDashboard,
  GrowthRunRecord,
  PlatformTarget,
  QueueContentType
} from "@/modules/growth-engine/types";
import { applyLearning, learnFromData } from "@/modules/learning-system/service";
import { generateReel } from "@/modules/reel-generator/service";
import {
  buildArtistGrowthProfile,
  buildScheduleSlots,
  createContentQueueItem,
  generateContent,
  getAutomationSettings,
  getLearningMemory,
  getSocialEngineDashboardData,
  publishSmart,
  upsertAutomationSettings
} from "@/modules/social-engine/service";
import { fetchViralContent, repurposeContent } from "@/modules/viral-engine/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

function getService(service?: ServiceClient): ServiceClient {
  return service ?? createServiceClient();
}

function weightedPlan(contentMix: Record<string, number>, total: number): QueueContentType[] {
  const entries = Object.entries(contentMix).sort((a, b) => b[1] - a[1]);
  const plan: QueueContentType[] = [];

  for (const [format, weight] of entries) {
    const slots = Math.max(1, Math.round(weight * total));
    for (let index = 0; index < slots; index += 1) {
      if (format === "song" || format === "video" || format === "reel" || format === "artist_story" || format === "news" || format === "promo" || format === "viral") {
        plan.push(format);
      }
    }
  }

  while (plan.length < total) {
    plan.push("song");
  }

  return plan.slice(0, total);
}

function mapQueueTypeToGenerator(type: QueueContentType): GeneratorContentType {
  if (type === "song") return "song_post";
  if (type === "video") return "video_post";
  if (type === "artist_story") return "artist_story";
  if (type === "viral") return "viral_post";
  return "promo_post";
}

function mapGrowthRun(row: any): GrowthRunRecord {
  return {
    id: String(row.id),
    triggerType: String(row.trigger_type ?? "manual"),
    status: String(row.status ?? "running") as GrowthRunRecord["status"],
    summary: typeof row.summary === "object" && row.summary ? (row.summary as Record<string, unknown>) : {},
    startedAt: String(row.started_at ?? new Date().toISOString()),
    finishedAt: row.finished_at ? String(row.finished_at) : null
  };
}

function normalizeTopFormats(learningMemory: Awaited<ReturnType<typeof getLearningMemory>>) {
  return learningMemory
    .filter((item) => item.patternType === "format")
    .slice(0, 5)
    .map((item) => ({
      label: String(item.metadata.format ?? item.pattern.replace(/^Best format:\s*/i, "")),
      score: item.confidenceScore
    }));
}

function normalizeBestTimes(learningMemory: Awaited<ReturnType<typeof getLearningMemory>>) {
  return learningMemory
    .filter((item) => item.patternType === "time")
    .slice(0, 5)
    .map((item) => ({
      hour: Number(item.metadata.hour ?? 0),
      score: item.confidenceScore
    }));
}

export async function getGrowthEngineDashboardData(service?: ServiceClient): Promise<GrowthEngineDashboard> {
  const supabase = getService(service);
  const [settings, learningMemory, runsRes, queueRes, analyticsRes] = await Promise.all([
    getAutomationSettings(supabase),
    getLearningMemory(supabase, 20),
    supabase.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(8),
    supabase.from("content_queue").select("id,status"),
    supabase.from("post_analytics").select("engagement_rate")
  ]);

  const recentRuns = (runsRes.data ?? []).map(mapGrowthRun);
  const postsCreated = (queueRes.data ?? []).length;
  const postsPublished = (queueRes.data ?? []).filter((item: any) => item.status === "posted").length;
  const averageEngagement =
    analyticsRes.data && analyticsRes.data.length > 0
      ? Number(
          (
            analyticsRes.data.reduce((sum: number, item: any) => sum + Number(item.engagement_rate ?? 0), 0) /
            analyticsRes.data.length
          ).toFixed(4)
        )
      : 0;

  return {
    settings,
    recentRuns,
    learningMemory,
    topFormats: normalizeTopFormats(learningMemory),
    bestTimes: normalizeBestTimes(learningMemory),
    analytics: {
      postsCreated,
      postsPublished,
      averageEngagement
    }
  };
}

export async function runGrowthAutomation(
  options?: { triggerType?: string; autoApprove?: boolean; publishDue?: boolean },
  service?: ServiceClient
) {
  const supabase = getService(service);
  const triggerType = options?.triggerType ?? "manual";
  const approvalState: ApprovalState = options?.autoApprove ? "approved" : "pending";

  const { data: runRow, error: runError } = await supabase
    .from("automation_runs")
    .insert({
      trigger_type: triggerType,
      status: "running",
      summary: {}
    })
    .select("*")
    .maybeSingle();

  if (runError || !runRow) {
    throw new Error(runError?.message ?? "Failed to create automation run.");
  }

  try {
    const settings = await getAutomationSettings(supabase);
    const syncSummary = await syncArtistContent(undefined, supabase);
    const viralPool = await fetchViralContent(supabase);
    const performance = await analyzePerformance(supabase);
    const learned = await learnFromData(supabase);
    const applied = await applyLearning(supabase);

    const artistsDashboard = await getSocialEngineDashboardData(supabase);
    const artists = artistsDashboard.artists.filter((artist) => artist.active);
    const artistIds = artists.map((artist) => artist.id);

    const artistsRes = await supabase
      .from("artists")
      .select("id,name,stage_name,bio,genre,primary_genre,active,avatar_url,hero_media_url,spotify_url,youtube_url,instagram_url,tiktok_url")
      .in("id", artistIds);
    const profilesRes = await supabase.from("artist_profiles").select("artist_id,instagram,tiktok,youtube_channel,spotify_url").in("artist_id", artistIds);
    const releasesRes = await supabase.from("releases").select("artist_id,title,video_title").in("artist_id", artistIds);
    const songsRes = await supabase.from("songs").select("artist_id,title").in("artist_id", artistIds);
    const assetsRes = await supabase.from("artist_assets").select("artist_id,url").in("artist_id", artistIds);

    const profilesByArtist = new Map<string, any>();
    for (const profile of profilesRes.data ?? []) {
      profilesByArtist.set(String((profile as any).artist_id), profile);
    }

    const releasesByArtist = new Map<string, string[]>();
    for (const release of releasesRes.data ?? []) {
      const key = String((release as any).artist_id ?? "");
      if (!releasesByArtist.has(key)) releasesByArtist.set(key, []);
      releasesByArtist.get(key)?.push(String((release as any).title ?? ""));
    }

    const videosByArtist = new Map<string, string[]>();
    for (const release of releasesRes.data ?? []) {
      const key = String((release as any).artist_id ?? "");
      if (!videosByArtist.has(key)) videosByArtist.set(key, []);
      const title = String((release as any).video_title ?? (release as any).title ?? "");
      if (title) videosByArtist.get(key)?.push(title);
    }

    const songsByArtist = new Map<string, string[]>();
    for (const song of songsRes.data ?? []) {
      const key = String((song as any).artist_id ?? "");
      if (!songsByArtist.has(key)) songsByArtist.set(key, []);
      songsByArtist.get(key)?.push(String((song as any).title ?? ""));
    }

    const assetsByArtist = new Map<string, string[]>();
    for (const asset of assetsRes.data ?? []) {
      const key = String((asset as any).artist_id ?? "");
      if (!assetsByArtist.has(key)) assetsByArtist.set(key, []);
      assetsByArtist.get(key)?.push(String((asset as any).url ?? ""));
    }

    const plan = weightedPlan(settings.contentMix, settings.postsPerDay);
    const scheduleSlots = buildScheduleSlots(settings, plan.length);
    let created = 0;

    for (const [index, type] of plan.entries()) {
      const artistRow = (artistsRes.data ?? [])[index % Math.max(1, artistsRes.data?.length ?? 1)];
      if (!artistRow) continue;

      const artistId = String((artistRow as any).id);
      const profile = profilesByArtist.get(artistId);
      const artist = buildArtistGrowthProfile({
        ...artistRow,
        profile_instagram: profile?.instagram ?? null,
        profile_tiktok: profile?.tiktok ?? null,
        profile_youtube_channel: profile?.youtube_channel ?? null,
        profile_spotify_url: profile?.spotify_url ?? null,
        release_titles: releasesByArtist.get(artistId) ?? [],
        top_tracks: songsByArtist.get(artistId) ?? [],
        video_titles: videosByArtist.get(artistId) ?? [],
        asset_urls: assetsByArtist.get(artistId) ?? []
      });

      if (type === "reel") {
        const reel = await generateReel(artistId, supabase);
        await createContentQueueItem(
          {
            artistId,
            contentType: "reel",
            title: `${artist.stageName || artist.name} reel`,
            hook: reel.overlay_text,
            caption: reel.caption,
            hashtags: reel.hashtags,
            mediaUrl: reel.mediaUrl,
            videoData: reel.video_data,
            overlayText: reel.overlay_text,
            platformTargets: settings.platformsEnabled,
            status: "scheduled",
            approvalState,
            scheduledAt: scheduleSlots[index],
            queuePosition: index + 1,
            aiGenerated: true,
            metadata: {
              source: "reel-generator"
            }
          },
          supabase
        );
        created += 1;
        continue;
      }

      if (type === "viral") {
        const viralItem = viralPool[index % Math.max(1, viralPool.length)];
        const repurposed = repurposeContent(
          {
            caption: viralItem?.caption ?? null,
            source: viralItem?.source ?? null,
            artistName: artist.stageName || artist.name
          },
          { tone: settings.tone, language: settings.language }
        );

        await createContentQueueItem(
          {
            artistId,
            contentType: "viral",
            title: `${artist.stageName || artist.name} viral repost`,
            hook: repurposed.split("\n")[0] ?? repurposed,
            caption: repurposed,
            hashtags: [`#${(artist.stageName || artist.name).replace(/[^a-zA-Z0-9]/g, "")}`, "#EMRecords", "#Viral"],
            mediaUrl: viralItem?.contentUrl ?? null,
            platformTargets: settings.platformsEnabled,
            status: "scheduled",
            approvalState,
            scheduledAt: scheduleSlots[index],
            queuePosition: index + 1,
            aiGenerated: true,
            metadata: {
              source: "viral-engine",
              viralContentId: viralItem?.id ?? null
            }
          },
          supabase
        );
        created += 1;
        continue;
      }

      const generated = generateContent(mapQueueTypeToGenerator(type), artist, {
        tone: settings.tone,
        language: settings.language,
        learningPatterns: artistsDashboard.learningMemory
      });

      await createContentQueueItem(
        {
          artistId,
          contentType: type,
          title: `${artist.stageName || artist.name} ${type.replace(/_/g, " ")}`,
          hook: generated.hook,
          caption: generated.caption,
          hashtags: generated.hashtags,
          mediaUrl: artist.assetUrls[0] ?? artist.avatarUrl ?? artist.heroMediaUrl ?? null,
          imagePrompt: generated.image_prompt,
          videoPrompt: generated.video_prompt,
          platformTargets: settings.platformsEnabled as PlatformTarget[],
          status: "scheduled",
          approvalState,
          scheduledAt: scheduleSlots[index],
          queuePosition: index + 1,
          aiGenerated: true,
          metadata: {
            source: "social-engine",
            generatorType: mapQueueTypeToGenerator(type)
          }
        },
        supabase
      );
      created += 1;
    }

    const publishSummary = options?.publishDue ? await publishSmart({ limit: settings.postsPerDay }, supabase) : { processed: 0, posted: 0, manual: 0, failed: 0 };

    await upsertAutomationSettings(
      {
        lastRunAt: new Date().toISOString()
      },
      supabase
    );

    const summary = {
      syncSummary,
      created,
      publishSummary,
      performance,
      learned,
      applied
    };

    await supabase
      .from("automation_runs")
      .update({
        status: "completed",
        summary,
        finished_at: new Date().toISOString()
      })
      .eq("id", String(runRow.id));

    return summary;
  } catch (error) {
    await supabase
      .from("automation_runs")
      .update({
        status: "failed",
        summary: {
          error: error instanceof Error ? error.message : "Unknown automation error"
        },
        finished_at: new Date().toISOString()
      })
      .eq("id", String(runRow.id));

    throw error;
  }
}
