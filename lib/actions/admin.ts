"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { hashEpkPassword } from "@/lib/epk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { enqueueSeoUrl } from "@/lib/seo-queue";
import {
  dispatchSocialJobById,
  maybeAutoQueueArtistPosts,
  maybeAutoQueueNewsPosts,
  maybeAutoQueueReleasePosts,
  processSocialPublishingQueue,
  publishManualSocialPosts
} from "@/lib/social-publishing";
import { absoluteUrl, normalizeAppleMusicEmbedUrl, normalizeSpotifyEmbedUrl, normalizeYouTubeEmbedUrl, slugifyText } from "@/lib/utils";

async function requireAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot) {
    throw new Error("Unauthorized.");
  }

  if (!snapshot.isAdmin) {
    throw new Error("Forbidden.");
  }

  // Admin actions write through service role to avoid RLS friction on protected tables.
  // Authorization is enforced above with authenticated user + admin role check.
  try {
    const service = createServiceClient();
    await service.from("profiles").upsert(
      {
        id: snapshot.user.id,
        email: snapshot.user.email ?? null,
        full_name: snapshot.user.user_metadata?.label ?? "EM Records Admin",
        is_admin: true
      },
      { onConflict: "id", ignoreDuplicates: false }
    );
  } catch {
    // If profiles is not available yet, keep going with auth metadata admin.
  }

  return createServiceClient();
}

