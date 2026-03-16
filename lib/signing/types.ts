import type { SIGNING_CONTRACT_STATUSES, SIGNING_OFFER_STATUSES, SIGNING_PIPELINE_STAGES, SIGNING_PRO_AFFILIATIONS } from "@/lib/signing/constants";

export type SigningPipelineStage = (typeof SIGNING_PIPELINE_STAGES)[number];
export type SigningOfferStatus = (typeof SIGNING_OFFER_STATUSES)[number];
export type SigningContractStatus = (typeof SIGNING_CONTRACT_STATUSES)[number];
export type SigningProAffiliation = (typeof SIGNING_PRO_AFFILIATIONS)[number];
export type SignerRole = "artist" | "label";

export type ArtistLead = {
  id: string;
  artistProfileId: string | null;
  legalName: string;
  stageName: string | null;
  email: string;
  professionalEmail: string | null;
  phone: string | null;
  country: string | null;
  state: string | null;
  dateOfBirth: string | null;
  governmentName: string | null;
  governmentId: string | null;
  nationality: string | null;
  residenceCity: string | null;
  residenceCountry: string | null;
  residenceStateRegion: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  primaryGenre: string | null;
  representingCountry: string | null;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;
  proAffiliation: SigningProAffiliation;
  ipiNumber: string | null;
  socialLinks: Record<string, string>;
  notes: string | null;
  status: SigningPipelineStage;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DealOffer = {
  id: string;
  artistLeadId: string;
  offerType: string;
  royaltySplitLabel: number;
  royaltySplitArtist: number;
  advanceAmount: number | null;
  termMonths: number | null;
  termDescription: string | null;
  territory: string;
  includes360: boolean;
  includesPublishing: boolean;
  status: SigningOfferStatus;
  sentAt: string | null;
  expiresAt: string | null;
  clauseOverrides: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ContractTemplate = {
  id: string;
  name: string;
  versionName: string;
  bodyMarkdown: string;
  clauseSchema: Record<string, unknown>;
  defaultVariables: Record<string, unknown>;
  active: boolean;
  createdAt: string;
};

export type ContractVersion = {
  id: string;
  contractId: string;
  versionNumber: number;
  templateSnapshot: string;
  variablesSnapshot: Record<string, unknown>;
  renderedMarkdown: string;
  renderedHtml: string;
  pdfPath: string | null;
  createdAt: string;
};

export type Contract = {
  id: string;
  artistLeadId: string;
  dealOfferId: string | null;
  contractTemplateId: string;
  currentVersionId: string | null;
  contractVersionNumber: number;
  renderedMarkdown: string | null;
  renderedHtml: string | null;
  draftPdfPath: string | null;
  executedPdfPath: string | null;
  status: SigningContractStatus;
  viewedAt: string | null;
  artistSignedAt: string | null;
  labelSignedAt: string | null;
  fullyExecutedAt: string | null;
  lockedAt: string | null;
  inviteLastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractSigner = {
  id: string;
  contractId: string;
  signerRole: SignerRole;
  signerName: string;
  signerEmail: string;
  signatureData: string | null;
  signaturePath: string | null;
  signedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  consentAccepted: boolean;
  createdAt: string;
};

export type SignatureEvent = {
  id: string;
  contractId: string;
  signerRole: SignerRole | null;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorUserId: string | null;
  artistLeadId: string | null;
  contractId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type OnboardingTask = {
  id: string;
  artistLeadId: string;
  taskKey: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ArtistDocument = {
  id: string;
  artistLeadId: string;
  type: string;
  filePath: string;
  fileName: string | null;
  status: string;
  createdAt: string;
};

export type ArtistMessage = {
  id: string;
  artistLeadId: string;
  contractId: string | null;
  senderUserId: string | null;
  recipientUserId: string | null;
  recipientRole: string;
  subject: string | null;
  body: string;
  status: string;
  createdAt: string;
  readAt: string | null;
};

export type InviteTokenRecord = {
  id: string;
  contractId: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  artistLeadId: string | null;
  userId: string | null;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type ContractRenderContext = Record<string, string | number | boolean | null | undefined>;

export type ContractClauseFlags = {
  includes_publishing?: boolean;
  includes_360?: boolean;
  perpetual_master_rights?: boolean;
};

export type SigningAdminStats = {
  pendingReview: number;
  offersSent: number;
  waitingArtistSignature: number;
  waitingLabelSignature: number;
  fullyExecutedThisMonth: number;
  expiredOrDeclined: number;
};
