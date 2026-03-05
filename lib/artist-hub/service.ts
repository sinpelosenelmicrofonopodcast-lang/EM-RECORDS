import { createServiceClient } from "@/lib/supabase/service";
import { absoluteUrl } from "@/lib/utils";
import type {
  HubArtist,
  HubAuditEvent,
  HubBooking,
  HubChecklist,
  HubContentItem,
  HubDocument,
  HubMediaAsset,
  HubMediaKit,
  HubMembership,
  HubPrRequest,
  HubRegistration,
  HubRelease,
  HubReport,
  HubRole,
  HubSong,
  HubSyncPackage,
  HubUserContext
} from "@/lib/artist-hub/types";

export const HUB_ROLE_PRIORITY: HubRole[] = ["admin", "manager", "booking", "artist", "staff"];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry));
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => entry as Record<string, unknown>);
}

export function hasArtistAccess(ctx: HubUserContext, artistId: string): boolean {
  if (ctx.isAdmin) return true;
  return ctx.memberships.some((member) => member.artistId === artistId);
}

export function roleForArtist(ctx: HubUserContext, artistId: string): HubRole | null {
  if (ctx.isAdmin) return "admin";
  for (const role of HUB_ROLE_PRIORITY) {
    if (ctx.memberships.some((member) => member.artistId === artistId && member.role === role)) {
      return role;
    }
  }
  return null;
}

export function canApproveContent(role: HubRole | null): boolean {
  return role === "admin" || role === "manager" || role === "booking";
}

export function canManageArtist(role: HubRole | null): boolean {
  return role === "admin" || role === "manager" || role === "booking";
}

function mapArtist(row: any): HubArtist {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    stageName: row.stage_name ? String(row.stage_name) : null,
    tagline: String(row.tagline ?? ""),
    status: String(row.status ?? "active"),
    bioShort: row.bio_short ? String(row.bio_short) : null,
    bioMed: row.bio_med ? String(row.bio_med) : null,
    bioLong: row.bio_long ? String(row.bio_long) : null,
    primaryGenre: row.primary_genre ? String(row.primary_genre) : null,
    territory: row.territory ? String(row.territory) : null,
    contacts: asRecord(row.contacts),
    socialLinks: asRecord(row.social_links),
    brandKit: asRecord(row.brand_kit),
    createdAt: String(row.created_at)
  };
}

function mapRelease(row: any): HubRelease {
  return {
    id: String(row.id),
    artistId: row.artist_id ? String(row.artist_id) : null,
    title: String(row.title),
    format: String(row.format ?? "Single"),
    releaseType: String(row.release_type ?? "single") as HubRelease["releaseType"],
    releaseDate: String(row.release_date),
    upc: row.upc ? String(row.upc) : null,
    distributor: row.distributor ? String(row.distributor) : null,
    smartlinkSlug: row.smartlink_slug ? String(row.smartlink_slug) : null
  };
}

function mapSong(row: any): HubSong {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    releaseId: row.release_id ? String(row.release_id) : null,
    title: String(row.title),
    isrc: row.isrc ? String(row.isrc) : null,
    iswc: row.iswc ? String(row.iswc) : null,
    explicit: Boolean(row.explicit),
    language: row.language ? String(row.language) : null,
    bpm: Number.isFinite(Number(row.bpm)) ? Number(row.bpm) : null,
    key: row.key ? String(row.key) : null,
    links: asRecord(row.links)
  };
}

function mapRegistration(row: any): HubRegistration {
  return {
    id: String(row.id),
    songId: String(row.song_id),
    org: String(row.org) as HubRegistration["org"],
    status: String(row.status) as HubRegistration["status"],
    refNumber: row.ref_number ? String(row.ref_number) : null,
    lastUpdate: row.last_update ? String(row.last_update) : null,
    notes: row.notes ? String(row.notes) : null
  };
}

