import { redirect } from "next/navigation";
import { getCurrentUserRoleSnapshot } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ArtistDocument,
  ArtistLead,
  ArtistMessage,
  Contract,
  ContractSigner,
  ContractTemplate,
  ContractVersion,
  DealOffer,
  NotificationRecord,
  OnboardingTask,
  SignatureEvent,
  SigningAdminStats
} from "@/lib/signing/types";

type SigningViewerContext = {
  userId: string;
  email: string | null;
  isStaff: boolean;
  leadIds: string[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapLead(row: any): ArtistLead {
  return {
    id: String(row.id),
    artistProfileId: row.artist_profile_id ? String(row.artist_profile_id) : null,
    legalName: String(row.legal_name),
    stageName: row.stage_name ? String(row.stage_name) : null,
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    country: row.country ? String(row.country) : null,
    state: row.state ? String(row.state) : null,
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : null,
    governmentName: row.government_name ? String(row.government_name) : null,
    proAffiliation: String(row.pro_affiliation) as ArtistLead["proAffiliation"],
    ipiNumber: row.ipi_number ? String(row.ipi_number) : null,
    socialLinks: (row.social_links ?? {}) as Record<string, string>,
    notes: row.notes ? String(row.notes) : null,
    status: String(row.status) as ArtistLead["status"],
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapOffer(row: any): DealOffer {
  return {
    id: String(row.id),
    artistLeadId: String(row.artist_lead_id),
    offerType: String(row.offer_type),
    royaltySplitLabel: Number(row.royalty_split_label),
    royaltySplitArtist: Number(row.royalty_split_artist),
    advanceAmount: row.advance_amount == null ? null : Number(row.advance_amount),
    termMonths: row.term_months == null ? null : Number(row.term_months),
    termDescription: row.term_description ? String(row.term_description) : null,
    territory: String(row.territory),
    includes360: Boolean(row.includes_360),
    includesPublishing: Boolean(row.includes_publishing),
    status: String(row.status) as DealOffer["status"],
    sentAt: row.sent_at ? String(row.sent_at) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    clauseOverrides: asRecord(row.clause_overrides),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapTemplate(row: any): ContractTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    versionName: String(row.version_name),
    bodyMarkdown: String(row.body_markdown),
    clauseSchema: asRecord(row.clause_schema),
    defaultVariables: asRecord(row.default_variables),
    active: Boolean(row.active),
    createdAt: String(row.created_at)
  };
}

function mapContract(row: any): Contract {
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
    status: String(row.status) as Contract["status"],
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

function mapContractVersion(row: any): ContractVersion {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    versionNumber: Number(row.version_number),
    templateSnapshot: String(row.template_snapshot),
    variablesSnapshot: asRecord(row.variables_snapshot),
    renderedMarkdown: String(row.rendered_markdown),
    renderedHtml: String(row.rendered_html),
    pdfPath: row.pdf_path ? String(row.pdf_path) : null,
    createdAt: String(row.created_at)
  };
}

function mapSigner(row: any): ContractSigner {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    signerRole: String(row.signer_role) as ContractSigner["signerRole"],
    signerName: String(row.signer_name),
    signerEmail: String(row.signer_email),
    signatureData: row.signature_data ? String(row.signature_data) : null,
    signaturePath: row.signature_path ? String(row.signature_path) : null,
    signedAt: row.signed_at ? String(row.signed_at) : null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    consentAccepted: Boolean(row.consent_accepted),
    createdAt: String(row.created_at)
  };
}

function mapSignatureEvent(row: any): SignatureEvent {
  return {
    id: String(row.id),
    contractId: String(row.contract_id),
    signerRole: row.signer_role ? (String(row.signer_role) as SignatureEvent["signerRole"]) : null,
    eventType: String(row.event_type),
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at)
  };
}

function mapTask(row: any): OnboardingTask {
  return {
    id: String(row.id),
    artistLeadId: String(row.artist_lead_id),
    taskKey: String(row.task_key),
    title: String(row.title),
    completed: Boolean(row.completed),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at)
  };
}

function mapDocument(row: any): ArtistDocument {
  return {
    id: String(row.id),
    artistLeadId: String(row.artist_lead_id),
    type: String(row.type),
    filePath: String(row.file_path),
    fileName: row.file_name ? String(row.file_name) : null,
    status: String(row.status),
    createdAt: String(row.created_at)
  };
}

function mapMessage(row: any): ArtistMessage {
  return {
    id: String(row.id),
    artistLeadId: String(row.artist_lead_id),
    contractId: row.contract_id ? String(row.contract_id) : null,
    senderUserId: row.sender_user_id ? String(row.sender_user_id) : null,
    recipientUserId: row.recipient_user_id ? String(row.recipient_user_id) : null,
    recipientRole: String(row.recipient_role),
    subject: row.subject ? String(row.subject) : null,
    body: String(row.body),
    status: String(row.status),
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null
  };
}

function mapNotification(row: any): NotificationRecord {
  return {
    id: String(row.id),
    artistLeadId: row.artist_lead_id ? String(row.artist_lead_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    metadata: asRecord(row.metadata),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.created_at)
  };
}

export async function getSigningViewerContext(): Promise<SigningViewerContext | null> {
  const snapshot = await getCurrentUserRoleSnapshot();
  if (!snapshot) return null;

  const service = createServiceClient();
  const { data: artistProfiles } = await service.from("artist_profiles").select("id").eq("user_id", snapshot.user.id);

  const artistProfileIds = (artistProfiles ?? []).map((row: any) => String(row.id));
  let leadIds: string[] = [];
  if (artistProfileIds.length > 0) {
    const { data: leadRows } = await service.from("artist_leads").select("id").in("artist_profile_id", artistProfileIds);
    leadIds = (leadRows ?? []).map((row: any) => String(row.id));
  }

  return {
    userId: snapshot.user.id,
    email: snapshot.user.email ?? null,
    isStaff: snapshot.isStaff,
    leadIds
  };
}

export async function requireSigningArtistContext(): Promise<SigningViewerContext> {
  const ctx = await getSigningViewerContext();
  if (!ctx) {
    redirect("/artist/login");
  }
  return ctx;
}

export async function requireSigningStaffContext(): Promise<SigningViewerContext> {
  const ctx = await getSigningViewerContext();
  if (!ctx) {
    redirect("/admin/login");
  }
  if (!ctx.isStaff) {
    redirect("/");
  }
  return ctx;
}

export async function getSigningAdminStats(): Promise<SigningAdminStats> {
  const service = createServiceClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [pendingReview, offersSent, waitingArtist, waitingLabel, executedThisMonth, expiredDeclined] = await Promise.all([
    service.from("artist_leads").select("id", { count: "exact", head: true }).eq("status", "internal_review"),
    service.from("deal_offers").select("id", { count: "exact", head: true }).eq("status", "sent"),
    service.from("contracts").select("id", { count: "exact", head: true }).in("status", ["offer_sent", "artist_viewed_offer"]),
    service.from("contracts").select("id", { count: "exact", head: true }).eq("status", "artist_signed"),
    service.from("contracts").select("id", { count: "exact", head: true }).eq("status", "fully_executed").gte("fully_executed_at", monthStart.toISOString()),
    service.from("contracts").select("id", { count: "exact", head: true }).in("status", ["expired", "declined"])
  ]);

  return {
    pendingReview: pendingReview.count ?? 0,
    offersSent: offersSent.count ?? 0,
    waitingArtistSignature: waitingArtist.count ?? 0,
    waitingLabelSignature: waitingLabel.count ?? 0,
    fullyExecutedThisMonth: executedThisMonth.count ?? 0,
    expiredOrDeclined: expiredDeclined.count ?? 0
  };
}

export async function listArtistLeads(limit = 200): Promise<ArtistLead[]> {
  const service = createServiceClient();
  const { data } = await service.from("artist_leads").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(mapLead);
}

export async function listDealOffers(limit = 200): Promise<DealOffer[]> {
  const service = createServiceClient();
  const { data } = await service.from("deal_offers").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(mapOffer);
}

export async function listContracts(limit = 300): Promise<Contract[]> {
  const service = createServiceClient();
  const { data } = await service.from("contracts").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(mapContract);
}

export async function listContractTemplates(): Promise<ContractTemplate[]> {
  const service = createServiceClient();
  const { data } = await service.from("contract_templates").select("*").order("created_at", { ascending: false }).limit(100);
  return (data ?? []).map(mapTemplate);
}

export async function listAuditLogs(limit = 200) {
  const service = createServiceClient();
  const { data } = await service.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    artistLeadId: row.artist_lead_id ? String(row.artist_lead_id) : null,
    contractId: row.contract_id ? String(row.contract_id) : null,
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    action: String(row.action),
    metadata: asRecord(row.metadata),
    createdAt: String(row.created_at)
  }));
}

