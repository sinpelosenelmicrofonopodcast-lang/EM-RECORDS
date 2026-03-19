"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { hasGrowthAccess, requireGrowthPageAccess } from "@/modules/growth-engine/auth";
import { runGrowthAutomation } from "@/modules/growth-engine/service";
import type { PlatformTarget } from "@/modules/growth-engine/types";
import { syncArtistContent } from "@/modules/artist-ingestion/service";
import {
  buildArtistGrowthProfile,
  createContentQueueItem,
  generateContent,
  getLearningMemory,
  upsertAutomationSettings,
  upsertSocialAccount
} from "@/modules/social-engine/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

function redirectWithMessage(path: string, key: "error" | "success", message: string) {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function parsePlatforms(formData: FormData, fieldName = "platforms"): PlatformTarget[] {
  const all = formData.getAll(fieldName).map((item) => String(item));
  return all.filter((value): value is PlatformTarget =>
    value === "instagram" || value === "facebook" || value === "tiktok" || value === "youtube_shorts" || value === "x"
  );
}

async function loadArtistProfile(artistId: string, service: ServiceClient) {
  const [artistRes, profileRes, releasesRes, songsRes, assetsRes] = await Promise.all([
    service.from("artists").select("*").eq("id", artistId).maybeSingle(),
    service.from("artist_profiles").select("*").eq("artist_id", artistId).maybeSingle(),
    service.from("releases").select("title,video_title").eq("artist_id", artistId),
    service.from("songs").select("title").eq("artist_id", artistId),
    service.from("artist_assets").select("url").eq("artist_id", artistId).order("created_at", { ascending: false }).limit(8)
  ]);

  if (!artistRes.data) {
    throw new Error("Artist not found.");
  }

  return buildArtistGrowthProfile({
    ...artistRes.data,
    profile_instagram: profileRes.data?.instagram ?? null,
    profile_tiktok: profileRes.data?.tiktok ?? null,
    profile_youtube_channel: profileRes.data?.youtube_channel ?? null,
    profile_spotify_url: profileRes.data?.spotify_url ?? null,
    release_titles: (releasesRes.data ?? []).map((row: any) => String(row.title ?? "")),
    top_tracks: (songsRes.data ?? []).map((row: any) => String(row.title ?? "")),
    video_titles: (releasesRes.data ?? []).map((row: any) => String(row.video_title ?? row.title ?? "")),
    asset_urls: (assetsRes.data ?? []).map((row: any) => String(row.url ?? ""))
  });
}

export async function saveAutomationSettingsAction(formData: FormData) {
  try {
    const access = await requireGrowthPageAccess("owner");
    if (!access.canManageAutomation) {
      throw new Error("You do not have permission to manage automation.");
    }

    const service = createServiceClient();
    await upsertAutomationSettings(
      {
        enabled: String(formData.get("enabled") ?? "") === "on",
        postsPerDay: Number(formData.get("postsPerDay") ?? 4),
        platformsEnabled: parsePlatforms(formData),
        tone: String(formData.get("tone") ?? "urban latino").trim(),
        language: String(formData.get("language") ?? "es").trim(),
        bestPostingWindows: String(formData.get("bestPostingWindows") ?? "")
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value)),
        contentMix: {
          song: Number(formData.get("mixSong") ?? 0.3),
          reel: Number(formData.get("mixReel") ?? 0.25),
          artist_story: Number(formData.get("mixStory") ?? 0.15),
          promo: Number(formData.get("mixPromo") ?? 0.15),
          viral: Number(formData.get("mixViral") ?? 0.15)
        }
      },
      service
    );

    revalidatePath("/admin/social-engine");
    revalidatePath("/admin/growth-engine");
    redirectWithMessage("/admin/social-engine", "success", "Automation settings saved.");
  } catch (error) {
    unstable_rethrow(error);
    console.error("saveAutomationSettingsAction failed", error);
    redirectWithMessage("/admin/social-engine", "error", String((error as Error)?.message ?? "Failed to save automation settings."));
  }
}