function mapChecklist(row: any): HubChecklist {
  return {
    id: String(row.id),
    songId: row.song_id ? String(row.song_id) : null,
    releaseId: row.release_id ? String(row.release_id) : null,
    items: asRecord(row.items),
    readyScore: Number(row.ready_score ?? 0),
    status: String(row.status ?? "draft") as HubChecklist["status"],
    notes: row.notes ? String(row.notes) : null,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    updatedAt: String(row.updated_at)
  };
}

function mapMediaAsset(row: any): HubMediaAsset {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    releaseId: row.release_id ? String(row.release_id) : null,
    songId: row.song_id ? String(row.song_id) : null,
    type: String(row.type) as HubMediaAsset["type"],
    source: String(row.source) as HubMediaAsset["source"],
    sourceId: row.source_id ? String(row.source_id) : null,
    url: String(row.url),
    thumbUrl: row.thumb_url ? String(row.thumb_url) : null,
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at)
  };
}

function mapMediaKit(row: any): HubMediaKit {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    headline: row.headline ? String(row.headline) : null,
    oneLiner: row.one_liner ? String(row.one_liner) : null,
    highlights: asStringArray(row.highlights),
    pressQuotes: asStringArray(row.press_quotes),
    stats: asRecord(row.stats),
    contacts: asRecord(row.contacts),
    featuredTracks: asStringArray(row.featured_tracks),
    updatedAt: String(row.updated_at)
  };
}

function mapDocument(row: any): HubDocument {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    releaseId: row.release_id ? String(row.release_id) : null,
    songId: row.song_id ? String(row.song_id) : null,
    type: String(row.type) as HubDocument["type"],
    url: String(row.url),
    version: Number(row.version ?? 1),
    status: String(row.status ?? "pending") as HubDocument["status"],
    visibility: asRecord(row.visibility),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null
  };
}

function mapBooking(row: any): HubBooking {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    requesterName: row.requester_name ? String(row.requester_name) : null,
    requesterEmail: row.requester_email ? String(row.requester_email) : null,
    eventName: row.event_name ? String(row.event_name) : null,
    eventLocation: row.event_location ? String(row.event_location) : null,
    eventDate: row.event_date ? String(row.event_date) : null,
    budget: row.budget == null ? null : Number(row.budget),
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status) as HubBooking["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapContentItem(row: any): HubContentItem {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    type: String(row.type) as HubContentItem["type"],
    caption: row.caption ? String(row.caption) : null,
    assets: asRecordArray(row.assets),
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    status: String(row.status) as HubContentItem["status"],
    submittedBy: row.submitted_by ? String(row.submitted_by) : null,
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    approvals: asRecordArray(row.approvals),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapPrRequest(row: any): HubPrRequest {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    outlet: String(row.outlet),
    contact: row.contact ? String(row.contact) : null,
    requestedAt: row.requested_at ? String(row.requested_at) : null,
    topic: row.topic ? String(row.topic) : null,
    status: String(row.status) as HubPrRequest["status"],
    notes: row.notes ? String(row.notes) : null,
    attachments: asRecordArray(row.attachments),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapSyncPackage(row: any): HubSyncPackage {
  return {
    id: String(row.id),
    songId: String(row.song_id),
    tags: asRecord(row.tags),
    link: row.link ? String(row.link) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapReport(row: any): HubReport {
  return {
    id: String(row.id),
    artistId: String(row.artist_id),
    month: String(row.month),
    url: String(row.url),
    version: Number(row.version ?? 1),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at)
  };
}

function mapAudit(row: any): HubAuditEvent {
  return {
    id: String(row.id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    artistId: row.artist_id ? String(row.artist_id) : null,
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: row.entity_id ? String(row.entity_id) : null,
    details: asRecord(row.details),
    createdAt: String(row.created_at)
  };
}

export function toStorageUrl(bucket: string, path: string): string {
  return `storage://${bucket}/${path}`;
}

export function normalizeExternalAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Keep storage URLs untouched; they are resolved via signed URLs.
  if (raw.startsWith("storage://")) return raw;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    if (host === "drive.google.com") {
      const filePathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)\//i);
      const queryId = parsed.searchParams.get("id");
      const fileId = (filePathMatch?.[1] ?? queryId ?? "").trim();
      if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
      }
    }

    if (host.endsWith("dropbox.com")) {
      parsed.searchParams.delete("dl");
      parsed.searchParams.set("raw", "1");
      return parsed.toString();
    }
  } catch {
    // If it is not a valid URL, return as-is to preserve previous behavior.
  }

  return raw;
}

