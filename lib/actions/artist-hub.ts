"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getHubUserContext } from "@/lib/artist-hub/auth";
import { syncLightroomAlbum } from "@/lib/artist-hub/lightroom";
import { calculateReadyScore } from "@/lib/artist-hub/ready-score";
import { buildArtistReportPdf, buildMediaKitPdf } from "@/lib/artist-hub/pdf";
import {
  getArtistByIdForContext,
  getArtistBySlugForContext,
  getMediaKitByArtistId,
  hasArtistAccess,
  insertAuditLog,
  normalizeExternalAssetUrl,
  roleForArtist,
  toStorageUrl,
  resolveMaybeSignedUrl,
  smartlinkUrl
} from "@/lib/artist-hub/service";
import { createServiceClient } from "@/lib/supabase/service";

function toArrayFromCsv(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

const HUB_ASSIGNABLE_ROLES = new Set(["artist", "manager", "booking", "staff", "admin"]);

function redirectAdminHub(status: "success" | "error", message: string): never {
  redirect(`/dashboard/admin/artist-hub?status=${encodeURIComponent(status)}&message=${encodeURIComponent(message)}`);
}

async function findAuthUserByEmail(service: ReturnType<typeof createServiceClient>, email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) return { user: null, error };

    const found = (data?.users ?? []).find((user) => (user.email ?? "").toLowerCase() === email);
    if (found) return { user: found, error: null };

    if ((data?.users ?? []).length < perPage) break;
    page += 1;
  }

  return { user: null, error: null };
}

async function requireHubActionContext(artistId?: string) {
  const ctx = await getHubUserContext();
  if (!ctx) {
    redirect("/admin/login");
  }

  if (artistId && !hasArtistAccess(ctx, artistId)) {
    throw new Error("Forbidden");
  }

  return { ctx, service: createServiceClient() };
}

export async function createHubArtistAction(formData: FormData) {
  const { ctx, service } = await requireHubActionContext();
  if (!ctx.isAdmin) {
    throw new Error("Only admin can create artists.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const stageName = String(formData.get("stageName") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!name) throw new Error("Artist name is required.");

  const slug = (slugInput || stageName || name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);

  const { data, error } = await service
    .from("artists")
    .insert({
      name,
      slug,
      stage_name: stageName || null,
      tagline: String(formData.get("tagline") ?? "EM Records Artist").trim(),
      bio: String(formData.get("bio") ?? "").trim(),
      bio_short: String(formData.get("bioShort") ?? "").trim() || null,
      bio_med: String(formData.get("bioMed") ?? "").trim() || null,
      bio_long: String(formData.get("bioLong") ?? "").trim() || null,
      hero_media_url: String(formData.get("heroMediaUrl") ?? "").trim(),
      avatar_url: String(formData.get("avatarUrl") ?? "").trim(),
      booking_email: String(formData.get("bookingEmail") ?? "booking@emrecordsmusic.com").trim(),
      status: "active"
    })
    .select("id,slug")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create artist.");
  }

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId: String(data.id),
    action: "create_artist",
    entityType: "artist",
    entityId: String(data.id),
    details: { slug: data.slug }
  }).catch(() => undefined);

  revalidatePath("/dashboard/artist-hub");
  revalidatePath("/dashboard/admin/artist-hub");
}