export async function getContractBundle(contractId: string): Promise<{
  contract: Contract | null;
  version: ContractVersion | null;
  signers: ContractSigner[];
  events: SignatureEvent[];
}> {
  const service = createServiceClient();
  const [{ data: contractRow }, { data: signerRows }, { data: eventRows }] = await Promise.all([
    service.from("contracts").select("*").eq("id", contractId).maybeSingle(),
    service.from("contract_signers").select("*").eq("contract_id", contractId).order("created_at", { ascending: true }),
    service.from("signature_events").select("*").eq("contract_id", contractId).order("created_at", { ascending: true })
  ]);

  const contract = contractRow ? mapContract(contractRow) : null;
  if (!contract) {
    return { contract: null, version: null, signers: [], events: [] };
  }

  let version: ContractVersion | null = null;
  if (contract.currentVersionId) {
    const { data: versionRow } = await service.from("contract_versions").select("*").eq("id", contract.currentVersionId).maybeSingle();
    version = versionRow ? mapContractVersion(versionRow) : null;
  } else {
    const { data: fallbackVersion } = await service
      .from("contract_versions")
      .select("*")
      .eq("contract_id", contractId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    version = fallbackVersion ? mapContractVersion(fallbackVersion) : null;
  }

  return {
    contract,
    version,
    signers: (signerRows ?? []).map(mapSigner),
    events: (eventRows ?? []).map(mapSignatureEvent)
  };
}

export async function getArtistLeadPortalBundle(leadId: string): Promise<{
  lead: ArtistLead | null;
  offers: DealOffer[];
  contracts: Contract[];
  tasks: OnboardingTask[];
  documents: ArtistDocument[];
  messages: ArtistMessage[];
}> {
  const service = createServiceClient();
  const [{ data: leadRow }, { data: offerRows }, { data: contractRows }, { data: taskRows }, { data: docRows }, { data: messageRows }] = await Promise.all([
    service.from("artist_leads").select("*").eq("id", leadId).maybeSingle(),
    service.from("deal_offers").select("*").eq("artist_lead_id", leadId).order("created_at", { ascending: false }),
    service.from("contracts").select("*").eq("artist_lead_id", leadId).order("created_at", { ascending: false }),
    service.from("onboarding_tasks").select("*").eq("artist_lead_id", leadId).order("created_at", { ascending: true }),
    service.from("artist_documents").select("*").eq("artist_lead_id", leadId).order("created_at", { ascending: false }),
    service.from("messages").select("*").eq("artist_lead_id", leadId).order("created_at", { ascending: false })
  ]);

  return {
    lead: leadRow ? mapLead(leadRow) : null,
    offers: (offerRows ?? []).map(mapOffer),
    contracts: (contractRows ?? []).map(mapContract),
    tasks: (taskRows ?? []).map(mapTask),
    documents: (docRows ?? []).map(mapDocument),
    messages: (messageRows ?? []).map(mapMessage)
  };
}

export async function getNotificationsForUser(userId: string, leadIds: string[] = []): Promise<NotificationRecord[]> {
  const service = createServiceClient();
  const safeLeadIds = leadIds.filter((leadId) => /^[a-f0-9-]+$/i.test(leadId));

  const query = service.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  const scopedQuery =
    safeLeadIds.length > 0 ? query.or(`user_id.eq.${userId},artist_lead_id.in.(${safeLeadIds.join(",")})`) : query.eq("user_id", userId);

  const { data } = await scopedQuery;
  return (data ?? []).map(mapNotification);
}

export async function createSignedStorageUrl(bucket: string, path: string, expiresInSeconds = 60 * 30): Promise<string | null> {
  const service = createServiceClient();
  const { data, error } = await service.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function splitStoragePath(storagePath: string | null | undefined): { bucket: string; path: string } | null {
  if (!storagePath) return null;
  if (storagePath.startsWith("storage://")) {
    const pathWithoutProtocol = storagePath.slice("storage://".length);
    const splitIndex = pathWithoutProtocol.indexOf("/");
    if (splitIndex < 0) return null;
    return {
      bucket: pathWithoutProtocol.slice(0, splitIndex),
      path: pathWithoutProtocol.slice(splitIndex + 1)
    };
  }

  return null;
}

export async function createSignedUrlFromStoragePath(storagePath: string | null | undefined): Promise<string | null> {
  const parsed = splitStoragePath(storagePath);
  if (!parsed) return storagePath ?? null;
  return createSignedStorageUrl(parsed.bucket, parsed.path);
}