export function parseStorageUrl(value: string | null | undefined): { bucket: string; path: string } | null {
  if (!value || !value.startsWith("storage://")) return null;
  const withoutScheme = value.replace("storage://", "");
  const separator = withoutScheme.indexOf("/");
  if (separator <= 0) return null;
  return {
    bucket: withoutScheme.slice(0, separator),
    path: withoutScheme.slice(separator + 1)
  };
}

export async function resolveMaybeSignedUrl(value: string | null | undefined, expiresInSeconds = 3600): Promise<string | null> {
  const normalized = normalizeExternalAssetUrl(value);
  if (!normalized) return null;
  const parsed = parseStorageUrl(normalized);
  if (!parsed) return normalized;

  const service = createServiceClient();
  const { data, error } = await service.storage.from(parsed.bucket).createSignedUrl(parsed.path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function listArtistsForContext(ctx: HubUserContext): Promise<HubArtist[]> {
  const service = createServiceClient();
  if (ctx.isAdmin) {
    const { data, error } = await service.from("artists").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapArtist);
  }

  const artistIds = [...new Set(ctx.memberships.map((item) => item.artistId))];
  if (artistIds.length === 0) return [];
  const { data, error } = await service.from("artists").select("*").in("id", artistIds).order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapArtist);
}

export async function getArtistBySlugForContext(ctx: HubUserContext, slug: string): Promise<HubArtist | null> {
  const service = createServiceClient();
  const { data, error } = await service.from("artists").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  const artist = mapArtist(data);
  if (!hasArtistAccess(ctx, artist.id)) return null;
  return artist;
}

export async function getArtistByIdForContext(ctx: HubUserContext, artistId: string): Promise<HubArtist | null> {
  if (!hasArtistAccess(ctx, artistId)) return null;
  const service = createServiceClient();
  const { data, error } = await service.from("artists").select("*").eq("id", artistId).maybeSingle();
  if (error || !data) return null;
  return mapArtist(data);
}

export type CatalogBundle = {
  releases: HubRelease[];
  songs: HubSong[];
  registrations: HubRegistration[];
  checklists: HubChecklist[];
  assets: HubMediaAsset[];
};

export async function getCatalogBundle(artistId: string): Promise<CatalogBundle> {
  const service = createServiceClient();
  const [{ data: releases }, { data: songs }, { data: registrations }, { data: checklists }, { data: assets }] = await Promise.all([
    service.from("releases").select("*").eq("artist_id", artistId).order("release_date", { ascending: false }),
    service.from("songs").select("*").eq("artist_id", artistId).order("created_at", { ascending: false }),
    service
      .from("registrations")
      .select("*")
      .in(
        "song_id",
        (await service.from("songs").select("id").eq("artist_id", artistId)).data?.map((row: any) => row.id) ?? ["00000000-0000-0000-0000-000000000000"]
      ),
    service.from("launch_checklists").select("*").order("updated_at", { ascending: false }),
    service.from("media_assets").select("*").eq("artist_id", artistId).order("created_at", { ascending: false })
  ]);

  const songIds = new Set((songs ?? []).map((row: any) => String(row.id)));
  const releaseIds = new Set((releases ?? []).map((row: any) => String(row.id)));

  return {
    releases: (releases ?? []).map(mapRelease),
    songs: (songs ?? []).map(mapSong),
    registrations: (registrations ?? []).filter((row: any) => songIds.has(String(row.song_id))).map(mapRegistration),
    checklists: (checklists ?? [])
      .filter((row: any) => {
        const rowSong = row.song_id ? String(row.song_id) : null;
        const rowRelease = row.release_id ? String(row.release_id) : null;
        return (rowSong && songIds.has(rowSong)) || (rowRelease && releaseIds.has(rowRelease));
      })
      .map(mapChecklist),
    assets: (assets ?? []).map(mapMediaAsset)
  };
}

