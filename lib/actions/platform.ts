"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { CENTRAL_TEXAS_PROGRAM_SLUG, requireArtistProgramWorkspace } from "@/lib/central-texas";
import { createServiceClient } from "@/lib/supabase/service";

async function refreshArtist(slug: string) {
  revalidatePath("/dashboard/artist-hub/" + slug + "/readiness");
  revalidatePath("/dashboard/artist-hub/" + slug + "/central-texas");
}

export async function applyCentralTexasAction(formData: FormData) {
  const artistSlug = String(formData.get("artistSlug") ?? "").trim();
  const workspace = await requireArtistProgramWorkspace(artistSlug);
  if (!workspace.artistProfile) throw new Error("Complete the legal artist profile before applying.");

  const { data: program } = await workspace.service
    .from("programs")
    .select("id,application_open")
    .eq("slug", CENTRAL_TEXAS_PROGRAM_SLUG)
    .maybeSingle();
  if (!program?.application_open) throw new Error("Applications are not open.");

  const { error } = await workspace.service.from("program_applications").upsert(
    {
      program_id: program.id,
      artist_profile_id: workspace.artistProfile.id,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "program_id,artist_profile_id" }
  );
  if (error) throw new Error(error.message);
  await refreshArtist(artistSlug);
}

export async function updateArtistRequirementAction(formData: FormData) {
  const artistSlug = String(formData.get("artistSlug") ?? "").trim();
  const requirementId = String(formData.get("requirementId") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "provided");
  const status = ["provided", "not_applicable", "in_progress", "missing"].includes(statusRaw) ? statusRaw : "provided";
  const valueText = String(formData.get("valueText") ?? "").trim() || null;

  const workspace = await requireArtistProgramWorkspace(artistSlug);
  if (!workspace.artistProfile) throw new Error("Artist profile not found.");

  const { error } = await workspace.service.from("artist_requirement_status").upsert(
    {
      artist_profile_id: workspace.artistProfile.id,
      requirement_id: requirementId,
      status,
      value_text: valueText,
      verified_by: null,
      verified_at: null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "artist_profile_id,requirement_id" }
  );
  if (error) throw new Error(error.message);
  await refreshArtist(artistSlug);
}