export async function saveSocialAccountAction(formData: FormData) {
  try {
    const access = await requireGrowthPageAccess("developer");
    if (!access.canManageTokens) {
      throw new Error("You do not have permission to manage social credentials.");
    }

    await upsertSocialAccount({
      id: String(formData.get("id") ?? "").trim() || null,
      platform: String(formData.get("platform") ?? "instagram") as PlatformTarget,
      accountLabel: String(formData.get("accountLabel") ?? "").trim() || null,
      accountIdentifier: String(formData.get("accountIdentifier") ?? "").trim() || null,
      accessToken: String(formData.get("accessToken") ?? "").trim() || null,
      refreshToken: String(formData.get("refreshToken") ?? "").trim() || null,
      tokenExpiresAt: String(formData.get("tokenExpiresAt") ?? "").trim() || null,
      active: String(formData.get("active") ?? "") === "on"
    });

    revalidatePath("/admin/social-engine");
    redirectWithMessage("/admin/social-engine", "success", "Social account saved.");
  } catch (error) {
    unstable_rethrow(error);
    console.error("saveSocialAccountAction failed", error);
    redirectWithMessage("/admin/social-engine", "error", String((error as Error)?.message ?? "Failed to save social account."));
  }
}

export async function generateQueueContentAction(formData: FormData) {
  try {
    const access = await requireGrowthPageAccess("admin");
    if (!access.canEditContent) {
      throw new Error("You do not have permission to create content.");
    }

    const service = createServiceClient();
    const artistId = String(formData.get("artistId") ?? "").trim();
    const contentType = String(formData.get("contentType") ?? "song") as "song" | "video" | "artist_story" | "promo" | "viral";
    const artist = await loadArtistProfile(artistId, service);
    const learningMemory = await getLearningMemory(service, 10);
    const generated = generateContent(
      contentType === "song"
        ? "song_post"
        : contentType === "video"
          ? "video_post"
          : contentType === "artist_story"
            ? "artist_story"
            : contentType === "viral"
              ? "viral_post"
              : "promo_post",
      artist,
      {
        learningPatterns: learningMemory
      }
    );

    await createContentQueueItem(
      {
        artistId,
        contentType,
        title: `${artist.stageName || artist.name} ${contentType.replace(/_/g, " ")}`,
        hook: generated.hook,
        caption: generated.caption,
        hashtags: generated.hashtags,
        mediaUrl: artist.assetUrls[0] ?? artist.avatarUrl ?? artist.heroMediaUrl ?? null,
        imagePrompt: generated.image_prompt,
        videoPrompt: generated.video_prompt,
        platformTargets: parsePlatforms(formData),
        status: String(formData.get("scheduleNow") ?? "") === "on" ? "scheduled" : "draft",
        approvalState: hasGrowthAccess(access, "owner") ? "approved" : "pending",
        scheduledAt: String(formData.get("scheduledAt") ?? "").trim() || null,
        metadata: {
          source: "manual-studio"
        }
      },
      service
    );

    revalidatePath("/admin/social-engine");
    revalidatePath("/admin/growth-engine");
    redirectWithMessage("/admin/social-engine", "success", "Social draft created.");
  } catch (error) {
    unstable_rethrow(error);
    console.error("generateQueueContentAction failed", error);
    redirectWithMessage("/admin/social-engine", "error", String((error as Error)?.message ?? "Failed to create social draft."));
  }
}

export async function runGrowthAutomationAction() {
  try {
    const access = await requireGrowthPageAccess("owner");
    if (!access.canManageAutomation) {
      throw new Error("You do not have permission to run automation.");
    }

    await runGrowthAutomation({
      triggerType: "manual_dashboard",
      autoApprove: hasGrowthAccess(access, "owner"),
      publishDue: true
    });

    revalidatePath("/admin/social-engine");
    revalidatePath("/admin/growth-engine");
    redirectWithMessage("/admin/growth-engine", "success", "Growth automation executed.");
  } catch (error) {
    unstable_rethrow(error);
    console.error("runGrowthAutomationAction failed", error);
    redirectWithMessage("/admin/growth-engine", "error", String((error as Error)?.message ?? "Failed to run growth automation."));
  }
}

export async function syncArtistContentAction(formData: FormData) {
  try {
    const access = await requireGrowthPageAccess("owner");
    if (!access.canManageAutomation) {
      throw new Error("You do not have permission to sync artist data.");
    }

    const artistId = String(formData.get("artistId") ?? "").trim() || undefined;
    await syncArtistContent(artistId);

    revalidatePath("/admin/artists");
    revalidatePath("/admin/social-engine");
    redirectWithMessage("/admin/artists", "success", artistId ? "Artist sync completed." : "Artist sync completed for all artists.");
  } catch (error) {
    unstable_rethrow(error);
    console.error("syncArtistContentAction failed", error);
    redirectWithMessage("/admin/artists", "error", String((error as Error)?.message ?? "Failed to sync artist data."));
  }
}