export async function assignArtistMemberAction(formData: FormData) {
  const { ctx, service } = await requireHubActionContext();
  if (!ctx.isAdmin) {
    redirectAdminHub("error", "Solo el administrador puede asignar roles.");
  }

  const artistId = String(formData.get("artistId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "artist").trim();

  if (!artistId || !email) {
    redirectAdminHub("error", "Debes seleccionar artista y correo.");
  }

  if (!HUB_ASSIGNABLE_ROLES.has(role)) {
    redirectAdminHub("error", "Rol inválido.");
  }

  const { data: profileUser, error: profileUserError } = await service
    .from("profiles")
    .select("id,email,full_name")
    .eq("email", email)
    .maybeSingle();

  if (profileUserError) {
    redirectAdminHub("error", `No se pudo buscar perfil: ${profileUserError.message}`);
  }

  let userId = profileUser?.id ?? null;

  if (!userId) {
    const { user: authUser, error: authLookupError } = await findAuthUserByEmail(service, email);
    if (authLookupError) {
      redirectAdminHub("error", `No se pudo validar el usuario en Auth: ${authLookupError.message}`);
    }

    if (!authUser?.id) {
      redirectAdminHub("error", "Usuario no encontrado. Debe iniciar sesión al menos una vez.");
    }

    userId = authUser.id;
    const { error: profileUpsertError } = await service.from("profiles").upsert(
      {
        id: authUser.id,
        email: authUser.email ?? email,
        full_name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null
      },
      { onConflict: "id" }
    );

    if (profileUpsertError) {
      redirectAdminHub("error", `No se pudo crear perfil automáticamente: ${profileUpsertError.message}`);
    }
  }

  const { error } = await service.from("artist_members").upsert(
    {
      artist_id: artistId,
      user_id: userId,
      role
    },
    { onConflict: "artist_id,user_id,role" }
  );

  if (error) {
    redirectAdminHub("error", `No se pudo asignar rol: ${error.message}`);
  }

  if (role === "admin") {
    const { error: globalRoleError } = await service.from("user_roles").upsert(
      {
        user_id: userId,
        role: "admin"
      },
      { onConflict: "user_id,role" }
    );

    if (globalRoleError) {
      redirectAdminHub("error", `Se asignó membresía, pero falló rol global admin: ${globalRoleError.message}`);
    }
  }

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "assign_artist_member",
    entityType: "artist_member",
    details: { userId, role }
  }).catch(() => undefined);

  revalidatePath("/dashboard/admin/artist-hub");
  revalidatePath("/dashboard/artist-hub");
  redirectAdminHub("success", "Rol asignado correctamente.");
}

export async function upsertSongHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const id = String(formData.get("id") ?? "").trim();
  const releaseId = String(formData.get("releaseId") ?? "").trim() || null;

  const payload = {
    artist_id: artistId,
    release_id: releaseId,
    title: String(formData.get("title") ?? "").trim(),
    isrc: String(formData.get("isrc") ?? "").trim() || null,
    iswc: String(formData.get("iswc") ?? "").trim() || null,
    explicit: String(formData.get("explicit") ?? "") === "on",
    language: String(formData.get("language") ?? "").trim() || null,
    bpm: Number(formData.get("bpm") ?? 0) || null,
    key: String(formData.get("key") ?? "").trim() || null,
    links: {
      spotify: String(formData.get("spotify") ?? "").trim() || null,
      apple: String(formData.get("apple") ?? "").trim() || null,
      youtube: String(formData.get("youtube") ?? "").trim() || null,
      tiktok: String(formData.get("tiktok") ?? "").trim() || null
    }
  };

  if (!payload.title) throw new Error("Song title is required.");

  if (id) {
    const { error } = await service.from("songs").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await service.from("songs").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/artist-hub`);
}

export async function upsertRegistrationHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const songId = String(formData.get("songId") ?? "").trim();
  const org = String(formData.get("org") ?? "").trim();
  const { service } = await requireHubActionContext(artistId);

  const { error } = await service.from("registrations").upsert(
    {
      song_id: songId,
      org,
      status: String(formData.get("status") ?? "pending").trim(),
      ref_number: String(formData.get("refNumber") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      last_update: new Date().toISOString()
    },
    { onConflict: "song_id,org" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/artist-hub`);
}

