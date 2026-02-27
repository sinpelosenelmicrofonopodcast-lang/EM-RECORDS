"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashEpkPassword } from "@/lib/epk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { normalizeAppleMusicEmbedUrl, normalizeSpotifyEmbedUrl, normalizeYouTubeEmbedUrl } from "@/lib/utils";

async function requireAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized.");
  }

  let isAdmin = user.user_metadata?.role === "admin";

  if (!isAdmin) {
    const { data: profile, error: profileError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    isAdmin = !profileError && Boolean(profile?.is_admin);
  }

  if (!isAdmin) {
    throw new Error("Forbidden.");
  }

  // Admin actions write through service role to avoid RLS friction on protected tables.
  // Authorization is enforced above with authenticated user + admin role check.
  try {
    const service = createServiceClient();
    await service.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.label ?? "EM Records Admin",
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
    epk_enabled: epkEnabledInput
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

  revalidatePath("/admin/artists");
  revalidatePath("/artists");
}

export async function upsertReleaseAction(formData: FormData) {
  const supabase = await requireAdminClient();
  const id = String(formData.get("id") ?? "").trim();
  const spotifyEmbedInput = String(formData.get("spotifyEmbed") ?? "").trim();
  const appleEmbedInput = String(formData.get("appleEmbed") ?? "").trim();
  const youtubeEmbedInput = String(formData.get("youtubeEmbed") ?? "").trim();
  const contentStatusInput = String(formData.get("contentStatus") ?? "published").trim();
  const publishAtInput = String(formData.get("publishAt") ?? "").trim();

  const payloadForUpsert: Record<string, unknown> = {
    id: id || undefined,
    title: String(formData.get("title") ?? "").trim(),
    format: String(formData.get("format") ?? "Single").trim(),
    cover_url: String(formData.get("coverUrl") ?? "").trim(),
    release_date: String(formData.get("releaseDate") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    spotify_embed: spotifyEmbedInput ? normalizeSpotifyEmbedUrl(spotifyEmbedInput) : null,
    apple_embed: appleEmbedInput ? normalizeAppleMusicEmbedUrl(appleEmbedInput) : null,
    youtube_embed: youtubeEmbedInput ? normalizeYouTubeEmbedUrl(youtubeEmbedInput) : null,
    content_status: contentStatusInput || "published",
    publish_at: publishAtInput ? new Date(publishAtInput).toISOString() : null,
    featured: String(formData.get("featured") ?? "") === "on"
  };

  if (payloadForUpsert.featured) {
    await supabase.from("releases").update({ featured: false }).eq("featured", true);
  }

  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase.from("releases").upsert(payloadForUpsert);
    error = result.error;

    if (!error) break;

    const missingColumn = String(error.message || "").match(/'([^']+)'/)?.[1];
    if (!missingColumn || !(missingColumn in payloadForUpsert)) break;
    delete payloadForUpsert[missingColumn];
  }

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/releases");
  revalidatePath("/");
  revalidatePath("/releases");
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

  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
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