export async function requestProductionBeatAccessAction(formData: FormData) {
  const artistSlug = String(formData.get("artistSlug") ?? "").trim();
  const programBeatId = String(formData.get("programBeatId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const workspace = await requireArtistProgramWorkspace(artistSlug);
  if (!workspace.artistProfile) throw new Error("Artist profile not found.");

  const { data: programBeat } = await workspace.service
    .from("program_beats")
    .select("id,program_id,status")
    .eq("id", programBeatId)
    .maybeSingle();
  if (!programBeat || programBeat.status !== "available") throw new Error("This beat is not currently available.");

  const { data: application } = await workspace.service
    .from("program_applications")
    .select("status")
    .eq("program_id", programBeat.program_id)
    .eq("artist_profile_id", workspace.artistProfile.id)
    .maybeSingle();
  if (application?.status !== "approved") throw new Error("Program approval is required before requesting a beat.");

  const { error } = await workspace.service.from("beat_access_requests").upsert(
    {
      program_beat_id: programBeatId,
      artist_profile_id: workspace.artistProfile.id,
      status: "pending",
      reason,
      updated_at: new Date().toISOString()
    },
    { onConflict: "program_beat_id,artist_profile_id" }
  );
  if (error) throw new Error(error.message);
  await refreshArtist(artistSlug);
}

export async function submitProductionDemoAction(formData: FormData) {
  const artistSlug = String(formData.get("artistSlug") ?? "").trim();
  const programBeatId = String(formData.get("programBeatId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const lyrics = String(formData.get("lyrics") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const fileValue = formData.get("demoFile");
  const file = fileValue instanceof File ? fileValue : null;

  if (!title || !file || file.size < 1) throw new Error("Demo title and audio file are required.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Demo file is too large.");

  const workspace = await requireArtistProgramWorkspace(artistSlug);
  if (!workspace.artistProfile) throw new Error("Artist profile not found.");

  const { data: request } = await workspace.service
    .from("beat_access_requests")
    .select("id,status,contract_id")
    .eq("program_beat_id", programBeatId)
    .eq("artist_profile_id", workspace.artistProfile.id)
    .eq("status", "approved")
    .maybeSingle();
  if (!request?.id || !request.contract_id) throw new Error("Approved access and an executed demo agreement are required.");

  const { data: contract } = await workspace.service.from("contracts").select("status").eq("id", request.contract_id).maybeSingle();
  if (contract?.status !== "fully_executed") throw new Error("The Beat Demo Access Agreement must be fully executed first.");

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = "production-demos/" + workspace.artistProfile.id + "/" + Date.now() + "-" + crypto.randomUUID() + "-" + safeName;
  const { error: uploadError } = await workspace.service.storage.from("em-records-private").upload(path, file, {
    contentType: file.type || "audio/mpeg",
    upsert: false
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data: versions } = await workspace.service
    .from("production_demos")
    .select("version")
    .eq("program_beat_id", programBeatId)
    .eq("artist_profile_id", workspace.artistProfile.id)
    .order("version", { ascending: false })
    .limit(1);
  const version = Number(versions?.[0]?.version ?? 0) + 1;

  const { error } = await workspace.service.from("production_demos").insert({
    program_beat_id: programBeatId,
    artist_profile_id: workspace.artistProfile.id,
    access_request_id: request.id,
    title,
    storage_bucket: "em-records-private",
    storage_path: path,
    lyrics,
    notes,
    version,
    status: "submitted",
    submitted_at: new Date().toISOString()
  });
  if (error) throw new Error(error.message);
  await refreshArtist(artistSlug);
}

export async function adminAddProgramBeatAction(formData: FormData) {
  await requireAdminPage();
  const service = createServiceClient();
  const beatId = String(formData.get("beatId") ?? "").trim();
  const { data: program } = await service.from("programs").select("id").eq("slug", CENTRAL_TEXAS_PROGRAM_SLUG).maybeSingle();
  const { data: beat } = await service.from("beats").select("id").eq("id", beatId).maybeSingle();
  if (!program || !beat) throw new Error("Program or beat not found.");

  const { error } = await service.from("program_beats").upsert(
    { program_id: program.id, beat_id: beatId, status: "available", preview_only: true },
    { onConflict: "program_id,beat_id" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/central-texas");
}

export async function adminReviewProgramApplicationAction(formData: FormData) {
  const admin = await requireAdminPage();
  const service = createServiceClient();
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const status = String(formData.get("status") ?? "under_review");
  const allowed = ["under_review", "needs_information", "verified", "approved", "rejected", "suspended"];
  if (!allowed.includes(status)) throw new Error("Invalid application status.");

  const { error } = await service.from("program_applications").update({
    status,
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", applicationId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/central-texas");
}

export async function adminVerifyRequirementAction(formData: FormData) {
  const admin = await requireAdminPage();
  const service = createServiceClient();
  const id = String(formData.get("statusId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "verified");
  const status = ["verified", "rejected", "not_applicable"].includes(decision) ? decision : "verified";
  const { error } = await service.from("artist_requirement_status").update({
    status,
    verified_by: admin.id,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/central-texas");
}

export async function adminReviewBeatAccessAction(formData: FormData) {
  const admin = await requireAdminPage();
  const service = createServiceClient();
  const requestId = String(formData.get("requestId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "needs_information");
  const contractId = String(formData.get("contractId") ?? "").trim() || null;

  if (decision === "approved") {
    if (!contractId) throw new Error("Link the Beat Demo Access Agreement contract before granting access.");
    const { data: contract } = await service.from("contracts").select("status").eq("id", contractId).maybeSingle();
    if (contract?.status !== "fully_executed") throw new Error("Contract must be fully executed before access is granted.");

    const { data: request } = await service.from("beat_access_requests").select("id,program_beat_id").eq("id", requestId).maybeSingle();
    if (!request) throw new Error("Access request not found.");
    const { data: programBeat } = await service.from("program_beats").select("beat_id,status").eq("id", request.program_beat_id).maybeSingle();
    if (!programBeat || programBeat.status !== "available") throw new Error("Beat is no longer available.");
    const { data: beat } = await service.from("beats").select("audio_url").eq("id", programBeat.beat_id).maybeSingle();
    const pointer = String(beat?.audio_url ?? "");
    if (!pointer.startsWith("storage://")) throw new Error("Beat full-quality file is not in protected storage.");

    const raw = pointer.slice("storage://".length);
    const slash = raw.indexOf("/");
    const bucket = raw.slice(0, slash);
    const path = raw.slice(slash + 1);

    const updateRequest = await service.from("beat_access_requests").update({
      status: "approved",
      contract_id: contractId,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      updated_at: new Date().toISOString()
    }).eq("id", requestId);
    if (updateRequest.error) throw new Error(updateRequest.error.message);

    const grant = await service.from("beat_access_grants").upsert({
      request_id: requestId,
      contract_id: contractId,
      storage_bucket: bucket,
      storage_path: path,
      max_downloads: 2,
      download_count: 0,
      granted_by: admin.id,
      granted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null
    }, { onConflict: "request_id" });
    if (grant.error) throw new Error(grant.error.message);
  } else {
    const status = ["rejected", "needs_information", "revoked", "closed"].includes(decision) ? decision : "needs_information";
    const { error } = await service.from("beat_access_requests").update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      updated_at: new Date().toISOString()
    }).eq("id", requestId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/central-texas");
}

export async function adminSelectProductionDemoAction(formData: FormData) {
  await requireAdminPage();
  const service = createServiceClient();
  const demoId = String(formData.get("demoId") ?? "").trim();
  const { error } = await service.rpc("select_program_demo", { p_demo_id: demoId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/central-texas");
}

export async function submitStudioInquiryAction(formData: FormData) {
  const service = createServiceClient();
  const clientName = String(formData.get("name") ?? "").trim();
  const clientEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const serviceId = String(formData.get("serviceId") ?? "").trim() || null;
  const projectTypeRaw = String(formData.get("projectType") ?? "recording");
  const allowed = ["recording", "mixing", "mastering", "production", "vocal_production", "custom"];
  const projectType = allowed.includes(projectTypeRaw) ? projectTypeRaw : "custom";
  const title = String(formData.get("title") ?? "").trim() || projectType + " project";
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const preferredDate = String(formData.get("preferredDate") ?? "").trim() || null;
  if (!clientName || !clientEmail) throw new Error("Name and email are required.");

  const { error } = await service.from("client_projects").insert({
    service_id: serviceId,
    client_name: clientName,
    client_email: clientEmail,
    title,
    project_type: projectType,
    status: "inquiry",
    payment_status: "unpaid",
    client_notes: notes,
    metadata: { preferred_date: preferredDate, source: "website" }
  });
  if (error) throw new Error(error.message);
  redirect("/studio?submitted=1");
}

export async function submitSyncInquiryAction(formData: FormData) {
  const service = createServiceClient();
  const requesterName = String(formData.get("name") ?? "").trim();
  const requesterEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!requesterName || !requesterEmail) throw new Error("Name and email are required.");

  const budgetRaw = String(formData.get("budget") ?? "").replace(/[^0-9.]/g, "");
  const parsedBudget = budgetRaw ? Math.round(Number(budgetRaw) * 100) : null;
  const budgetCents = parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null;

  const { error } = await service.from("sync_inquiries").insert({
    song_id: String(formData.get("songId") ?? "").trim() || null,
    requester_name: requesterName,
    requester_email: requesterEmail,
    company: String(formData.get("company") ?? "").trim() || null,
    production_name: String(formData.get("productionName") ?? "").trim() || null,
    media_type: String(formData.get("mediaType") ?? "").trim() || null,
    usage: String(formData.get("usage") ?? "").trim() || null,
    scene_context: String(formData.get("sceneContext") ?? "").trim() || null,
    territory: String(formData.get("territory") ?? "").trim() || null,
    term_text: String(formData.get("term") ?? "").trim() || null,
    exclusivity: String(formData.get("exclusivity") ?? "").trim() || null,
    media: String(formData.get("media") ?? "").trim() || null,
    budget_cents: budgetCents,
    deadline: String(formData.get("deadline") ?? "").trim() || null,
    status: "new"
  });
  if (error) throw new Error(error.message);
  redirect("/sync-licensing?submitted=1");
}