export async function upsertLaunchChecklistAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const songId = String(formData.get("songId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const itemInput = {
    isrc: String(formData.get("isrc") ?? "").trim() || null,
    iswc: String(formData.get("iswc") ?? "").trim() || null,
    masterSplitsConfirmed: String(formData.get("masterSplits") ?? "") === "on",
    publishingSplitsConfirmed: String(formData.get("publishingSplits") ?? "") === "on",
    coverArt: String(formData.get("coverArt") ?? "") === "on",
    releaseDate: String(formData.get("releaseDate") ?? "").trim() || null,
    mediaKitReady: String(formData.get("mediaKitReady") ?? "") === "on",
    smartlinkReady: String(formData.get("smartlinkReady") ?? "") === "on",
    bmiStatus: String(formData.get("bmiStatus") ?? "").trim() || null,
    mlcStatus: String(formData.get("mlcStatus") ?? "").trim() || null,
    songtrustStatus: String(formData.get("songtrustStatus") ?? "").trim() || null,
    soundexchangeStatus: String(formData.get("soundexchangeStatus") ?? "").trim() || null,
    distrokidStatus: String(formData.get("distrokidStatus") ?? "").trim() || null,
    contentIdStatus: String(formData.get("contentIdStatus") ?? "").trim() || null
  };

  const readyScore = calculateReadyScore(itemInput);

  const { data: existing } = await service.from("launch_checklists").select("id").eq("song_id", songId).maybeSingle();
  if (existing?.id) {
    const { error } = await service
      .from("launch_checklists")
      .update({
        items: itemInput,
        ready_score: readyScore,
        status: String(formData.get("status") ?? "in_progress"),
        notes: String(formData.get("notes") ?? "").trim() || null,
        due_date: String(formData.get("dueDate") ?? "").trim() || null,
        owner_user_id: ctx.user.id
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await service.from("launch_checklists").insert({
      song_id: songId,
      items: itemInput,
      ready_score: readyScore,
      status: String(formData.get("status") ?? "in_progress"),
      notes: String(formData.get("notes") ?? "").trim() || null,
      due_date: String(formData.get("dueDate") ?? "").trim() || null,
      owner_user_id: ctx.user.id
    });
    if (error) throw new Error(error.message);
  }

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "update_launch_checklist",
    entityType: "launch_checklist",
    details: { songId, readyScore }
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function generateSmartlinkHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const releaseId = String(formData.get("releaseId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const { data: release, error: releaseError } = await service.from("releases").select("id,title,artist_id").eq("id", releaseId).maybeSingle();
  if (releaseError || !release) throw new Error("Release not found.");
  if (String(release.artist_id ?? "") !== artistId) throw new Error("Release is not linked to this artist.");

  let baseSlug = slugify(String(formData.get("slug") ?? "").trim() || release.title || `release-${releaseId.slice(0, 8)}`);
  if (!baseSlug) baseSlug = `release-${releaseId.slice(0, 8)}`;

  let slug = baseSlug;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data: existing } = await service.from("smartlinks").select("id,release_id").eq("slug", slug).maybeSingle();
    if (!existing || existing.release_id === releaseId) {
      break;
    }
    slug = `${baseSlug}-${Math.floor(Math.random() * 9999)}`;
  }

  const links = {
    spotify: String(formData.get("spotifyLink") ?? "").trim() || null,
    apple: String(formData.get("appleLink") ?? "").trim() || null,
    youtube: String(formData.get("youtubeLink") ?? "").trim() || null,
    tiktok: String(formData.get("tiktokLink") ?? "").trim() || null
  };
  const presave = {
    enabled: String(formData.get("presaveEnabled") ?? "") === "on",
    url: String(formData.get("presaveUrl") ?? "").trim() || null
  };

  const linkUrl = smartlinkUrl(slug);
  const qrDataUrl = await QRCode.toDataURL(linkUrl, {
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#C6A85B",
      light: "#000000"
    }
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");
  const qrPath = `${artistId}/releases/${releaseId}/qr-${slug}.png`;

  const { error: uploadError } = await service.storage.from("artist-hub-assets").upload(qrPath, qrBuffer, {
    contentType: "image/png",
    upsert: true
  });
  if (uploadError) throw new Error(uploadError.message);

  const storageUrl = toStorageUrl("artist-hub-assets", qrPath);

  const { data: qrAsset, error: qrError } = await service
    .from("media_assets")
    .insert({
      artist_id: artistId,
      release_id: releaseId,
      type: "qr",
      source: "generated",
      source_id: slug,
      url: storageUrl,
      metadata: { smartlinkSlug: slug }
    })
    .select("id")
    .single();
  if (qrError || !qrAsset) throw new Error(qrError?.message ?? "Could not save QR asset.");

  const { error: smartlinkError } = await service.from("smartlinks").upsert(
    {
      release_id: releaseId,
      slug,
      links,
      presave,
      qr_asset_id: qrAsset.id
    },
    { onConflict: "release_id" }
  );
  if (smartlinkError) throw new Error(smartlinkError.message);

  await service.from("releases").update({ smartlink_slug: slug }).eq("id", releaseId);

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "generate_smartlink",
    entityType: "smartlink",
    entityId: releaseId,
    details: { slug, url: linkUrl }
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function upsertMediaKitHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const highlights = toArrayFromCsv(String(formData.get("highlights") ?? ""));
  const pressQuotes = toArrayFromCsv(String(formData.get("pressQuotes") ?? ""));
  const featuredTracks = toArrayFromCsv(String(formData.get("featuredTracks") ?? ""));

  const { data: existing } = await service.from("media_kits").select("id").eq("artist_id", artistId).maybeSingle();

  const payload = {
    artist_id: artistId,
    headline: String(formData.get("headline") ?? "").trim() || null,
    one_liner: String(formData.get("oneLiner") ?? "").trim() || null,
    highlights,
    press_quotes: pressQuotes,
    featured_tracks: featuredTracks,
    contacts: {
      manager: String(formData.get("manager") ?? "").trim() || null,
      booking: String(formData.get("booking") ?? "").trim() || null,
      press: String(formData.get("press") ?? "").trim() || null
    },
    stats: {
      monthly_listeners: String(formData.get("monthlyListeners") ?? "").trim() || null,
      top_market: String(formData.get("topMarket") ?? "").trim() || null,
      followers: String(formData.get("followers") ?? "").trim() || null
    }
  };

  if (existing?.id) {
    const { error } = await service.from("media_kits").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await service.from("media_kits").insert(payload);
    if (error) throw new Error(error.message);
  }

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "update_media_kit",
    entityType: "media_kit",
    details: {}
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function uploadMediaAssetHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const fileValue = formData.get("file");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const fallbackUrl = String(formData.get("url") ?? "").trim();
  const type = String(formData.get("type") ?? "photo").trim();

  let storageUrl = normalizeExternalAssetUrl(fallbackUrl);

  if (file) {
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${artistId}/assets/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    const { error: uploadError } = await service.storage.from("artist-hub-assets").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) throw new Error(uploadError.message);
    storageUrl = toStorageUrl("artist-hub-assets", path);
  }

  if (!storageUrl) {
    throw new Error("Provide a file or URL.");
  }

  const { error } = await service.from("media_assets").insert({
    artist_id: artistId,
    type,
    source: file ? "upload" : "generated",
    url: storageUrl,
    metadata: {
      label: String(formData.get("label") ?? "").trim() || null,
      includeInPdf: String(formData.get("includeInPdf") ?? "") === "on"
    }
  });

  if (error) throw new Error(error.message);

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "upload_media_asset",
    entityType: "media_asset",
    details: { type }
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function uploadDocumentHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const fileValue = formData.get("file");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const fallbackUrl = String(formData.get("url") ?? "").trim();
  const type = String(formData.get("type") ?? "other").trim();

  let storageUrl = fallbackUrl || null;

  if (file) {
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${artistId}/documents/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
    const { error: uploadError } = await service.storage.from("artist-hub-assets").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) throw new Error(uploadError.message);
    storageUrl = toStorageUrl("artist-hub-assets", path);
  }

  if (!storageUrl) throw new Error("Provide a file or URL.");

  const { data: latest } = await service
    .from("documents")
    .select("version")
    .eq("artist_id", artistId)
    .eq("type", type)
    .is("deleted_at", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = Number(latest?.version ?? 0) + 1;

  const visibility = {
    admin: true,
    manager: true,
    booking: type === "invoice" || type === "license" || type === "epk" || type === "other",
    artist: type === "splitsheet" || type === "epk" || type === "other",
    staff: type === "epk" || type === "other"
  };

  const { error } = await service.from("documents").insert({
    artist_id: artistId,
    type,
    url: storageUrl,
    version: nextVersion,
    status: String(formData.get("status") ?? "pending").trim(),
    visibility,
    created_by: ctx.user.id
  });

  if (error) throw new Error(error.message);

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "upload_document",
    entityType: "document",
    details: { type, version: nextVersion }
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function updateDocumentAclAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);
  if (!ctx.isAdmin) throw new Error("Only admin can edit document ACL.");

  const documentType = String(formData.get("documentType") ?? "other");

  const { error } = await service
    .from("artist_document_acl")
    .update({
      allow_artist: String(formData.get("allowArtist") ?? "") === "on",
      allow_manager: String(formData.get("allowManager") ?? "") === "on",
      allow_booking: String(formData.get("allowBooking") ?? "") === "on",
      allow_staff: String(formData.get("allowStaff") ?? "") === "on"
    })
    .eq("artist_id", artistId)
    .eq("document_type", documentType);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/artist-hub`);
  revalidatePath(`/dashboard/admin/artist-hub`);
}

export async function createBookingHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const { error } = await service.from("booking_requests").insert({
    artist_id: artistId,
    requester_name: String(formData.get("requesterName") ?? "").trim() || null,
    requester_email: String(formData.get("requesterEmail") ?? "").trim() || null,
    event_name: String(formData.get("eventName") ?? "").trim() || null,
    event_location: String(formData.get("eventLocation") ?? "").trim() || null,
    event_date: String(formData.get("eventDate") ?? "").trim() || null,
    budget: Number(formData.get("budget") ?? 0) || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: "new",
    created_by: ctx.user.id,
    updated_by: ctx.user.id
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function updateBookingStatusHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "new").trim();
  const { ctx, service } = await requireHubActionContext(artistId);
  const role = roleForArtist(ctx, artistId);
  if (!(ctx.isAdmin || role === "manager" || role === "booking")) {
    throw new Error("Only manager/booking/admin can change booking status.");
  }

  const { error } = await service.from("booking_requests").update({ status, updated_by: ctx.user.id }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function createContentHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const { error } = await service.from("content_items").insert({
    artist_id: artistId,
    type: String(formData.get("type") ?? "post"),
    caption: String(formData.get("caption") ?? "").trim() || null,
    assets: [
      {
        url: String(formData.get("assetUrl") ?? "").trim() || null,
        label: String(formData.get("assetLabel") ?? "").trim() || null
      }
    ].filter((item) => item.url),
    scheduled_at: String(formData.get("scheduledAt") ?? "").trim() || null,
    status: String(formData.get("status") ?? "draft").trim(),
    submitted_by: ctx.user.id,
    approvals: []
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/artist-hub`);
}

