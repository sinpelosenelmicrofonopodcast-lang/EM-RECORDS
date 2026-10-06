import { redirect } from "next/navigation";
import { getHubUserContext } from "@/lib/artist-hub/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const CENTRAL_TEXAS_PROGRAM_SLUG = "central-texas-production";

export async function requireArtistProgramWorkspace(artistSlug: string) {
  const ctx = await getHubUserContext();
  if (!ctx) redirect("/artist/login");

  const service = createServiceClient();
  const { data: artist } = await service
    .from("artists")
    .select("id,name,slug")
    .eq("slug", artistSlug)
    .maybeSingle();

  if (!artist) redirect("/dashboard/artist-hub");

  const allowed = ctx.isAdmin || ctx.memberships.some((membership) => membership.artistId === String(artist.id));
  if (!allowed) redirect("/dashboard/artist-hub");

  const { data: artistProfile } = await service
    .from("artist_profiles")
    .select("*")
    .eq("artist_id", artist.id)
    .maybeSingle();

  return { ctx, service, artist, artistProfile: artistProfile ?? null };
}

export async function getArtistReadinessSnapshot(artistSlug: string) {
  const workspace = await requireArtistProgramWorkspace(artistSlug);
  if (!workspace.artistProfile) {
    return { ...workspace, program: null, requirements: [], statuses: [], score: 0 };
  }

  const { service, artistProfile } = workspace;
  const { data: program } = await service.from("programs").select("*").eq("slug", CENTRAL_TEXAS_PROGRAM_SLUG).maybeSingle();

  let requirementQuery = service.from("artist_requirements").select("*").eq("active", true);
  requirementQuery = program?.id
    ? requirementQuery.or("program_id.is.null,program_id.eq." + program.id)
    : requirementQuery.is("program_id", null);

  const [{ data: requirements }, { data: statuses }] = await Promise.all([
    requirementQuery.order("sort_order", { ascending: true }),
    service.from("artist_requirement_status").select("*").eq("artist_profile_id", artistProfile.id)
  ]);

  const statusByRequirement = new Map((statuses ?? []).map((row: any) => [String(row.requirement_id), String(row.status)]));
  const required = (requirements ?? []).filter((row: any) => Boolean(row.is_required));
  const complete = required.filter((row: any) =>
    ["verified", "not_applicable"].includes(statusByRequirement.get(String(row.id)) ?? "missing")
  );
  const score = required.length ? Math.round((complete.length / required.length) * 100) : 100;

  return { ...workspace, program, requirements: requirements ?? [], statuses: statuses ?? [], score };
}

function parseStoragePointer(value: string) {
  if (!value.startsWith("storage://")) return null;
  const raw = value.slice("storage://".length);
  const separator = raw.indexOf("/");
  if (separator < 1) return null;
  return { bucket: raw.slice(0, separator), path: raw.slice(separator + 1) };
}

async function signPreview(service: ReturnType<typeof createServiceClient>, value: unknown) {
  const url = String(value ?? "");
  const pointer = parseStoragePointer(url);
  if (!pointer) return url || null;
  const { data } = await service.storage.from(pointer.bucket).createSignedUrl(pointer.path, 600);
  return data?.signedUrl ?? null;
}

export async function getCentralTexasWorkspace(artistSlug: string) {
  const base = await getArtistReadinessSnapshot(artistSlug);
  if (!base.artistProfile || !base.program) {
    return { ...base, application: null, beats: [], requests: [], demos: [] };
  }

  const { service, artistProfile, program } = base;
  const [{ data: application }, { data: requests }, { data: demos }] = await Promise.all([
    service.from("program_applications").select("*").eq("program_id", program.id).eq("artist_profile_id", artistProfile.id).maybeSingle(),
    service.from("beat_access_requests").select("*").eq("artist_profile_id", artistProfile.id).order("requested_at", { ascending: false }),
    service.from("production_demos").select("*").eq("artist_profile_id", artistProfile.id).order("created_at", { ascending: false })
  ]);

  let beats: any[] = [];
  if (application?.status === "approved") {
    const { data: programBeats } = await service
      .from("program_beats")
      .select("*")
      .eq("program_id", program.id)
      .in("status", ["available", "under_review", "selected", "locked", "in_production", "released"])
      .order("created_at", { ascending: false });

    const beatIds = (programBeats ?? []).map((row: any) => row.beat_id);
    let beatRows: any[] = [];
    if (beatIds.length) {
      const result = await service
        .from("beats")
        .select("id,title,bpm,key,genre,mood,tags,preview_url,cover_url")
        .in("id", beatIds);
      beatRows = result.data ?? [];
    }
    const byId = new Map(beatRows.map((row: any) => [String(row.id), row]));

    beats = await Promise.all(
      (programBeats ?? []).map(async (row: any) => {
        const beat: any = byId.get(String(row.beat_id)) ?? {};
        return { ...row, beat: { ...beat, preview_url: await signPreview(service, beat.preview_url) } };
      })
    );
  }

  return { ...base, application, beats, requests: requests ?? [], demos: demos ?? [] };
}

export async function getCentralTexasAdminSnapshot() {
  const service = createServiceClient();
  const { data: program } = await service.from("programs").select("*").eq("slug", CENTRAL_TEXAS_PROGRAM_SLUG).maybeSingle();
  if (!program) return { program: null, applications: [], beats: [], requests: [], demos: [], profiles: [], beatRows: [] };

  const [{ data: applications }, { data: programBeats }, { data: requests }, { data: demos }] = await Promise.all([
    service.from("program_applications").select("*").eq("program_id", program.id).order("created_at", { ascending: false }),
    service.from("program_beats").select("*").eq("program_id", program.id).order("created_at", { ascending: false }),
    service.from("beat_access_requests").select("*").order("requested_at", { ascending: false }).limit(100),
    service.from("production_demos").select("*").order("created_at", { ascending: false }).limit(100)
  ]);

  const profileIds = Array.from(new Set([
    ...(applications ?? []).map((row: any) => row.artist_profile_id),
    ...(requests ?? []).map((row: any) => row.artist_profile_id),
    ...(demos ?? []).map((row: any) => row.artist_profile_id)
  ].filter(Boolean)));
  const beatIds = (programBeats ?? []).map((row: any) => row.beat_id);

  let profiles: any[] = [];
  let beatRows: any[] = [];
  if (profileIds.length) {
    const result = await service.from("artist_profiles").select("id,legal_name,stage_name,email,artist_id").in("id", profileIds);
    profiles = result.data ?? [];
  }
  if (beatIds.length) {
    const result = await service.from("beats").select("id,title,bpm,key,status").in("id", beatIds);
    beatRows = result.data ?? [];
  }

  return {
    program,
    applications: applications ?? [],
    beats: programBeats ?? [],
    requests: requests ?? [],
    demos: demos ?? [],
    profiles,
    beatRows
  };
}
