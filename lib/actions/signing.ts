"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { appendSignatureEvent, appendSigningAuditLog, createInAppNotification, createSigningMessage } from "@/lib/signing/audit";
import {
  buildContractCompletedEmail,
  buildInviteToReviewOfferEmail,
  buildOnboardingIncompleteReminderEmail,
  buildSignAgreementEmail,
  buildWelcomeToEmRecordsEmail
} from "@/lib/signing/email-templates";
import { sendTransactionalEmail } from "@/lib/signing/email";
import { buildContractPdf } from "@/lib/signing/pdf";
import { EM_RECORDS_DEFAULT_LEGAL_ENTITY } from "@/lib/signing/constants";
import {
  OFFICIAL_RECORDING_AGREEMENT_BODY_MARKDOWN,
  OFFICIAL_RECORDING_AGREEMENT_CLAUSE_SCHEMA,
  OFFICIAL_RECORDING_AGREEMENT_DEFAULT_VARIABLES,
  OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME,
  OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_VERSION,
  normalizeRecordingAgreementLanguage,
  resolveOfficialRecordingAgreementMarkdown,
  resolveOfficialRecordingAgreementTitle
} from "@/lib/signing/recording-agreement";
import { buildArtistIntakeDbPayload, formatArtistPostalAddress, getMissingCriticalArtistFields, parseArtistIntakeFormData, upsertArtistIntakeLead } from "@/lib/signing/intake";
import { getContractBundle, getSigningViewerContext } from "@/lib/signing/service";
import { formatContractMarkdown, markdownToContractHtml, mergeTemplateVariables, renderContractTemplate } from "@/lib/signing/template-engine";
import { generateInviteToken, hashInviteToken } from "@/lib/signing/token";
import type { Contract, ContractClauseFlags, ContractRenderContext } from "@/lib/signing/types";

function toStorageUrl(bucket: string, path: string): string {
  return `storage://${bucket}/${path}`;
}

function normalizeBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getRedirectTo(formData: FormData, fallback: string): string {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  if (!redirectTo.startsWith("/")) return fallback;
  return redirectTo;
}

function flashRedirect(path: string, status: "success" | "error", message: string): never {
  redirect(`${path}?status=${status}&message=${encodeURIComponent(message)}`);
}