export async function updateContentStatusHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "submitted").trim();
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const { ctx, service } = await requireHubActionContext(artistId);
  const role = roleForArtist(ctx, artistId);

  if (["approved", "scheduled", "published", "rejected"].includes(status) && !(ctx.isAdmin || role === "manager" || role === "booking")) {
    throw new Error("Only manager/booking/admin can approve or reject.");
  }

  const { data: existing } = await service.from("content_items").select("approvals").eq("id", id).maybeSingle();
  const approvals = Array.isArray(existing?.approvals) ? [...existing.approvals] : [];
  approvals.push({
    at: new Date().toISOString(),
    by: ctx.user.id,
    status,
    comment
  });

  const { error } = await service
    .from("content_items")
    .update({
      status,
      approved_by: ctx.user.id,
      approvals
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/artist-hub`);
}

export async function createPrHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const { error } = await service.from("pr_requests").insert({
    artist_id: artistId,
    outlet: String(formData.get("outlet") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim() || null,
    requested_at: String(formData.get("requestedAt") ?? "").trim() || null,
    topic: String(formData.get("topic") ?? "").trim() || null,
    status: "new",
    notes: String(formData.get("notes") ?? "").trim() || null,
    attachments: [
      {
        url: String(formData.get("attachmentUrl") ?? "").trim() || null
      }
    ].filter((item) => item.url),
    created_by: ctx.user.id
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/artist-hub`);
}