async function uploadFileToBucket(
  supabase: ReturnType<typeof createServiceClient>,
  file: File | null,
  bucket: string,
  prefix: string
): Promise<string | null> {
  if (!file || file.size === 0) {
    return null;
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = `${prefix}/${Date.now()}-${crypto.randomUUID()}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

function revalidateSocialLinkPaths() {
  revalidatePath("/admin/social-links");
  revalidatePath("/");
}

function revalidateSocialPublishingPaths() {
  revalidatePath("/admin/social-publishing");
  revalidatePath("/admin");
}

export async function signInAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isSupabaseConfigured()) {
    redirect("/admin");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin");
}

export async function signOutAdminAction() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function upsertArtistAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const { data: previousArtist } = id ? await supabase.from("artists").select("*").eq("id", id).maybeSingle() : { data: null as any };
  const pressKitFileValue = formData.get("pressKitFile");
  const mediaKitFileValue = formData.get("mediaKitFile");
  const pressKitFile = pressKitFileValue instanceof File && pressKitFileValue.size > 0 ? pressKitFileValue : null;
  const mediaKitFile = mediaKitFileValue instanceof File && mediaKitFileValue.size > 0 ? mediaKitFileValue : null;

  const uploadedPressKitUrl = await uploadFileToBucket(supabase, pressKitFile, "press-kits", "artists/press-kits");
  const uploadedMediaKitUrl = await uploadFileToBucket(supabase, mediaKitFile, "press-kits", "artists/media-kits");
  const pressKitUrlInput = String(formData.get("pressKitUrl") ?? "").trim();
  const mediaKitUrlInput = String(formData.get("mediaKitUrl") ?? "").trim();
  const instagramUrlInput = String(formData.get("instagramUrl") ?? "").trim();
  const tiktokUrlInput = String(formData.get("tiktokUrl") ?? "").trim();
  const xUrlInput = String(formData.get("xUrl") ?? "").trim();
  const facebookUrlInput = String(formData.get("facebookUrl") ?? "").trim();
  const platformPreferenceInput = String(formData.get("platformPreference") ?? "").trim().toLowerCase();
  const isPublishedInput = String(formData.get("isPublished") ?? "") === "on";
  const publishedAtInput = String(formData.get("publishedAt") ?? "").trim();
  const spotifyEmbedInput = String(formData.get("spotifyEmbed") ?? "").trim();
  const soundcloudEmbedInput = String(formData.get("soundcloudEmbed") ?? "").trim();
  const musicVideoEmbedInput = String(formData.get("musicVideoEmbed") ?? "").trim();
  const interviewUrl1Input = String(formData.get("interviewUrl1") ?? "").trim();
  const interviewUrl2Input = String(formData.get("interviewUrl2") ?? "").trim();
  const epkEnabledInput = String(formData.get("epkEnabled") ?? "") === "on";
  const epkPasswordInput = String(formData.get("epkPassword") ?? "").trim();
  const epkPasswordHash = epkPasswordInput ? hashEpkPassword(epkPasswordInput) : null;

  const payloadForUpsert: Record<string, unknown> = {
    id: id || undefined,
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    hero_media_url: String(formData.get("heroMediaUrl") ?? "").trim(),
    avatar_url: String(formData.get("avatarUrl") ?? "").trim(),
    booking_email: String(formData.get("bookingEmail") ?? "").trim(),
    spotify_url: String(formData.get("spotifyUrl") ?? "").trim() || null,
    apple_music_url: String(formData.get("appleMusicUrl") ?? "").trim() || null,
    youtube_url: String(formData.get("youtubeUrl") ?? "").trim() || null,
    spotify_embed: spotifyEmbedInput || null,
    soundcloud_embed: soundcloudEmbedInput || null,
    music_video_embed: musicVideoEmbedInput || null,
    interview_url_1: interviewUrl1Input || null,
    interview_url_2: interviewUrl2Input || null,
    press_kit_url: uploadedPressKitUrl ?? (pressKitUrlInput || null),
    media_kit_url: uploadedMediaKitUrl ?? (mediaKitUrlInput || null),
    instagram_url: instagramUrlInput || null,
    tiktok_url: tiktokUrlInput || null,
    x_url: xUrlInput || null,
    facebook_url: facebookUrlInput || null,
    platform_preference: ["spotify", "apple", "youtube"].includes(platformPreferenceInput) ? platformPreferenceInput : null,
    press_kit_updated_at: uploadedPressKitUrl || pressKitUrlInput ? new Date().toISOString() : null,
    media_kit_updated_at: uploadedMediaKitUrl || mediaKitUrlInput ? new Date().toISOString() : null,
    epk_enabled: epkEnabledInput,
    is_published: isPublishedInput,
    published_at: isPublishedInput ? (publishedAtInput ? new Date(publishedAtInput).toISOString() : new Date().toISOString()) : null,
    hero_image_url: String(formData.get("avatarUrl") ?? "").trim() || String(formData.get("heroMediaUrl") ?? "").trim() || null
  };

  if (epkPasswordHash) {
    payloadForUpsert.epk_password_hash = epkPasswordHash;
  }

  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await supabase.from("artists").upsert(payloadForUpsert);
    error = result.error;

    if (!error) {
      break;
    }

    const message = String(error.message || "");
    const missingColumn = message.match(/'([^']+)'/)?.[1];

    if (!missingColumn || !(missingColumn in payloadForUpsert)) {
      break;
    }

    delete payloadForUpsert[missingColumn];
  }

  if (error) {
    throw new Error(error.message);
  }

  const { data: nextArtist, error: nextArtistError } = id
    ? await supabase.from("artists").select("*").eq("id", id).maybeSingle()
    : await supabase.from("artists").select("*").eq("slug", String(formData.get("slug") ?? "").trim()).maybeSingle();

  if (nextArtistError) {
    throw new Error(nextArtistError.message);
  }

  revalidatePath("/admin/artists");
  revalidatePath("/artists");
  revalidateSocialPublishingPaths();

  if (isPublishedInput) {
    const artistSlug = String(formData.get("slug") ?? "").trim();
    if (artistSlug) {
      await enqueueSeoUrl({
        url: absoluteUrl(`/artists/${artistSlug}`),
        type: "artist",
        service: supabase
      });
    }
  }

  try {
    await maybeAutoQueueArtistPosts({
      service: supabase,
      previousArtist,
      nextArtist
    });
  } catch (socialError) {
    console.error("Artist social publishing failed", socialError);
  }
}

export async function upsertReleaseAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const { data: previousRelease } = id ? await supabase.from("releases").select("*").eq("id", id).maybeSingle() : { data: null as any };
  const titleInput = String(formData.get("title") ?? "").trim();
  const slugInput = slugifyText(String(formData.get("slug") ?? ""));
  const formatInput = String(formData.get("format") ?? "Single").trim();
  const spotifyEmbedInput = String(formData.get("spotifyEmbed") ?? "").trim();
  const appleEmbedInput = String(formData.get("appleEmbed") ?? "").trim();
  const youtubeEmbedInput = String(formData.get("youtubeEmbed") ?? "").trim();
  const preSaveUrlInput = String(formData.get("preSaveUrl") ?? "").trim();
  const artistSlugInput = String(formData.get("artistSlug") ?? "").trim();
  const artistNameInput = String(formData.get("artistName") ?? "").trim();
  const videoTitleInput = String(formData.get("videoTitle") ?? "").trim();
  const videoThumbnailInput = String(formData.get("videoThumbnailUrl") ?? "").trim();
  const featuringInput = String(formData.get("featuring") ?? "")
    .trim()
    .replace(/^feat\.?\s*/i, "");
  const contentStatusInput = String(formData.get("contentStatus") ?? "published").trim();
  const publishAtInput = String(formData.get("publishAt") ?? "").trim();
  const isPublishedInput = String(formData.get("isPublished") ?? "") === "on";
  const publishedAtInput = String(formData.get("publishedAt") ?? "").trim();
  let resolvedArtistName = artistNameInput || null;
  const normalizedType =
    formatInput.toLowerCase() === "album" ? "album" : formatInput.toLowerCase() === "ep" ? "ep" : "single";
  const fallbackSlug = slugifyText(titleInput || "release");
  const resolvedReleaseSlug = slugInput || `${fallbackSlug || "release"}-${(id || crypto.randomUUID()).slice(0, 8)}`;

  if (!resolvedArtistName && artistSlugInput) {
    const { data: linkedArtist, error: linkedArtistError } = await supabase.from("artists").select("name").eq("slug", artistSlugInput).maybeSingle();
    if (!linkedArtistError && linkedArtist?.name) {
      resolvedArtistName = linkedArtist.name;
    }
  }

  const payloadForUpsert: Record<string, unknown> = {
    id: id || undefined,
    title: titleInput,
    slug: resolvedReleaseSlug,
    format: formatInput,
    type: normalizedType,
    cover_url: String(formData.get("coverUrl") ?? "").trim(),
    cover_image_url: String(formData.get("coverUrl") ?? "").trim(),
    release_date: String(formData.get("releaseDate") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    artist_slug: artistSlugInput || null,
    artist_name: resolvedArtistName,
    featuring: featuringInput || null,
    spotify_embed: spotifyEmbedInput ? normalizeSpotifyEmbedUrl(spotifyEmbedInput) : null,
    apple_embed: appleEmbedInput ? normalizeAppleMusicEmbedUrl(appleEmbedInput) : null,
    youtube_embed: youtubeEmbedInput ? normalizeYouTubeEmbedUrl(youtubeEmbedInput) : null,
    pre_save_url: preSaveUrlInput || null,
    video_title: videoTitleInput || null,
    video_thumbnail_url: videoThumbnailInput || null,
    video_featured: String(formData.get("videoFeatured") ?? "") === "on",
    content_status: contentStatusInput || "published",
    publish_at: publishAtInput ? new Date(publishAtInput).toISOString() : null,
    is_published: isPublishedInput,
    published_at: isPublishedInput ? (publishedAtInput ? new Date(publishedAtInput).toISOString() : new Date().toISOString()) : null,
    featured: String(formData.get("featured") ?? "") === "on"
  };

  if (payloadForUpsert.featured) {
    await supabase.from("releases").update({ featured: false }).eq("featured", true);
  }
  if (payloadForUpsert.video_featured) {
    const clearVideoFeatured = await supabase.from("releases").update({ video_featured: false }).eq("video_featured", true);
    if (clearVideoFeatured.error && !String(clearVideoFeatured.error.message || "").includes("video_featured")) {
      throw new Error(clearVideoFeatured.error.message);
    }
  }

  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase.from("releases").upsert(payloadForUpsert);
    error = result.error;

    if (!error) break;

    const missingColumn = String(error.message || "").match(/'([^']+)'/)?.[1];
    if (!missingColumn || !(missingColumn in payloadForUpsert)) break;
    if (missingColumn === "artist_slug") {
      throw new Error(
        `Missing '${missingColumn}' column in releases. Run the latest Supabase SQL migration for releases and retry.`
      );
    }
    delete payloadForUpsert[missingColumn];
  }

  if (error) {
    throw new Error(error.message);
  }

  const { data: nextRelease, error: nextReleaseError } = id
    ? await supabase.from("releases").select("*").eq("id", id).maybeSingle()
    : await supabase.from("releases").select("*").eq("slug", resolvedReleaseSlug).maybeSingle();

  if (nextReleaseError) {
    throw new Error(nextReleaseError.message);
  }

  revalidatePath("/admin/releases");
  revalidatePath("/");
  revalidatePath("/music");
  revalidatePath("/releases");
  revalidatePath("/videos");
  revalidateSocialPublishingPaths();

  if (isPublishedInput && resolvedReleaseSlug) {
    await enqueueSeoUrl({
      url: absoluteUrl(`/music/${resolvedReleaseSlug}`),
      type: "release",
      service: supabase
    });
  }

  try {
    await maybeAutoQueueReleasePosts({
      service: supabase,
      previousRelease,
      nextRelease
    });
  } catch (socialError) {
    console.error("Release social publishing failed", socialError);
  }
}

export async function upsertEventAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();

  const sponsors = String(formData.get("sponsors") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const payload = {
    id: id || undefined,
    title: String(formData.get("title") ?? "").trim(),
    venue: String(formData.get("venue") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    country: String(formData.get("country") ?? "").trim(),
    starts_at: String(formData.get("startsAt") ?? "").trim(),
    stripe_price_id: String(formData.get("stripePriceId") ?? "").trim() || null,
    ticket_url: String(formData.get("ticketUrl") ?? "").trim() || null,
    sponsors,
    status: String(formData.get("status") ?? "upcoming").trim()
  };

  const { error } = await supabase.from("events").upsert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}

export async function upsertNewsAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const { data: previousNews } = id ? await supabase.from("news_posts").select("*").eq("id", id).maybeSingle() : { data: null as any };
  const contentStatusInput = String(formData.get("contentStatus") ?? "published").trim();
  const publishAtInput = String(formData.get("publishAt") ?? "").trim();

  const payloadForUpsert: Record<string, unknown> = {
    id: id || undefined,
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    category: String(formData.get("category") ?? "Press").trim(),
    hero_url: String(formData.get("heroUrl") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    published_at: String(formData.get("publishedAt") ?? new Date().toISOString().slice(0, 10)).trim(),
    content_status: contentStatusInput || "published",
    publish_at: publishAtInput ? new Date(publishAtInput).toISOString() : null
  };

  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase.from("news_posts").upsert(payloadForUpsert);
    error = result.error;

    if (!error) break;

    const missingColumn = String(error.message || "").match(/'([^']+)'/)?.[1];
    if (!missingColumn || !(missingColumn in payloadForUpsert)) break;
    delete payloadForUpsert[missingColumn];
  }

  if (error) {
    throw new Error(error.message);
  }

  const { data: nextNews, error: nextNewsError } = id
    ? await supabase.from("news_posts").select("*").eq("id", id).maybeSingle()
    : await supabase.from("news_posts").select("*").eq("slug", String(formData.get("slug") ?? "").trim()).maybeSingle();

  if (nextNewsError) {
    throw new Error(nextNewsError.message);
  }

  revalidatePath("/admin/news");
  revalidatePath("/press");
  revalidatePath("/news");
  revalidatePath("/");
  revalidateSocialPublishingPaths();

  try {
    await maybeAutoQueueNewsPosts({
      service: supabase,
      previousNews,
      nextNews
    });
  } catch (socialError) {
    console.error("News social publishing failed", socialError);
  }
}

export async function updateDemoStatusAction(formData: FormData) {
  const supabase = await requireAdminClient();

  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "pending").trim();

  const { error } = await supabase.from("demo_submissions").update({ status }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/demos");
}

export async function updateNextUpSubmissionStatusAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const makeCompetitor = String(formData.get("makeCompetitor") ?? "") === "true";

  if (!id || !["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid submission update.");
  }

  const { data: submission, error: submissionError } = await supabase.from("next_up_submissions").select("*").eq("id", id).maybeSingle();
  if (submissionError || !submission) {
    throw new Error(submissionError?.message ?? "Submission not found.");
  }

  const { error } = await supabase.from("next_up_submissions").update({ status }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  if (status === "approved" && makeCompetitor) {
    const { data: existingCompetitor } = await supabase
      .from("next_up_competitors")
      .select("id")
      .eq("submission_id", submission.id)
      .maybeSingle();

    if (existingCompetitor?.id) {
      const { error: competitorUpdateError } = await supabase
        .from("next_up_competitors")
        .update({
          stage_name: submission.stage_name,
          city: submission.city,
          demo_url: submission.demo_url,
          social_links: submission.social_links ?? null,
          artist_bio: submission.artist_bio ?? null,
          status: "approved"
        })
        .eq("id", existingCompetitor.id);

      if (competitorUpdateError) {
        throw new Error(competitorUpdateError.message);
      }
    } else {
      const { error: competitorInsertError } = await supabase.from("next_up_competitors").insert({
        submission_id: submission.id,
        stage_name: submission.stage_name,
        city: submission.city,
        demo_url: submission.demo_url,
        social_links: submission.social_links ?? null,
        artist_bio: submission.artist_bio ?? null,
        status: "approved"
      });

      if (competitorInsertError) {
        throw new Error(competitorInsertError.message);
      }
    }
  }

  if (status === "rejected" || status === "pending") {
    await supabase.from("next_up_competitors").update({ status: "hidden" }).eq("submission_id", submission.id);
  }

  revalidatePath("/admin/next-up");
  revalidatePath("/killeen-next-up");
}

export async function upsertNextUpCompetitorAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const photoFileValue = formData.get("photoFile");
  const photoFile = photoFileValue instanceof File && photoFileValue.size > 0 ? photoFileValue : null;
  const photoUrlInput = String(formData.get("photoUrl") ?? "").trim();
  const uploadedPhotoUrl = await uploadFileToBucket(supabase, photoFile, "next-up-media", "killeen-next-up/photos");

  const payloadForUpsert: Record<string, unknown> = {
    id: id || undefined,
    stage_name: String(formData.get("stageName") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    demo_url: String(formData.get("demoUrl") ?? "").trim(),
    photo_url: uploadedPhotoUrl ?? (photoUrlInput || null),
    social_links: String(formData.get("socialLinks") ?? "").trim() || null,
    artist_bio: String(formData.get("artistBio") ?? "").trim() || null,
    status: String(formData.get("status") ?? "approved").trim() || "approved",
    is_winner: String(formData.get("isWinner") ?? "") === "on"
  };

  if (payloadForUpsert.is_winner) {
    await supabase.from("next_up_competitors").update({ is_winner: false }).eq("is_winner", true);
  }

  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await supabase.from("next_up_competitors").upsert(payloadForUpsert);
    error = result.error;

    if (!error) break;

    const missingColumn = String(error.message || "").match(/'([^']+)'/)?.[1];
    if (!missingColumn || !(missingColumn in payloadForUpsert)) break;
    delete payloadForUpsert[missingColumn];
  }

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/next-up");
  revalidatePath("/killeen-next-up");
}

export async function resetNextUpVotesAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const competitorId = String(formData.get("competitorId") ?? "").trim();

  if (competitorId) {
    await supabase.from("next_up_votes").delete().eq("competitor_id", competitorId);
  } else {
    await supabase.from("next_up_votes").delete().neq("id", "");
  }

  revalidatePath("/admin/next-up");
  revalidatePath("/killeen-next-up");
}

export async function announceNextUpWinnerAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const competitorId = String(formData.get("competitorId") ?? "").trim();

  if (!competitorId) {
    throw new Error("Missing competitor id.");
  }

  await supabase.from("next_up_competitors").update({ is_winner: false }).eq("is_winner", true);
  const { error } = await supabase.from("next_up_competitors").update({ is_winner: true, status: "approved" }).eq("id", competitorId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/next-up");
  revalidatePath("/killeen-next-up");
}

export async function updateNextUpSettingsAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const hasLiveFinalInput = formData.has("liveFinalAt");
  const hasVotingEnabledInput = formData.has("votingEnabled");
  const hasVotingStartsAtInput = formData.has("votingStartsAt");
  const hasVotingEndsAtInput = formData.has("votingEndsAt");
  const liveFinalAtInput = String(formData.get("liveFinalAt") ?? "").trim();
  const votingStartsAtInput = String(formData.get("votingStartsAt") ?? "").trim();
  const votingEndsAtInput = String(formData.get("votingEndsAt") ?? "").trim();
  const votingEnabledInputs = formData
    .getAll("votingEnabled")
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);

  const { data: currentSettings } = await supabase
    .from("next_up_settings")
    .select("live_final_at, voting_enabled, voting_starts_at, voting_ends_at")
    .eq("id", "default")
    .maybeSingle();

  let liveFinalAt: string | null = currentSettings?.live_final_at ?? null;
  let votingEnabled: boolean = Boolean(currentSettings?.voting_enabled ?? false);
  let votingStartsAt: string | null = currentSettings?.voting_starts_at ?? null;
  let votingEndsAt: string | null = currentSettings?.voting_ends_at ?? null;

  if (hasLiveFinalInput) {
    if (!liveFinalAtInput) {
      liveFinalAt = null;
    } else {
      const timestamp = Date.parse(liveFinalAtInput);
      if (Number.isNaN(timestamp)) {
        throw new Error("Invalid live final date.");
      }
      liveFinalAt = new Date(timestamp).toISOString();
    }
  }

  if (hasVotingEnabledInput) {
    votingEnabled = votingEnabledInputs.includes("on") || votingEnabledInputs.includes("true") || votingEnabledInputs.includes("1");
  }

  if (hasVotingStartsAtInput) {
    if (!votingStartsAtInput) {
      votingStartsAt = null;
    } else {
      const timestamp = Date.parse(votingStartsAtInput);
      if (Number.isNaN(timestamp)) {
        throw new Error("Invalid voting start date.");
      }
      votingStartsAt = new Date(timestamp).toISOString();
    }
  }

  if (hasVotingEndsAtInput) {
    if (!votingEndsAtInput) {
      votingEndsAt = null;
    } else {
      const timestamp = Date.parse(votingEndsAtInput);
      if (Number.isNaN(timestamp)) {
        throw new Error("Invalid voting end date.");
      }
      votingEndsAt = new Date(timestamp).toISOString();
    }
  }

  const payloadForUpsert: Record<string, unknown> = {
    id: "default",
    live_final_at: liveFinalAt,
    voting_enabled: votingEnabled,
    voting_starts_at: votingStartsAt,
    voting_ends_at: votingEndsAt
  };

  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await supabase.from("next_up_settings").upsert(payloadForUpsert, { onConflict: "id", ignoreDuplicates: false });
    error = result.error;
    if (!error) break;
    const missingColumn = String(error.message || "").match(/'([^']+)'/)?.[1];
    if (!missingColumn || !(missingColumn in payloadForUpsert)) break;
    delete payloadForUpsert[missingColumn];
  }

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/next-up");
  revalidatePath("/killeen-next-up");
}

export async function upsertSocialLinkAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const sortOrderInput = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = String(formData.get("isActive") ?? "") === "on";

  if (!label || !url) {
    throw new Error("Label and URL are required.");
  }

  const payloadForUpsert: Record<string, unknown> = {
    id: id || undefined,
    label,
    url,
    sort_order: Number.isFinite(sortOrderInput) ? sortOrderInput : 0,
    is_active: isActive
  };

  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase.from("social_links").upsert(payloadForUpsert);
    error = result.error;

    if (!error) break;

    const missingColumn = String(error.message || "").match(/'([^']+)'/)?.[1];
    if (!missingColumn || !(missingColumn in payloadForUpsert)) break;
    delete payloadForUpsert[missingColumn];
  }

  if (error) {
    throw new Error(error.message);
  }

  revalidateSocialLinkPaths();
}

export async function deleteSocialLinkAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Missing social link id.");
  }

  const { error } = await supabase.from("social_links").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateSocialLinkPaths();
}

export async function upsertSocialPublishingSettingsAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const payload = {
    id: "default",
    facebook_enabled: String(formData.get("facebookEnabled") ?? "") === "on",
    instagram_enabled: String(formData.get("instagramEnabled") ?? "") === "on",
    auto_release_facebook: String(formData.get("autoReleaseFacebook") ?? "") === "on",
    auto_release_instagram: String(formData.get("autoReleaseInstagram") ?? "") === "on",
    auto_artist_facebook: String(formData.get("autoArtistFacebook") ?? "") === "on",
    auto_artist_instagram: String(formData.get("autoArtistInstagram") ?? "") === "on",
    auto_video_facebook: String(formData.get("autoVideoFacebook") ?? "") === "on",
    auto_video_instagram: String(formData.get("autoVideoInstagram") ?? "") === "on",
    auto_news_facebook: String(formData.get("autoNewsFacebook") ?? "") === "on",
    auto_news_instagram: String(formData.get("autoNewsInstagram") ?? "") === "on",
    random_bundle_size: Math.min(Math.max(Number.parseInt(String(formData.get("randomBundleSize") ?? "3"), 10) || 3, 1), 6),
    release_template: String(formData.get("releaseTemplate") ?? "").trim(),
    artist_template: String(formData.get("artistTemplate") ?? "").trim(),
    video_template: String(formData.get("videoTemplate") ?? "").trim(),
    news_template: String(formData.get("newsTemplate") ?? "").trim(),
    random_template: String(formData.get("randomTemplate") ?? "").trim()
  };

  const { error } = await supabase.from("social_publish_settings").upsert(payload);
  if (error) {
    throw new Error(error.message);
  }

  revalidateSocialPublishingPaths();
}

export async function publishSocialPostAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const preset = String(formData.get("preset") ?? "custom").trim() as
    | "custom"
    | "random_releases"
    | "latest_release"
    | "latest_video"
    | "latest_artist"
    | "latest_news";
  const rawLinks = String(formData.get("linkUrls") ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  await publishManualSocialPosts(supabase, {
    preset,
    title: String(formData.get("title") ?? "").trim() || null,
    message: String(formData.get("message") ?? "").trim(),
    mediaUrl: String(formData.get("mediaUrl") ?? "").trim() || null,
    linkUrls: rawLinks,
    itemCount: Math.min(Math.max(Number.parseInt(String(formData.get("itemCount") ?? "3"), 10) || 3, 1), 6),
    postToFacebook: String(formData.get("postToFacebook") ?? "") === "on",
    postToInstagram: String(formData.get("postToInstagram") ?? "") === "on"
  });

  revalidateSocialPublishingPaths();
}

export async function processSocialQueueAction() {
  await requireAdminClient();
  await processSocialPublishingQueue({ limit: 20 });
  revalidateSocialPublishingPaths();
}

export async function retrySocialPostAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const jobId = String(formData.get("jobId") ?? "").trim();
  if (!jobId) {
    throw new Error("Missing social job id.");
  }

  await dispatchSocialJobById(supabase, jobId);
  revalidateSocialPublishingPaths();
}

export async function updateFanWallEntryStatusAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const isVerified = String(formData.get("isVerified") ?? "") === "on";

  if (!id) {
    throw new Error("Missing fan wall entry id.");
  }

  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid fan wall status.");
  }

  let payload: Record<string, unknown> = { status, is_verified: isVerified };
  let { data, error } = await supabase.from("fan_wall_entries").update(payload).eq("id", id).select("artist_slug").maybeSingle();

  if (error && String(error.message).includes("is_verified")) {
    payload = { status };
    ({ data, error } = await supabase.from("fan_wall_entries").update(payload).eq("id", id).select("artist_slug").maybeSingle());
  }

  if (error) {
    throw new Error(error.message);
  }

  const artistSlug = data?.artist_slug ? String(data.artist_slug) : "";
  if (artistSlug) {
    revalidatePath(`/artists/${artistSlug}`);
  }
  revalidatePath("/admin/fan-wall");
}

export async function updateBookingInquiryStatusAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!id) {
    throw new Error("Missing booking inquiry id.");
  }

  if (!["new", "contacted", "negotiating", "confirmed", "closed"].includes(status)) {
    throw new Error("Invalid booking inquiry status.");
  }

  const { error } = await supabase.from("booking_inquiries").update({ status }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/booking-inquiries");
}