export async function getMediaKitByArtistId(artistId: string): Promise<HubMediaKit | null> {
  const service = createServiceClient();
  const { data, error } = await service.from("media_kits").select("*").eq("artist_id", artistId).maybeSingle();
  if (error || !data) return null;
  return mapMediaKit(data);
}

export async function ensureMediaKitByArtistId(artistId: string): Promise<HubMediaKit> {
  const existing = await getMediaKitByArtistId(artistId);
  if (existing) return existing;

  const service = createServiceClient();
  const { data, error } = await service.from("media_kits").insert({ artist_id: artistId }).select("*").single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create media kit.");
  }
  return mapMediaKit(data);
}

export async function getGalleryByArtistId(artistId: string): Promise<HubMediaAsset[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("media_assets")
    .select("*")
    .eq("artist_id", artistId)
    .in("type", ["photo", "cover", "logo", "template"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMediaAsset);
}

export async function getDocumentsByArtistId(artistId: string): Promise<HubDocument[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("documents")
    .select("*")
    .eq("artist_id", artistId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocument);
}

export async function getDocumentAclByArtistId(artistId: string): Promise<Array<Record<string, unknown>>> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("artist_document_acl")
    .select("*")
    .eq("artist_id", artistId)
    .order("document_type", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    artistId: String(row.artist_id),
    documentType: String(row.document_type),
    allowArtist: Boolean(row.allow_artist),
    allowManager: Boolean(row.allow_manager),
    allowBooking: Boolean(row.allow_booking),
    allowStaff: Boolean(row.allow_staff),
    updatedAt: String(row.updated_at)
  }));
}

export async function getBookingsByArtistId(artistId: string): Promise<HubBooking[]> {
  const service = createServiceClient();
  const { data, error } = await service.from("booking_requests").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBooking);
}

export async function getContentByArtistId(artistId: string): Promise<HubContentItem[]> {
  const service = createServiceClient();
  const { data, error } = await service.from("content_items").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContentItem);
}

export async function getPrByArtistId(artistId: string): Promise<HubPrRequest[]> {
  const service = createServiceClient();
  const { data, error } = await service.from("pr_requests").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPrRequest);
}

export async function getSyncPackagesByArtistId(artistId: string): Promise<HubSyncPackage[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("sync_packages")
    .select("id,song_id,tags,link,expires_at,created_at,updated_at,songs!inner(artist_id)")
    .eq("songs.artist_id", artistId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => mapSyncPackage(row));
}

export async function getReportsByArtistId(artistId: string): Promise<HubReport[]> {
  const service = createServiceClient();
  const { data, error } = await service.from("reports").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReport);
}

export async function getAuditByArtistId(artistId: string, limit = 80): Promise<HubAuditEvent[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("audit_log")
    .select("*")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAudit);
}

export async function getAuditGlobal(limit = 200): Promise<HubAuditEvent[]> {
  const service = createServiceClient();
  const { data, error } = await service.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAudit);
}

export async function listMembersByArtistId(artistId: string): Promise<HubMembership[]> {
  const service = createServiceClient();
  const { data, error } = await service.from("artist_members").select("*").eq("artist_id", artistId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    artistId: String(row.artist_id),
    userId: String(row.user_id),
    role: String(row.role) as HubRole,
    permissions: asRecord(row.permissions),
    createdAt: String(row.created_at)
  }));
}

export type AuditInput = {
  actorUserId: string | null;
  artistId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
};

export async function insertAuditLog(input: AuditInput): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.from("audit_log").insert({
    actor_user_id: input.actorUserId,
    artist_id: input.artistId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    details: input.details ?? {}
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function smartlinkUrl(slug: string): string {
  return absoluteUrl(`/smart/${slug}`);
}