export async function updatePrStatusHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "in_review").trim();

  const { ctx, service } = await requireHubActionContext(artistId);
  const role = roleForArtist(ctx, artistId);

  if (!(ctx.isAdmin || role === "manager" || role === "booking")) {
    throw new Error("Only manager/booking/admin can move PR status.");
  }

  const { error } = await service.from("pr_requests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function upsertSyncPackageHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const songId = String(formData.get("songId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const tags = {
    mood: String(formData.get("mood") ?? "").trim() || null,
    tempo: String(formData.get("tempo") ?? "").trim() || null,
    use_case: String(formData.get("useCase") ?? "").trim() || null,
    instrumentation: String(formData.get("instrumentation") ?? "").trim() || null,
    explicit: String(formData.get("explicit") ?? "") === "on" ? "explicit" : "clean",
    stems_available: String(formData.get("stemsAvailable") ?? "") === "on"
  };

  const link = String(formData.get("link") ?? "").trim() || smartlinkUrl(`sync-${songId.slice(0, 6)}-${Date.now().toString().slice(-5)}`);

  const { error } = await service.from("sync_packages").insert({
    song_id: songId,
    tags,
    link,
    expires_at: String(formData.get("expiresAt") ?? "").trim() || null,
    created_by: ctx.user.id
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/artist-hub`);
}

export async function updateBrandKitHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const brandKit = {
    primaryHex: String(formData.get("primaryHex") ?? "").trim() || null,
    secondaryHex: String(formData.get("secondaryHex") ?? "").trim() || null,
    accentHex: String(formData.get("accentHex") ?? "").trim() || null,
    fontPrimary: String(formData.get("fontPrimary") ?? "").trim() || null,
    fontSecondary: String(formData.get("fontSecondary") ?? "").trim() || null,
    voice: String(formData.get("voice") ?? "").trim() || null
  };

  const { error } = await service.from("artists").update({ brand_kit: brandKit }).eq("id", artistId);
  if (error) throw new Error(error.message);

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "update_brand_kit",
    entityType: "artist",
    entityId: artistId,
    details: brandKit
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function setFeatureFlagHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);
  if (!ctx.isAdmin) throw new Error("Only admin can update feature flags.");

  const key = String(formData.get("key") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "on";

  const { error } = await service.from("artist_hub_feature_flags").upsert(
    {
      artist_id: artistId,
      key,
      enabled
    },
    { onConflict: "artist_id,key" }
  );

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/artist-hub`);
}

export async function generateMediaKitPdfAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx, service } = await requireHubActionContext(artistId);

  const artist = await getArtistByIdForContext(ctx, artistId);
  if (!artist) throw new Error("Artist not found.");

  const [mediaKit, releasesRes, photosRes, docsRes] = await Promise.all([
    getMediaKitByArtistId(artistId),
    service.from("releases").select("id,title,release_date,artist_name,smartlink_slug").eq("artist_id", artistId).order("release_date", { ascending: false }).limit(3),
    service.from("media_assets").select("url,metadata").eq("artist_id", artistId).eq("type", "photo").order("created_at", { ascending: false }).limit(8),
    service.from("documents").select("version").eq("artist_id", artistId).eq("type", "epk").is("deleted_at", null).order("version", { ascending: false }).limit(1)
  ]);

  const topReleases = releasesRes.data ?? [];
  const smartlinkSlug = topReleases.find((row: any) => row.smartlink_slug)?.smartlink_slug ?? null;
  const smartlink = smartlinkSlug ? smartlinkUrl(String(smartlinkSlug)) : null;

  const selectedPhotos = (photosRes.data ?? [])
    .filter((row: any) => row.metadata?.includeInPdf !== false)
    .slice(0, 6)
    .map((row: any) => String(row.url));

  const resolvedPhotos = (await Promise.all(selectedPhotos.map(async (url) => (await resolveMaybeSignedUrl(url, 60 * 30)) ?? null))).filter(Boolean) as string[];

  const pdf = await buildMediaKitPdf({
    artistName: artist.name,
    stageName: artist.stageName,
    headline: mediaKit?.headline,
    oneLiner: mediaKit?.oneLiner,
    bioShort: artist.bioShort,
    bioMed: artist.bioMed,
    stats: mediaKit?.stats,
    links: artist.socialLinks,
    contacts: {
      ...(artist.contacts ?? {}),
      ...(mediaKit?.contacts ?? {})
    },
    featuredTracks: topReleases.map((release: any) => ({
      title: String(release.title),
      artist: release.artist_name ? String(release.artist_name) : artist.stageName ?? artist.name,
      date: release.release_date ? String(release.release_date) : null
    })),
    pressQuotes: mediaKit?.pressQuotes ?? [],
    highlights: mediaKit?.highlights ?? [],
    photoUrls: resolvedPhotos,
    smartlink
  });

  const currentVersion = Number(docsRes.data?.[0]?.version ?? 0);
  const version = currentVersion + 1;
  const filename = `${artist.slug}-media-kit-v${version}.pdf`;
  const path = `${artistId}/media-kit/${filename}`;

  const { error: uploadError } = await service.storage.from("artist-hub-pdfs").upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true
  });
  if (uploadError) throw new Error(uploadError.message);

  const storageUrl = toStorageUrl("artist-hub-pdfs", path);

  const { data: document, error: docError } = await service
    .from("documents")
    .insert({
      artist_id: artistId,
      type: "epk",
      url: storageUrl,
      version,
      status: "approved",
      visibility: { admin: true, manager: true, booking: true, artist: true, staff: true },
      created_by: ctx.user.id
    })
    .select("id")
    .single();

  if (docError) throw new Error(docError.message);

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "generate_media_kit_pdf",
    entityType: "document",
    entityId: String(document.id),
    details: { version, path }
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function generateMonthlyReportPdfAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim() || new Date().toISOString().slice(0, 7);
  const { ctx, service } = await requireHubActionContext(artistId);

  const artist = await getArtistByIdForContext(ctx, artistId);
  if (!artist) throw new Error("Artist not found.");

  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNum = Number(monthRaw);
  const start = new Date(Date.UTC(year, monthNum - 1, 1)).toISOString();
  const end = new Date(Date.UTC(year, monthNum, 1)).toISOString();

  const [songsRes, releasesRes, bookingsRes, tasksRes, regsRes, checklistRes, reportsRes, auditRes] = await Promise.all([
    service.from("songs").select("id,title").eq("artist_id", artistId),
    service.from("releases").select("id,title,release_date,smartlink_slug").eq("artist_id", artistId).gte("release_date", start.slice(0, 10)).lt("release_date", end.slice(0, 10)),
    service.from("booking_requests").select("status").eq("artist_id", artistId).gte("created_at", start).lt("created_at", end),
    service.from("artist_tasks").select("status").eq("artist_id", artistId),
    service.from("registrations").select("song_id,org,status"),
    service.from("launch_checklists").select("song_id,ready_score").gte("updated_at", start).lt("updated_at", end),
    service.from("reports").select("version").eq("artist_id", artistId).eq("month", month).order("version", { ascending: false }).limit(1),
    service
      .from("audit_log")
      .select("details")
      .eq("artist_id", artistId)
      .in("action", ["download_media_kit", "download_artist_report", "download_document"])
      .gte("created_at", start)
      .lt("created_at", end)
  ]);

  const songs = songsRes.data ?? [];
  const songById = new Map(songs.map((song: any) => [String(song.id), String(song.title)]));

  const registrations = (regsRes.data ?? [])
    .filter((row: any) => songById.has(String(row.song_id)))
    .slice(0, 20)
    .map((row: any) => ({
      song: songById.get(String(row.song_id)) ?? "Unknown",
      org: String(row.org),
      status: String(row.status)
    }));

  const bookingRows = bookingsRes.data ?? [];
  const bookingSummary = {
    total: bookingRows.length,
    confirmed: bookingRows.filter((row: any) => row.status === "confirmed" || row.status === "done").length,
    pipeline: bookingRows.filter((row: any) => ["new", "in_review", "negotiating"].includes(String(row.status))).length
  };

  const taskRows = tasksRes.data ?? [];
  const tasks = {
    done: taskRows.filter((row: any) => row.status === "done").length,
    pending: taskRows.filter((row: any) => row.status !== "done").length
  };

  const checklistRows = (checklistRes.data ?? []).filter((row: any) => row.song_id && songById.has(String(row.song_id)));
  const readyScoreAverage = checklistRows.length
    ? Math.round(checklistRows.reduce((sum: number, row: any) => sum + Number(row.ready_score ?? 0), 0) / checklistRows.length)
    : 0;

  const assetCounts = new Map<string, number>();
  for (const row of auditRes.data ?? []) {
    const label = String((row.details as any)?.label ?? (row.details as any)?.documentType ?? "Asset");
    assetCounts.set(label, (assetCounts.get(label) ?? 0) + 1);
  }

  const topAssets = [...assetCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, downloads]) => ({ label, downloads }));

  const smartlinks = (releasesRes.data ?? [])
    .filter((row: any) => row.smartlink_slug)
    .map((row: any) => ({
      title: String(row.title),
      url: smartlinkUrl(String(row.smartlink_slug))
    }));

  const pdf = await buildArtistReportPdf({
    artistName: artist.stageName || artist.name,
    month,
    releaseCount: (releasesRes.data ?? []).length,
    bookingSummary,
    tasks,
    registrations,
    readyScoreAverage,
    topAssets,
    smartlinks
  });

  const nextVersion = Number(reportsRes.data?.[0]?.version ?? 0) + 1;
  const filename = `${artist.slug}-artist-report-${month}-v${nextVersion}.pdf`;
  const path = `${artistId}/reports/${month}/${filename}`;

  const { error: uploadError } = await service.storage.from("artist-hub-pdfs").upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true
  });
  if (uploadError) throw new Error(uploadError.message);

  const storageUrl = toStorageUrl("artist-hub-pdfs", path);

  const { data: report, error: reportError } = await service
    .from("reports")
    .insert({
      artist_id: artistId,
      month,
      url: storageUrl,
      version: nextVersion,
      created_by: ctx.user.id
    })
    .select("id")
    .single();

  if (reportError || !report) throw new Error(reportError?.message ?? "Could not store report.");

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "generate_artist_report_pdf",
    entityType: "report",
    entityId: String(report.id),
    details: { month, version: nextVersion }
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}

export async function syncLightroomHubAction(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "").trim();
  const { ctx } = await requireHubActionContext(artistId);

  const result = await syncLightroomAlbum(artistId);

  await insertAuditLog({
    actorUserId: ctx.user.id,
    artistId,
    action: "lightroom_sync",
    entityType: "gallery",
    entityId: artistId,
    details: result
  }).catch(() => undefined);

  revalidatePath(`/dashboard/artist-hub`);
}