function asString(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function asBool(formData: FormData, field: string): boolean {
  const raw = String(formData.get(field) ?? "").trim().toLowerCase();
  return raw === "on" || raw === "true" || raw === "1";
}

function asNullableNumber(formData: FormData, field: string): number | null {
  const raw = asString(formData, field);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function withDefinedValues<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function resolveEffectiveDateValue(raw: string): Date {
  const fallback = new Date();
  if (!raw) return fallback;

  const parsed = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function formatAgreementDateParts(raw: string): { day: string; month: string; year: string } {
  const date = resolveEffectiveDateValue(raw);
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: date.toLocaleString("en-US", { month: "long", timeZone: "UTC" }),
    year: String(date.getUTCFullYear())
  };
}

function parseIpAddress(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim() ?? "";
  if (!first) return null;
  return first.replace(/[^a-fA-F0-9:.\-]/g, "");
}

function parseArtistCatalogSocialLinks(artist: {
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  x_url?: string | null;
  facebook_url?: string | null;
}): Record<string, string> {
  const entries = [
    ["instagram", artist.instagram_url],
    ["tiktok", artist.tiktok_url],
    ["youtube", artist.youtube_url],
    ["spotify", artist.spotify_url],
    ["x", artist.x_url],
    ["facebook", artist.facebook_url]
  ] as const;

  return entries.reduce<Record<string, string>>((acc, [key, value]) => {
    const normalized = String(value ?? "").trim();
    if (normalized) acc[key] = normalized;
    return acc;
  }, {});
}

async function requireViewer() {
  const ctx = await getSigningViewerContext();
  if (!ctx) redirect("/artist/login");
  return ctx;
}

async function requireStaff() {
  const ctx = await requireViewer();
  if (!ctx.isStaff) redirect("/");
  return ctx;
}

function resolveContractClauses(formData: FormData, defaults: Record<string, unknown>, offerDefaults?: { includes360?: boolean; includesPublishing?: boolean }): ContractClauseFlags {
  const fallbackPublishing = offerDefaults?.includesPublishing ?? Boolean(defaults.includes_publishing ?? true);
  const fallback360 = offerDefaults?.includes360 ?? Boolean(defaults.includes_360 ?? false);

  return {
    includes_publishing: formData.has("includes_publishing") ? asBool(formData, "includes_publishing") : fallbackPublishing,
    includes_360: formData.has("includes_360") ? asBool(formData, "includes_360") : fallback360,
    perpetual_master_rights: formData.has("perpetual_master_rights")
      ? asBool(formData, "perpetual_master_rights")
      : Boolean(defaults.perpetual_master_rights ?? false)
  };
}

function buildContractVariableOverrides(formData: FormData, lead: any, offer: any): Record<string, unknown> {
  const effectiveDateValue = asString(formData, "effective_date") || new Date().toISOString().slice(0, 10);
  const agreementDateParts = formatAgreementDateParts(effectiveDateValue);
  const artistFullAddress = formatArtistPostalAddress({
    addressLine1: lead.address_line_1,
    addressLine2: lead.address_line_2,
    residenceCity: lead.residence_city,
    residenceStateRegion: lead.residence_state_region,
    postalCode: lead.postal_code,
    residenceCountry: lead.residence_country
  });

  return {
    contract_language: asString(formData, "contract_language") || undefined,
    artist_legal_name: lead.legal_name,
    artist_stage_name: lead.stage_name || lead.legal_name,
    artist_personal_email: lead.email || "",
    artist_professional_email: lead.professional_email || "",
    artist_phone: lead.phone || "",
    artist_date_of_birth: lead.date_of_birth || "",
    artist_nationality: lead.nationality || "",
    artist_residence_city: lead.residence_city || "",
    artist_residence_country: lead.residence_country || lead.country || "",
    artist_residence_state_region: lead.residence_state_region || lead.state || "",
    artist_postal_code: lead.postal_code || "",
    artist_address_line_1: lead.address_line_1 || "",
    artist_address_line_2: lead.address_line_2 || "",
    artist_full_address: artistFullAddress,
    artist_government_id: lead.government_id || "",
    artist_primary_genre: lead.primary_genre || "",
    artist_representing_country: lead.representing_country || "",
    artist_manager_name: lead.manager_name || "",
    artist_manager_email: lead.manager_email || "",
    artist_manager_phone: lead.manager_phone || "",
    effective_date: effectiveDateValue,
    agreement_day: asString(formData, "agreement_day") || agreementDateParts.day,
    agreement_month: asString(formData, "agreement_month") || agreementDateParts.month,
    agreement_year: asString(formData, "agreement_year") || agreementDateParts.year,
    label_legal_entity: asString(formData, "label_legal_entity") || process.env.EM_RECORDS_LEGAL_ENTITY || EM_RECORDS_DEFAULT_LEGAL_ENTITY,
    label_principal_place_of_business:
      asString(formData, "label_principal_place_of_business") ||
      process.env.EM_RECORDS_PRINCIPAL_PLACE_OF_BUSINESS ||
      "Austin, Texas",
    term: asString(formData, "term") || offer.term_description || `${offer.term_months ?? 24} months`,
    initial_term_commitment: asString(formData, "initial_term_commitment") || "Three (3) Commercial Singles",
    initial_term_period: asString(formData, "initial_term_period") || "Twelve (12) months",
    extension_option_description:
      asString(formData, "extension_option_description") || "Two (2) additional Singles OR one (1) EP project.",
    territory: asString(formData, "territory") || offer.territory || "Worldwide",
    royalty_split_label: asString(formData, "royalty_split_label") || String(offer.royalty_split_label ?? 50),
    royalty_split_artist: asString(formData, "royalty_split_artist") || String(offer.royalty_split_artist ?? 50),
    live_split_artist: asString(formData, "live_split_artist") || "70",
    live_split_label: asString(formData, "live_split_label") || "30",
    optional_360_cap: asString(formData, "optional_360_cap") || "20% of net income",
    master_ownership_language: asString(formData, "master_ownership_language") || "Label shall own all Masters created under this Agreement.",
    publishing_language: asString(formData, "publishing_language") || "Publishing participation applies only if explicitly approved by Label.",
    advance_amount:
      asString(formData, "advance_amount") ||
      (offer.advance_amount != null ? `$${Number(offer.advance_amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "$0.00"),
    recoupment_terms:
      asString(formData, "recoupment_terms") ||
      "Advance, recording and approved marketing costs are recoupable from Artist revenue share.",
    production_obligations:
      asString(formData, "production_obligations") ||
      "Artist shall deliver commercially satisfactory master recordings according to Label schedule.",
    video_content_obligations:
      asString(formData, "video_content_obligations") || "Artist agrees to participate in mutually approved content campaigns.",
    delivery_obligations:
      asString(formData, "delivery_obligations") ||
      "Artist shall deliver stems, metadata, artwork and assets in Label-compliant formats.",
    exclusivity: asString(formData, "exclusivity") || "Artist records exclusively for Label during the Term.",
    revenue_participation:
      asString(formData, "revenue_participation") || "Revenue participation applies across DSP, sync, UGC and direct monetization channels.",
    accounting_frequency: asString(formData, "accounting_frequency") || "Quarterly",
    royalty_statement_frequency: asString(formData, "royalty_statement_frequency") || "every six (6) months",
    royalty_payment_window: asString(formData, "royalty_payment_window") || "45 days after statement delivery",
    termination_breach_language:
      asString(formData, "termination_breach_language") ||
      "Material breach not cured within 30 days may result in termination by non-breaching party.",
    anti_bypass_clause:
      asString(formData, "anti_bypass_clause") ||
      "Artist agrees not to bypass Label business relationships introduced under this Agreement.",
    anti_bypass_term: asString(formData, "anti_bypass_term") || "two (2) years following termination",
    exploitation_rights_clause:
      asString(formData, "exploitation_rights_clause") ||
      "Label has exclusive rights to distribute, exploit and monetize Masters during the Term.",
    clause_360_language:
      asString(formData, "clause_360_language") ||
      "Label participates in approved ancillary income connected to Artist brand activity.",
    perpetual_master_rights_clause:
      asString(formData, "perpetual_master_rights_clause") ||
      "Label retains perpetual ownership in Masters delivered under this Agreement.",
    governing_law: asString(formData, "governing_law") || "State of Texas, United States",
    label_signer_name: asString(formData, "label_signer_name") || "",
    label_signer_title: asString(formData, "label_signer_title") || "",
    label_signature_date: asString(formData, "label_signature_date") || "",
    artist_signature_date: asString(formData, "artist_signature_date") || ""
  };
}

function resolveRenderedTemplateBody(template: any, variables: ContractRenderContext): string {
  const templateName = String(template?.name ?? "").trim();
  const language = normalizeRecordingAgreementLanguage(String(variables.contract_language ?? ""));
  if (templateName === OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME) {
    return resolveOfficialRecordingAgreementMarkdown(language);
  }
  return String(template?.body_markdown ?? "");
}

function resolveRenderedContractTitle(template: any, variables: ContractRenderContext): string {
  const templateName = String(template?.name ?? "").trim();
  const language = normalizeRecordingAgreementLanguage(String(variables.contract_language ?? ""));
  if (templateName === OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME) {
    return resolveOfficialRecordingAgreementTitle(language);
  }
  return templateName || "EM Records Artist Agreement";
}

async function renderAndPersistContractVersion(params: {
  service: ReturnType<typeof createServiceClient>;
  contract: Contract;
  lead: any;
  template: any;
  variables: ContractRenderContext;
  clauses: ContractClauseFlags;
  actorUserId: string;
  signers?: any[];
  events?: any[];
  includeDraftWatermark: boolean;
}): Promise<{ versionId: string; versionNumber: number; storagePath: string }> {
  const templateBodyMarkdown = resolveRenderedTemplateBody(params.template, params.variables);
  const contractTitle = resolveRenderedContractTitle(params.template, params.variables);
  const contractLanguage = normalizeRecordingAgreementLanguage(String(params.variables.contract_language ?? ""));
  const renderedMarkdownRaw = renderContractTemplate(templateBodyMarkdown, params.variables, params.clauses);
  const renderedMarkdown = formatContractMarkdown(renderedMarkdownRaw, params.variables);
  const renderedHtml = markdownToContractHtml(renderedMarkdown);
  const versionNumber = Number(params.contract.contractVersionNumber ?? 0) + 1;

  const pdfBuffer = await buildContractPdf({
    contractId: params.contract.id,
    contractTitle,
    labelName: String(params.variables.label_legal_entity ?? process.env.EM_RECORDS_LEGAL_ENTITY ?? EM_RECORDS_DEFAULT_LEGAL_ENTITY),
    artistLegalName: params.lead.legal_name,
    artistStageName: params.lead.stage_name,
    effectiveDate: String(params.variables.effective_date ?? new Date().toISOString().slice(0, 10)),
    renderedMarkdown,
    versionNumber,
    status: params.contract.status,
    signers: params.signers ?? [],
    events: params.events ?? [],
    includeDraftWatermark: params.includeDraftWatermark,
    language: contractLanguage
  });

  const fileLabel = (params.lead.stage_name || params.lead.legal_name || "Artist").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateLabel = new Date().toISOString().slice(0, 10);
  const path = `${params.lead.id}/contracts/${params.contract.id}/draft/EMRecords_ArtistAgreement_${fileLabel}_${dateLabel}_v${versionNumber}.pdf`;

  const { error: uploadError } = await params.service.storage.from("signing-contracts").upload(path, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true
  });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const storagePath = toStorageUrl("signing-contracts", path);

  const { data: versionRow, error: versionError } = await params.service
    .from("contract_versions")
    .insert({
      contract_id: params.contract.id,
      version_number: versionNumber,
      template_snapshot: templateBodyMarkdown,
      variables_snapshot: {
        ...params.variables,
        clauses: params.clauses
      },
      rendered_markdown: renderedMarkdown,
      rendered_html: renderedHtml,
      pdf_path: storagePath,
      created_by: params.actorUserId
    })
    .select("id")
    .single();

  if (versionError || !versionRow) {
    throw new Error(versionError?.message ?? "Failed to persist contract version.");
  }

  const { error: contractUpdateError } = await params.service
    .from("contracts")
    .update({
      current_version_id: versionRow.id,
      contract_version_number: versionNumber,
      rendered_markdown: renderedMarkdown,
      rendered_html: renderedHtml,
      draft_pdf_path: storagePath
    })
    .eq("id", params.contract.id);

  if (contractUpdateError) {
    throw new Error(contractUpdateError.message);
  }

  return {
    versionId: String(versionRow.id),
    versionNumber,
    storagePath
  };
}

async function persistSignatureImage(params: {
  service: ReturnType<typeof createServiceClient>;
  leadId: string;
  contractId: string;
  role: "artist" | "label";
  signatureData: string;
}): Promise<string | null> {
  if (!params.signatureData.startsWith("data:image/")) return null;
  const [meta, data] = params.signatureData.split(",", 2);
  if (!meta || !data) return null;

  const extension = meta.includes("image/jpeg") ? "jpg" : "png";
  const buffer = Buffer.from(data, "base64");
  const filename = `${params.role}-${Date.now()}-${randomUUID()}.${extension}`;
  const path = `${params.leadId}/contracts/${params.contractId}/signatures/${filename}`;

  const { error } = await params.service.storage.from("signing-signatures").upload(path, buffer, {
    contentType: extension === "jpg" ? "image/jpeg" : "image/png",
    upsert: false
  });

  if (error) return null;
  return toStorageUrl("signing-signatures", path);
}

async function finalizeExecutedContract(params: {
  service: ReturnType<typeof createServiceClient>;
  contractId: string;
  lead: any;
  actorUserId: string;
}) {
  const bundle = await getContractBundle(params.contractId);
  if (!bundle.contract || !bundle.version) {
    throw new Error("Contract bundle is incomplete.");
  }

  const currentTemplate = await params.service
    .from("contract_templates")
    .select("name")
    .eq("id", bundle.contract.contractTemplateId)
    .maybeSingle();
  const variablesSnapshot = (bundle.version.variablesSnapshot ?? {}) as ContractRenderContext;
  const contractLanguage = normalizeRecordingAgreementLanguage(String(variablesSnapshot.contract_language ?? ""));

  const pdfBuffer = await buildContractPdf({
    contractId: bundle.contract.id,
    contractTitle: currentTemplate.data?.name
      ? resolveRenderedContractTitle({ name: String(currentTemplate.data.name), body_markdown: bundle.version.templateSnapshot }, variablesSnapshot)
      : "EM Records Artist Agreement",
    labelName: process.env.EM_RECORDS_LEGAL_ENTITY || EM_RECORDS_DEFAULT_LEGAL_ENTITY,
    artistLegalName: params.lead.legal_name,
    artistStageName: params.lead.stage_name,
    effectiveDate: String(variablesSnapshot.effective_date ?? new Date().toISOString().slice(0, 10)),
    renderedMarkdown: bundle.version.renderedMarkdown,
    versionNumber: bundle.version.versionNumber,
    status: "fully_executed",
    signers: bundle.signers,
    events: bundle.events,
    includeDraftWatermark: false,
    language: contractLanguage
  });

  const artistLabel = (params.lead.stage_name || params.lead.legal_name || "Artist").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateLabel = new Date().toISOString().slice(0, 10);
  const path = `${params.lead.id}/contracts/${params.contractId}/executed/EMRecords_ArtistAgreement_${artistLabel}_${dateLabel}.pdf`;

  const { error: uploadError } = await params.service.storage.from("signing-contracts").upload(path, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true
  });
  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const storagePath = toStorageUrl("signing-contracts", path);

  await params.service
    .from("contracts")
    .update({
      status: "fully_executed",
      executed_pdf_path: storagePath
    })
    .eq("id", params.contractId);

  await params.service.from("artist_leads").update({ status: "fully_executed" }).eq("id", params.lead.id);

  await appendSignatureEvent(params.service, {
    contractId: params.contractId,
    signerRole: "label",
    eventType: "contract_fully_executed",
    metadata: { executed_pdf_path: storagePath }
  });

  await appendSigningAuditLog(params.service, {
    actorUserId: params.actorUserId,
    artistLeadId: String(params.lead.id),
    contractId: params.contractId,
    entityType: "contract",
    entityId: params.contractId,
    action: "contract_fully_executed",
    metadata: { executedPdfPath: storagePath }
  });

  return storagePath;
}

async function resolveInviteToken(service: ReturnType<typeof createServiceClient>, token: string, email: string) {
  const tokenHash = hashInviteToken(token);
  const normalizedEmail = email.trim().toLowerCase();

  const { data: invite, error } = await service.from("invite_tokens").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (error || !invite) return { error: "Invite token is invalid." as const, invite: null };

  if (String(invite.email).toLowerCase() !== normalizedEmail) {
    return { error: "Invite email verification failed." as const, invite: null };
  }

  if (invite.revoked_at) {
    return { error: "Invite has been revoked." as const, invite: null };
  }

  if (invite.used_at) {
    return { error: "Invite has already been used." as const, invite: null };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { error: "Invite link has expired." as const, invite: null };
  }

  return { error: null, invite };
}

export async function createArtistLeadAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/artists");

  const parsed = parseArtistIntakeFormData(formData);
  if (!parsed.success) {
    flashRedirect(redirectTo, "error", parsed.error.issues[0]?.message ?? "Complete the required artist intake fields.");
  }

  const intake = parsed.data;
  const result = await upsertArtistIntakeLead({
    service,
    actorUserId: viewer.userId,
    ...intake,
    assignedTo: asString(formData, "assigned_to") || viewer.userId
  }).catch((error: Error) => flashRedirect(redirectTo, "error", error.message));

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: result.leadId,
    entityType: "artist_lead",
    entityId: result.leadId,
    action: result.created ? "lead_created" : "lead_updated",
    metadata: { email: intake.email, stageName: intake.stageName || null, completeness: "contract_ready" }
  });

  revalidatePath("/admin/signing");
  revalidatePath("/admin/signing/artists");
  flashRedirect(redirectTo, "success", result.created ? "Artist lead created." : "Existing signing lead updated.");
}

export async function createArtistLeadFromExistingArtistAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/artists");
  const artistId = asString(formData, "artist_id");

  const { data: artist, error } = await service
    .from("artists")
    .select("id,name,stage_name,slug,booking_email,primary_genre,territory,contacts,instagram_url,tiktok_url,youtube_url,spotify_url,x_url,facebook_url")
    .eq("id", artistId)
    .maybeSingle();

  if (error || !artist) {
    flashRedirect(redirectTo, "error", error?.message ?? "Artist not found.");
  }

  const email = String(artist.booking_email ?? "").trim().toLowerCase();
  if (!email) {
    flashRedirect(redirectTo, "error", "This artist does not have a primary email.");
  }

  const contacts = (artist.contacts ?? {}) as Record<string, unknown>;
  const result = await upsertArtistIntakeLead({
    service,
    actorUserId: viewer.userId,
    legalName: String(artist.name),
    stageName: String(artist.stage_name ?? artist.name),
    email,
    professionalEmail: null,
    phone: String(contacts.phone ?? ""),
    dateOfBirth: "",
    nationality: "",
    residenceCity: "",
    residenceCountry: "",
    residenceStateRegion: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    governmentId: "",
    primaryGenre: String(artist.primary_genre ?? ""),
    representingCountry: String(artist.territory ?? ""),
    managerName: String(contacts.managerName ?? ""),
    managerEmail: String(contacts.managerEmail ?? ""),
    managerPhone: "",
    proAffiliation: "none",
    ipiNumber: "",
    socialLinks: parseArtistCatalogSocialLinks(artist),
    notes: `Imported from existing artist catalog: ${artist.slug}`,
    assignedTo: viewer.userId
  }).catch((upsertError: Error) => flashRedirect(redirectTo, "error", upsertError.message));

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: result.leadId,
    entityType: "artist_lead",
    entityId: result.leadId,
    action: result.created ? "lead_created_from_existing_artist" : "lead_synced_from_existing_artist",
    metadata: {
      artistId: String(artist.id),
      artistSlug: String(artist.slug),
      email
    }
  });

  revalidatePath("/admin/signing");
  revalidatePath("/admin/signing/artists");
  flashRedirect(redirectTo, "success", result.created ? "Existing artist added to signing." : "Existing artist synced to signing.");
}

export async function updateArtistLeadStageAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/artists");
  const leadId = asString(formData, "lead_id");
  const status = asString(formData, "status");

  const { error } = await service.from("artist_leads").update({ status }).eq("id", leadId);
  if (error) {
    flashRedirect(redirectTo, "error", error.message);
  }

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "artist_lead",
    entityId: leadId,
    action: "pipeline_stage_updated",
    metadata: { status }
  });

  revalidatePath("/admin/signing");
  revalidatePath("/admin/signing/artists");
  flashRedirect(redirectTo, "success", "Pipeline stage updated.");
}

export async function createDealOfferAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/deals");
  const leadId = asString(formData, "artist_lead_id");

  const { data: offer, error } = await service
    .from("deal_offers")
    .insert({
      artist_lead_id: leadId,
      offer_type: "50_50_artist_deal",
      royalty_split_label: asNullableNumber(formData, "royalty_split_label") ?? 50,
      royalty_split_artist: asNullableNumber(formData, "royalty_split_artist") ?? 50,
      advance_amount: asNullableNumber(formData, "advance_amount"),
      term_months: asNullableNumber(formData, "term_months"),
      term_description: asString(formData, "term_description") || null,
      territory: asString(formData, "territory") || "Worldwide",
      includes_360: asBool(formData, "includes_360"),
      includes_publishing: asBool(formData, "includes_publishing"),
      expires_at: asString(formData, "expires_at") || null,
      clause_overrides: {
        perpetual_master_rights: asBool(formData, "perpetual_master_rights")
      },
      created_by: viewer.userId
    })
    .select("id")
    .single();

  if (error || !offer) {
    flashRedirect(redirectTo, "error", error?.message ?? "Failed to create offer.");
  }

  await service.from("artist_leads").update({ status: "internal_review" }).eq("id", leadId);

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "deal_offer",
    entityId: String(offer.id),
    action: "offer_created"
  });

  revalidatePath("/admin/signing");
  revalidatePath("/admin/signing/deals");
  flashRedirect(redirectTo, "success", "Deal offer created.");
}

export async function generateContractDraftAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/contracts");

  const leadId = asString(formData, "artist_lead_id");
  const offerId = asString(formData, "deal_offer_id");
  const templateId = asString(formData, "contract_template_id");

  const [{ data: lead }, { data: offer }, { data: template }] = await Promise.all([
    service.from("artist_leads").select("*").eq("id", leadId).maybeSingle(),
    service.from("deal_offers").select("*").eq("id", offerId).maybeSingle(),
    service.from("contract_templates").select("*").eq("id", templateId).maybeSingle()
  ]);

  if (!lead || !offer || !template) {
    flashRedirect(redirectTo, "error", "Lead, offer, or template not found.");
  }

  const { data: contractRow, error: contractCreateError } = await service
    .from("contracts")
    .insert({
      artist_lead_id: leadId,
      deal_offer_id: offerId,
      contract_template_id: templateId,
      status: "draft",
      created_by: viewer.userId
    })
    .select("*")
    .single();

  if (contractCreateError || !contractRow) {
    flashRedirect(redirectTo, "error", contractCreateError?.message ?? "Failed to create contract.");
  }

  const clauses = resolveContractClauses(formData, template.clause_schema ?? {}, {
    includes360: Boolean(offer.includes_360),
    includesPublishing: Boolean(offer.includes_publishing)
  });
  const variables = mergeTemplateVariables(template.default_variables ?? {}, withDefinedValues(buildContractVariableOverrides(formData, lead, offer)));

  const contract = {
    id: String(contractRow.id),
    contractVersionNumber: 0,
    status: "draft"
  } as Contract;

  await renderAndPersistContractVersion({
    service,
    contract,
    lead,
    template,
    variables,
    clauses,
    actorUserId: viewer.userId,
    includeDraftWatermark: true
  });

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    contractId: String(contractRow.id),
    entityType: "contract",
    entityId: String(contractRow.id),
    action: "contract_draft_generated"
  });

  await appendSignatureEvent(service, {
    contractId: String(contractRow.id),
    eventType: "draft_generated",
    metadata: { version: 1 }
  });

  revalidatePath("/admin/signing");
  revalidatePath("/admin/signing/contracts");
  flashRedirect(redirectTo, "success", "Contract draft generated.");
}

export async function regenerateContractDraftAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/contracts");
  const contractId = asString(formData, "contract_id");

  const { data: contract } = await service.from("contracts").select("*").eq("id", contractId).maybeSingle();
  if (!contract) {
    flashRedirect(redirectTo, "error", "Contract not found.");
  }
  if (contract.locked_at || contract.status === "fully_executed") {
    flashRedirect(redirectTo, "error", "Executed contracts are locked.");
  }

  const [{ data: lead }, { data: offer }, { data: template }, { data: latestVersion }] = await Promise.all([
    service.from("artist_leads").select("*").eq("id", contract.artist_lead_id).maybeSingle(),
    contract.deal_offer_id ? service.from("deal_offers").select("*").eq("id", contract.deal_offer_id).maybeSingle() : Promise.resolve({ data: null as any }),
    service.from("contract_templates").select("*").eq("id", contract.contract_template_id).maybeSingle(),
    service
      .from("contract_versions")
      .select("*")
      .eq("contract_id", contractId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (!lead || !template) {
    flashRedirect(redirectTo, "error", "Lead or template missing.");
  }

  const priorVariables = latestVersion?.variables_snapshot ?? {};
  const clauses = resolveContractClauses(formData, priorVariables.clauses ?? template.clause_schema ?? {}, {
    includes360: Boolean(offer?.includes_360),
    includesPublishing: Boolean(offer?.includes_publishing)
  });
  const variables = mergeTemplateVariables(
    template.default_variables ?? {},
    withDefinedValues({
      ...(priorVariables as Record<string, unknown>),
      ...buildContractVariableOverrides(formData, lead, offer ?? {})
    })
  );

  await renderAndPersistContractVersion({
    service,
    contract: mapContractRow(contract),
    lead,
    template,
    variables,
    clauses,
    actorUserId: viewer.userId,
    includeDraftWatermark: true
  });

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: String(contract.artist_lead_id),
    contractId,
    entityType: "contract",
    entityId: contractId,
    action: "contract_draft_regenerated"
  });

  await appendSignatureEvent(service, {
    contractId,
    eventType: "draft_regenerated"
  });

  revalidatePath("/admin/signing/contracts");
  revalidatePath(`/admin/signing/contracts/${contractId}`);
  flashRedirect(redirectTo, "success", "Contract draft regenerated.");
}

function mapContractRow(row: any): Contract {
  return {
    id: String(row.id),
    artistLeadId: String(row.artist_lead_id),
    dealOfferId: row.deal_offer_id ? String(row.deal_offer_id) : null,
    contractTemplateId: String(row.contract_template_id),
    currentVersionId: row.current_version_id ? String(row.current_version_id) : null,
    contractVersionNumber: Number(row.contract_version_number ?? 1),
    renderedMarkdown: row.rendered_markdown ? String(row.rendered_markdown) : null,
    renderedHtml: row.rendered_html ? String(row.rendered_html) : null,
    draftPdfPath: row.draft_pdf_path ? String(row.draft_pdf_path) : null,
    executedPdfPath: row.executed_pdf_path ? String(row.executed_pdf_path) : null,
    status: row.status,
    viewedAt: row.viewed_at ? String(row.viewed_at) : null,
    artistSignedAt: row.artist_signed_at ? String(row.artist_signed_at) : null,
    labelSignedAt: row.label_signed_at ? String(row.label_signed_at) : null,
    fullyExecutedAt: row.fully_executed_at ? String(row.fully_executed_at) : null,
    lockedAt: row.locked_at ? String(row.locked_at) : null,
    inviteLastSentAt: row.invite_last_sent_at ? String(row.invite_last_sent_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

async function sendInviteEmailFlow(params: {
  service: ReturnType<typeof createServiceClient>;
  lead: any;
  contract: any;
  contractName: string;
  token: string;
  actorUserId: string;
}) {
  const inviteUrl = `${normalizeBaseUrl()}/sign/${params.token}?email=${encodeURIComponent(String(params.lead.email))}`;
  const inviteEmail = buildInviteToReviewOfferEmail({
    artistName: params.lead.stage_name || params.lead.legal_name,
    contractName: params.contractName,
    actionUrl: inviteUrl
  });

  const signingEmail = buildSignAgreementEmail({
    artistName: params.lead.stage_name || params.lead.legal_name,
    contractName: params.contractName,
    actionUrl: inviteUrl
  });

  const inviteResult = await sendTransactionalEmail({
    to: String(params.lead.email),
    ...inviteEmail
  });
  const signResult = await sendTransactionalEmail({
    to: String(params.lead.email),
    ...signingEmail
  });

  await createSigningMessage(params.service, {
    artistLeadId: String(params.lead.id),
    contractId: String(params.contract.id),
    senderUserId: params.actorUserId,
    recipientRole: "artist",
    subject: "New agreement ready for review",
    body: `Your ${params.contractName} is ready. Review and sign it in your artist dashboard or with your secure invite link: ${inviteUrl}`
  });

  await createInAppNotification(params.service, {
    artistLeadId: String(params.lead.id),
    type: "signing_invite_sent",
    title: "Agreement ready to review",
    body: `EM Records sent your ${params.contractName}. Review the terms and sign in your dashboard.`,
    metadata: {
      actionUrl: "/dashboard/signing/agreement",
      actionLabel: "Open agreement",
      inviteUrl,
      inviteDelivered: inviteResult.delivered,
      signDelivered: signResult.delivered
    }
  });

  return { inviteUrl, inviteResult, signResult };
}

export async function sendSigningInviteAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/contracts");
  const contractId = asString(formData, "contract_id");
  const expiresAt = asString(formData, "expires_at");

  const { data: contract } = await service.from("contracts").select("*").eq("id", contractId).maybeSingle();
  if (!contract) {
    flashRedirect(redirectTo, "error", "Contract not found.");
  }
  const [{ data: lead }, { data: template }] = await Promise.all([
    service.from("artist_leads").select("*").eq("id", contract.artist_lead_id).maybeSingle(),
    service.from("contract_templates").select("name").eq("id", contract.contract_template_id).maybeSingle()
  ]);
  if (!lead) {
    flashRedirect(redirectTo, "error", "Artist lead not found.");
  }

  const tokenPair = generateInviteToken();
  const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error: tokenError } = await service.from("invite_tokens").insert({
    contract_id: contractId,
    email: lead.email,
    token_hash: tokenPair.tokenHash,
    expires_at: expires.toISOString(),
    created_by: viewer.userId
  });

  if (tokenError) {
    flashRedirect(redirectTo, "error", tokenError.message);
  }

  await service.from("contracts").update({ status: "offer_sent", invite_last_sent_at: new Date().toISOString() }).eq("id", contractId);
  await service.from("artist_leads").update({ status: "offer_sent" }).eq("id", lead.id);
  await service.from("deal_offers").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", contract.deal_offer_id);

  const sendResult = await sendInviteEmailFlow({
    service,
    lead,
    contract,
    contractName: String(template?.name ?? OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME),
    token: tokenPair.token,
    actorUserId: viewer.userId
  });

  await appendSignatureEvent(service, {
    contractId,
    eventType: "invite_sent",
    metadata: { expiresAt: expires.toISOString(), inviteUrl: sendResult.inviteUrl }
  });

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: String(lead.id),
    contractId,
    entityType: "invite",
    entityId: tokenPair.tokenHash,
    action: "invite_sent",
    metadata: {
      expiresAt: expires.toISOString(),
      inviteDelivered: sendResult.inviteResult.delivered,
      signDelivered: sendResult.signResult.delivered
    }
  });

  revalidatePath("/admin/signing/contracts");
  flashRedirect(redirectTo, "success", "Signing invite sent.");
}

export async function sendSignatureReminderAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/contracts");
  const contractId = asString(formData, "contract_id");

  const [{ data: contract }, { data: contractLead }] = await Promise.all([
    service.from("contracts").select("*").eq("id", contractId).maybeSingle(),
    service.from("contracts").select("artist_leads(*)").eq("id", contractId).maybeSingle()
  ]);

  const lead = (contractLead as any)?.artist_leads;
  if (!contract || !lead) {
    flashRedirect(redirectTo, "error", "Contract or lead not found.");
  }

  const { data: template } = await service.from("contract_templates").select("name").eq("id", contract.contract_template_id).maybeSingle();
  const contractName = String(template?.name ?? OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME);

  const tokenPair = generateInviteToken();
  const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  await service.from("invite_tokens").insert({
    contract_id: contractId,
    email: lead.email,
    token_hash: tokenPair.tokenHash,
    expires_at: expires.toISOString(),
    created_by: viewer.userId
  });

  const inviteUrl = `${normalizeBaseUrl()}/sign/${tokenPair.token}?email=${encodeURIComponent(String(lead.email))}`;
  const emailPayload = buildSignAgreementEmail({
    artistName: lead.stage_name || lead.legal_name,
    contractName,
    actionUrl: inviteUrl
  });
  const reminderResult = await sendTransactionalEmail({ to: String(lead.email), ...emailPayload });

  await createInAppNotification(service, {
    artistLeadId: String(lead.id),
    type: "signature_reminder",
    title: "Reminder to sign your agreement",
    body: `Your ${contractName} is still waiting for your signature.`,
    metadata: {
      actionUrl: "/dashboard/signing/agreement",
      actionLabel: "Review agreement",
      inviteUrl,
      expiresAt: expires.toISOString()
    }
  });

  await appendSignatureEvent(service, {
    contractId,
    eventType: "signature_reminder_sent",
    metadata: { inviteUrl, delivered: reminderResult.delivered }
  });

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: String(lead.id),
    contractId,
    entityType: "invite",
    entityId: tokenPair.tokenHash,
    action: "signature_reminder_sent",
    metadata: { delivered: reminderResult.delivered, expiresAt: expires.toISOString() }
  });

  revalidatePath("/admin/signing/contracts");
  flashRedirect(redirectTo, "success", "Signature reminder sent.");
}

export async function sendOnboardingReminderAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/artists");
  const leadId = asString(formData, "lead_id");

  const [{ data: lead }, { count: pendingTasksCount }] = await Promise.all([
    service.from("artist_leads").select("*").eq("id", leadId).maybeSingle(),
    service.from("onboarding_tasks").select("id", { count: "exact", head: true }).eq("artist_lead_id", leadId).eq("completed", false)
  ]);

  if (!lead) {
    flashRedirect(redirectTo, "error", "Lead not found.");
  }

  const emailPayload = buildOnboardingIncompleteReminderEmail({
    artistName: lead.stage_name || lead.legal_name,
    actionUrl: `${normalizeBaseUrl()}/dashboard/signing/checklist`
  });
  const result = await sendTransactionalEmail({ to: String(lead.email), ...emailPayload });

  await createInAppNotification(service, {
    artistLeadId: leadId,
    type: "onboarding_reminder",
    title: "Onboarding reminder",
    body: "Please complete your pending onboarding steps in the artist portal.",
    metadata: {
      pendingTasks: pendingTasksCount ?? 0,
      actionUrl: "/dashboard/signing/checklist",
      actionLabel: "Open checklist"
    }
  });

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "onboarding",
    entityId: leadId,
    action: "onboarding_reminder_sent",
    metadata: {
      delivered: result.delivered,
      pendingTasks: pendingTasksCount ?? 0
    }
  });

  revalidatePath("/admin/signing/artists");
  flashRedirect(redirectTo, "success", "Onboarding reminder sent.");
}

export async function revokePendingInviteAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/contracts");
  const inviteId = asString(formData, "invite_id");

  const { data: invite } = await service.from("invite_tokens").select("id,contract_id").eq("id", inviteId).maybeSingle();
  if (!invite) flashRedirect(redirectTo, "error", "Invite not found.");

  await service.from("invite_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId);

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    contractId: String(invite.contract_id),
    entityType: "invite",
    entityId: inviteId,
    action: "invite_revoked"
  });

  revalidatePath("/admin/signing/contracts");
  flashRedirect(redirectTo, "success", "Invite revoked.");
}

export async function countersignContractAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/contracts");
  const contractId = asString(formData, "contract_id");
  const signerName = asString(formData, "signer_name") || "EM Records Authorized Signatory";
  const signerEmail = asString(formData, "signer_email") || process.env.SIGNING_LABEL_SIGNER_EMAIL || "legal@emrecordsmusic.com";
  const consentAccepted = asBool(formData, "consent_accepted");
  const signatureData = asString(formData, "signature_data");

  if (!consentAccepted) {
    flashRedirect(redirectTo, "error", "Countersigner consent is required.");
  }
  if (!signatureData) {
    flashRedirect(redirectTo, "error", "Signature is required.");
  }

  const [{ data: contract }, { data: headerLead }] = await Promise.all([
    service.from("contracts").select("*").eq("id", contractId).maybeSingle(),
    service
      .from("contracts")
      .select("artist_leads(*)")
      .eq("id", contractId)
      .maybeSingle()
  ]);

  if (!contract) flashRedirect(redirectTo, "error", "Contract not found.");
  const lead = (headerLead as any)?.artist_leads;
  if (!lead) flashRedirect(redirectTo, "error", "Lead not found.");
  if (contract.status !== "artist_signed") {
    flashRedirect(redirectTo, "error", "Artist signature is required before countersign.");
  }

  const headerStore = await headers();
  const ipAddress = parseIpAddress(headerStore.get("x-forwarded-for"));
  const userAgent = headerStore.get("user-agent");

  const signaturePath = await persistSignatureImage({
    service,
    leadId: String(lead.id),
    contractId,
    role: "label",
    signatureData
  });

  await service.from("contract_signers").upsert(
    {
      contract_id: contractId,
      signer_role: "label",
      signer_name: signerName,
      signer_email: signerEmail,
      signature_data: signatureData,
      signature_path: signaturePath,
      signed_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      consent_accepted: true
    },
    { onConflict: "contract_id,signer_role" }
  );

  await service.from("contracts").update({ status: "label_counter_signed" }).eq("id", contractId);
  await service.from("artist_leads").update({ status: "label_counter_signed" }).eq("id", lead.id);

  await appendSignatureEvent(service, {
    contractId,
    signerRole: "label",
    eventType: "label_signed",
    ipAddress,
    userAgent,
    metadata: { signerName, signerEmail, consentAccepted: true }
  });

  const executedPath = await finalizeExecutedContract({
    service,
    contractId,
    lead,
    actorUserId: viewer.userId
  });

  await createInAppNotification(service, {
    artistLeadId: String(lead.id),
    type: "contract_fully_executed",
    title: "Agreement fully executed",
    body: "Your agreement has been fully executed. Download your final PDF in the artist portal.",
    metadata: {
      contractId,
      executedPath,
      actionUrl: "/dashboard/signing/agreement",
      actionLabel: "View executed agreement"
    }
  });

  const completedEmail = buildContractCompletedEmail({
    artistName: lead.stage_name || lead.legal_name,
    labelName: process.env.EM_RECORDS_LEGAL_ENTITY || EM_RECORDS_DEFAULT_LEGAL_ENTITY,
    actionUrl: `${normalizeBaseUrl()}/dashboard/signing/agreement`
  });
  const welcomeEmail = buildWelcomeToEmRecordsEmail({
    artistName: lead.stage_name || lead.legal_name,
    actionUrl: `${normalizeBaseUrl()}/dashboard/signing`
  });

  await sendTransactionalEmail({ to: String(lead.email), ...completedEmail });
  await sendTransactionalEmail({ to: String(lead.email), ...welcomeEmail });

  revalidatePath("/admin/signing/contracts");
  revalidatePath("/dashboard/signing");
  flashRedirect(redirectTo, "success", "Contract countersigned and executed.");
}

export async function archiveContractAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/contracts");
  const contractId = asString(formData, "contract_id");

  const { data: contract } = await service.from("contracts").select("id,artist_lead_id").eq("id", contractId).maybeSingle();
  if (!contract) flashRedirect(redirectTo, "error", "Contract not found.");

  await service.from("contracts").update({ status: "archived" }).eq("id", contractId);
  await service.from("artist_leads").update({ status: "archived" }).eq("id", contract.artist_lead_id);

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: String(contract.artist_lead_id),
    contractId,
    entityType: "contract",
    entityId: contractId,
    action: "contract_archived"
  });

  revalidatePath("/admin/signing/contracts");
  flashRedirect(redirectTo, "success", "Contract archived.");
}

export async function upsertContractTemplateAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/templates");

  const templateId = asString(formData, "template_id");
  const payload = {
    name: asString(formData, "name") || OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_NAME,
    version_name: asString(formData, "version_name") || OFFICIAL_RECORDING_AGREEMENT_TEMPLATE_VERSION,
    body_markdown: asString(formData, "body_markdown") || OFFICIAL_RECORDING_AGREEMENT_BODY_MARKDOWN,
    clause_schema: {
      ...OFFICIAL_RECORDING_AGREEMENT_CLAUSE_SCHEMA,
      includes_publishing: asBool(formData, "schema_includes_publishing"),
      includes_360: asBool(formData, "schema_includes_360"),
      perpetual_master_rights: asBool(formData, "schema_perpetual_master_rights")
    },
    default_variables: {
      ...OFFICIAL_RECORDING_AGREEMENT_DEFAULT_VARIABLES,
      label_legal_entity: asString(formData, "default_label_legal_entity") || process.env.EM_RECORDS_LEGAL_ENTITY || EM_RECORDS_DEFAULT_LEGAL_ENTITY,
      accounting_frequency: asString(formData, "default_accounting_frequency") || "Quarterly"
    },
    active: asBool(formData, "active"),
    created_by: viewer.userId
  };

  if (!payload.name || !payload.version_name || !payload.body_markdown) {
    flashRedirect(redirectTo, "error", "Template name, version and body are required.");
  }

  const operation = templateId
    ? service.from("contract_templates").update(payload).eq("id", templateId)
    : service.from("contract_templates").insert(payload);

  const { error } = await operation;
  if (error) flashRedirect(redirectTo, "error", error.message);

  revalidatePath("/admin/signing/templates");
  flashRedirect(redirectTo, "success", templateId ? "Template updated." : "Template created.");
}

export async function artistSignContractWithInviteAction(formData: FormData) {
  const service = createServiceClient();
  const token = asString(formData, "token");
  const email = asString(formData, "email").toLowerCase();
  const signerName = asString(formData, "signer_name");
  const signatureData = asString(formData, "signature_data");
  const consentAccepted = asBool(formData, "consent_accepted");

  if (!token || !email || !signerName || !signatureData || !consentAccepted) {
    flashRedirect(`/sign/${token}?email=${encodeURIComponent(email)}`, "error", "All signing fields and consent are required.");
  }

  const tokenResolution = await resolveInviteToken(service, token, email);
  if (tokenResolution.error || !tokenResolution.invite) {
    flashRedirect(`/sign/${token}`, "error", tokenResolution.error ?? "Invite is invalid.");
  }

  const contractId = String(tokenResolution.invite.contract_id);
  const [{ data: contract }, { data: lead }] = await Promise.all([
    service.from("contracts").select("*").eq("id", contractId).maybeSingle(),
    service
      .from("contracts")
      .select("artist_leads(*)")
      .eq("id", contractId)
      .maybeSingle()
      .then((row) => ({ data: (row.data as any)?.artist_leads ?? null }))
  ]);

  if (!contract || !lead) {
    flashRedirect(`/sign/${token}`, "error", "Contract or lead was not found.");
  }

  if (!["offer_sent", "artist_viewed_offer", "draft"].includes(String(contract.status))) {
    flashRedirect(`/sign/${token}?email=${encodeURIComponent(email)}`, "error", "This contract can no longer be signed.");
  }

  const headerStore = await headers();
  const ipAddress = parseIpAddress(headerStore.get("x-forwarded-for"));
  const userAgent = headerStore.get("user-agent");

  const signaturePath = await persistSignatureImage({
    service,
    leadId: String(lead.id),
    contractId,
    role: "artist",
    signatureData
  });

  await service.from("contract_signers").upsert(
    {
      contract_id: contractId,
      signer_role: "artist",
      signer_name: signerName,
      signer_email: email,
      signature_data: signatureData,
      signature_path: signaturePath,
      signed_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      consent_accepted: true
    },
    { onConflict: "contract_id,signer_role" }
  );

  await service.from("contracts").update({ status: "artist_signed" }).eq("id", contractId);
  await service.from("artist_leads").update({ status: "artist_signed" }).eq("id", lead.id);
  await service.from("deal_offers").update({ status: "accepted" }).eq("id", contract.deal_offer_id);
  await service.from("invite_tokens").update({ used_at: new Date().toISOString() }).eq("id", tokenResolution.invite.id);

  await appendSignatureEvent(service, {
    contractId,
    signerRole: "artist",
    eventType: "artist_signed",
    ipAddress,
    userAgent,
    metadata: { signerName, signerEmail: email, consentAccepted: true }
  });

  await appendSigningAuditLog(service, {
    artistLeadId: String(lead.id),
    contractId,
    entityType: "contract_signature",
    entityId: contractId,
    action: "artist_signed_via_invite",
    metadata: { signerEmail: email }
  });

  await createInAppNotification(service, {
    artistLeadId: String(lead.id),
    type: "artist_signed",
    title: "Your signature was captured",
    body: "Your signature has been captured. The agreement is now waiting for EM Records countersignature.",
    metadata: {
      contractId,
      actionUrl: "/dashboard/signing/agreement",
      actionLabel: "View agreement status"
    }
  });

  flashRedirect(`/sign/${token}?email=${encodeURIComponent(email)}`, "success", "Signature captured. EM Records will countersign next.");
}

export async function markOfferViewedAction(formData: FormData) {
  const service = createServiceClient();
  const token = asString(formData, "token");
  const email = asString(formData, "email").toLowerCase();
  const redirectTo = `/sign/${token}?email=${encodeURIComponent(email)}`;

  const resolution = await resolveInviteToken(service, token, email);
  if (resolution.error || !resolution.invite) {
    flashRedirect(`/sign/${token}`, "error", resolution.error ?? "Invalid invite.");
  }

  const contractId = String(resolution.invite.contract_id);
  const { data: contract } = await service.from("contracts").select("id,status,artist_lead_id").eq("id", contractId).maybeSingle();
  if (!contract) flashRedirect(`/sign/${token}`, "error", "Contract not found.");

  if (contract.status === "offer_sent") {
    await service.from("contracts").update({ status: "artist_viewed_offer", viewed_at: new Date().toISOString() }).eq("id", contractId);
    await service.from("artist_leads").update({ status: "artist_viewed_offer" }).eq("id", contract.artist_lead_id);
    await service.from("deal_offers").update({ status: "viewed" }).eq("artist_lead_id", contract.artist_lead_id);
    await appendSignatureEvent(service, {
      contractId,
      signerRole: "artist",
      eventType: "offer_viewed"
    });
  }

  flashRedirect(redirectTo, "success", "Offer marked as viewed.");
}

export async function artistPortalSignContractAction(formData: FormData) {
  const viewer = await requireViewer();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/dashboard/signing/agreement");
  const contractId = asString(formData, "contract_id");
  const signerName = asString(formData, "signer_name");
  const signatureData = asString(formData, "signature_data");
  const consentAccepted = asBool(formData, "consent_accepted");

  if (!consentAccepted || !signerName || !signatureData) {
    flashRedirect(redirectTo, "error", "Signature and consent are required.");
  }

  const { data: contract } = await service.from("contracts").select("*").eq("id", contractId).maybeSingle();
  if (!contract || !viewer.leadIds.includes(String(contract.artist_lead_id))) {
    flashRedirect(redirectTo, "error", "You do not have access to this contract.");
  }

  const headerStore = await headers();
  const ipAddress = parseIpAddress(headerStore.get("x-forwarded-for"));
  const userAgent = headerStore.get("user-agent");

  const leadRow = await service.from("artist_leads").select("*").eq("id", contract.artist_lead_id).maybeSingle();
  const lead = leadRow.data;
  if (!lead) flashRedirect(redirectTo, "error", "Lead not found.");

  const signaturePath = await persistSignatureImage({
    service,
    leadId: String(lead.id),
    contractId,
    role: "artist",
    signatureData
  });

  await service.from("contract_signers").upsert(
    {
      contract_id: contractId,
      signer_role: "artist",
      signer_name: signerName,
      signer_email: viewer.email || lead.email,
      signature_data: signatureData,
      signature_path: signaturePath,
      signed_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      consent_accepted: true
    },
    { onConflict: "contract_id,signer_role" }
  );

  await service.from("contracts").update({ status: "artist_signed" }).eq("id", contractId);
  await service.from("artist_leads").update({ status: "artist_signed" }).eq("id", contract.artist_lead_id);
  await service.from("deal_offers").update({ status: "accepted" }).eq("id", contract.deal_offer_id);

  await appendSignatureEvent(service, {
    contractId,
    signerRole: "artist",
    eventType: "artist_signed_portal",
    ipAddress,
    userAgent
  });

  await createInAppNotification(service, {
    artistLeadId: String(lead.id),
    type: "artist_signed",
    title: "Your signature was captured",
    body: "Your signature has been captured. The agreement is now waiting for EM Records countersignature.",
    metadata: {
      contractId,
      actionUrl: "/dashboard/signing/agreement",
      actionLabel: "View agreement status"
    }
  });

  revalidatePath("/dashboard/signing");
  revalidatePath("/dashboard/signing/agreement");
  flashRedirect(redirectTo, "success", "Agreement signed. Waiting for EM Records countersignature.");
}

async function updateLeadAndLinkedProfile(service: ReturnType<typeof createServiceClient>, leadId: string, payload: Record<string, unknown>) {
  const { data: leadRow, error: leadLookupError } = await service.from("artist_leads").select("artist_profile_id").eq("id", leadId).maybeSingle();
  if (leadLookupError || !leadRow) {
    throw new Error(leadLookupError?.message ?? "Lead not found.");
  }

  const leadRes = await service.from("artist_leads").update(payload).eq("id", leadId);
  if (leadRes.error) {
    throw new Error(leadRes.error.message);
  }

  if (leadRow.artist_profile_id) {
    const profileRes = await service.from("artist_profiles").update(payload).eq("id", String(leadRow.artist_profile_id));
    if (profileRes.error) {
      throw new Error(profileRes.error.message);
    }
  }
}

export async function updateArtistProfileFromPortalAction(formData: FormData) {
  const viewer = await requireViewer();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/dashboard/signing/profile");
  const leadId = asString(formData, "lead_id");

  if (!viewer.leadIds.includes(leadId)) {
    flashRedirect(redirectTo, "error", "Unauthorized lead access.");
  }

  const parsed = parseArtistIntakeFormData(formData, { emailField: "email" });
  if (!parsed.success) {
    flashRedirect(redirectTo, "error", parsed.error.issues[0]?.message ?? "Complete the required artist profile fields.");
  }

  const intake = parsed.data;
  const payload = buildArtistIntakeDbPayload(intake);

  await updateLeadAndLinkedProfile(service, leadId, payload).catch((error: Error) => flashRedirect(redirectTo, "error", error.message));

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "artist_lead",
    entityId: leadId,
    action: "artist_profile_updated",
    metadata: {
      missingCriticalFields: getMissingCriticalArtistFields({
        legalName: intake.legalName,
        stageName: intake.stageName,
        email: intake.email,
        phone: intake.phone,
        dateOfBirth: intake.dateOfBirth,
        nationality: intake.nationality,
        residenceCity: intake.residenceCity,
        residenceCountry: intake.residenceCountry,
        addressLine1: intake.addressLine1,
        primaryGenre: intake.primaryGenre,
        representingCountry: intake.representingCountry,
        socialLinks: intake.socialLinks
      })
    }
  });

  revalidatePath("/dashboard/signing/profile");
  revalidatePath("/admin/signing");
  revalidatePath("/admin/signing/artists");
  flashRedirect(redirectTo, "success", "Profile updated.");
}

export async function updateArtistLeadProfileByStaffAction(formData: FormData) {
  const viewer = await requireStaff();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/admin/signing/artists");
  const leadId = asString(formData, "lead_id");

  const parsed = parseArtistIntakeFormData(formData);
  if (!parsed.success) {
    flashRedirect(redirectTo, "error", parsed.error.issues[0]?.message ?? "Complete the required artist intake fields.");
  }

  const intake = parsed.data;
  const payload = buildArtistIntakeDbPayload(intake);

  await updateLeadAndLinkedProfile(service, leadId, payload).catch((error: Error) => flashRedirect(redirectTo, "error", error.message));

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "artist_lead",
    entityId: leadId,
    action: "artist_profile_updated_by_staff",
    metadata: {
      missingCriticalFields: getMissingCriticalArtistFields({
        legalName: intake.legalName,
        stageName: intake.stageName,
        email: intake.email,
        phone: intake.phone,
        dateOfBirth: intake.dateOfBirth,
        nationality: intake.nationality,
        residenceCity: intake.residenceCity,
        residenceCountry: intake.residenceCountry,
        addressLine1: intake.addressLine1,
        primaryGenre: intake.primaryGenre,
        representingCountry: intake.representingCountry,
        socialLinks: intake.socialLinks
      })
    }
  });

  revalidatePath("/admin/signing");
  revalidatePath("/admin/signing/artists");
  revalidatePath("/dashboard/signing/profile");
  flashRedirect(redirectTo, "success", "Artist intake updated.");
}

export async function toggleOnboardingTaskAction(formData: FormData) {
  const viewer = await requireViewer();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/dashboard/signing/checklist");
  const taskId = asString(formData, "task_id");
  const completed = asBool(formData, "completed");
  const leadId = asString(formData, "lead_id");

  if (!viewer.isStaff && !viewer.leadIds.includes(leadId)) {
    flashRedirect(redirectTo, "error", "Unauthorized.");
  }

  const { error } = await service
    .from("onboarding_tasks")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null
    })
    .eq("id", taskId);

  if (error) {
    flashRedirect(redirectTo, "error", error.message);
  }

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "onboarding_task",
    entityId: taskId,
    action: completed ? "task_completed" : "task_reopened"
  });

  revalidatePath("/dashboard/signing/checklist");
  revalidatePath("/admin/signing");
  flashRedirect(redirectTo, "success", "Checklist updated.");
}

export async function uploadArtistDocumentPortalAction(formData: FormData) {
  const viewer = await requireViewer();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/dashboard/signing/documents");
  const leadId = asString(formData, "lead_id");
  const type = asString(formData, "type") || "general";
  const fileValue = formData.get("file");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  if (!viewer.isStaff && !viewer.leadIds.includes(leadId)) {
    flashRedirect(redirectTo, "error", "Unauthorized.");
  }
  if (!file) {
    flashRedirect(redirectTo, "error", "Document file is required.");
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${leadId}/documents/${Date.now()}-${randomUUID()}-${sanitizedName}`;

  const { error: uploadError } = await service.storage.from("signing-documents").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    flashRedirect(redirectTo, "error", uploadError.message);
  }

  const { error: dbError } = await service.from("artist_documents").insert({
    artist_lead_id: leadId,
    type,
    file_path: toStorageUrl("signing-documents", path),
    file_name: file.name,
    status: "uploaded",
    uploaded_by: viewer.userId
  });

  if (dbError) {
    flashRedirect(redirectTo, "error", dbError.message);
  }

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "artist_document",
    entityId: path,
    action: "document_uploaded",
    metadata: { type, fileName: file.name }
  });

  revalidatePath("/dashboard/signing/documents");
  revalidatePath("/admin/signing");
  flashRedirect(redirectTo, "success", "Document uploaded.");
}

export async function createPortalMessageAction(formData: FormData) {
  const viewer = await requireViewer();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/dashboard/signing/messages");
  const leadId = asString(formData, "lead_id");
  const body = asString(formData, "body");
  const subject = asString(formData, "subject");

  if (!body) {
    flashRedirect(redirectTo, "error", "Message body is required.");
  }

  if (!viewer.isStaff && !viewer.leadIds.includes(leadId)) {
    flashRedirect(redirectTo, "error", "Unauthorized.");
  }

  await createSigningMessage(service, {
    artistLeadId: leadId,
    senderUserId: viewer.userId,
    recipientRole: viewer.isStaff ? "artist" : "label",
    subject: subject || null,
    body
  });

  await appendSigningAuditLog(service, {
    actorUserId: viewer.userId,
    artistLeadId: leadId,
    entityType: "message",
    entityId: leadId,
    action: "portal_message_sent"
  });

  revalidatePath("/dashboard/signing/messages");
  revalidatePath("/admin/signing");
  flashRedirect(redirectTo, "success", "Message sent.");
}

export async function markNotificationReadAction(formData: FormData) {
  const viewer = await requireViewer();
  const service = createServiceClient();
  const redirectTo = getRedirectTo(formData, "/dashboard/signing");
  const notificationId = asString(formData, "notification_id");

  const { data: notification } = await service
    .from("notifications")
    .select("id,user_id,artist_lead_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (!notification) {
    flashRedirect(redirectTo, "error", "Notification not found.");
  }

  const scopedLeadId = notification.artist_lead_id ? String(notification.artist_lead_id) : null;
  const hasLeadAccess = scopedLeadId ? viewer.leadIds.includes(scopedLeadId) : false;
  const hasUserAccess = notification.user_id ? String(notification.user_id) === viewer.userId : false;

  if (!hasLeadAccess && !hasUserAccess) {
    flashRedirect(redirectTo, "error", "Unauthorized notification access.");
  }

  const { error } = await service.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
  if (error) {
    flashRedirect(redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/signing");
  flashRedirect(redirectTo, "success", "Notification marked as read.");
}
