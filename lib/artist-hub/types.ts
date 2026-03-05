import type { User } from "@supabase/supabase-js";

export type HubRole = "admin" | "artist" | "manager" | "booking" | "staff";

export type HubMembership = {
  id: string;
  artistId: string;
  userId: string;
  role: HubRole;
  permissions: Record<string, unknown>;
  createdAt: string;
};

export type HubArtist = {
  id: string;
  name: string;
  slug: string;
  stageName: string | null;
  tagline: string;
  status: string;
  bioShort: string | null;
  bioMed: string | null;
  bioLong: string | null;
  primaryGenre: string | null;
  territory: string | null;
  contacts: Record<string, unknown>;
  socialLinks: Record<string, unknown>;
  brandKit: Record<string, unknown>;
  createdAt: string;
};

export type HubUserContext = {
  user: User;
  isAdmin: boolean;
  isApproved: boolean;
  globalRoles: HubRole[];
  memberships: HubMembership[];
};

export type HubRelease = {
  id: string;
  artistId: string | null;
  title: string;
  format: string;
  releaseType: "single" | "ep" | "album";
  releaseDate: string;
  upc: string | null;
  distributor: string | null;
  smartlinkSlug: string | null;
};

export type HubSong = {
  id: string;
  artistId: string;
  releaseId: string | null;
  title: string;
  isrc: string | null;
  iswc: string | null;
  explicit: boolean;
  language: string | null;
  bpm: number | null;
  key: string | null;
  links: Record<string, unknown>;
};

export type HubRegistration = {
  id: string;
  songId: string;
  org: "bmi" | "mlc" | "songtrust" | "soundexchange" | "distrokid" | "contentid";
  status: "pending" | "needs_info" | "submitted" | "approved" | "rejected";
  refNumber: string | null;
  lastUpdate: string | null;
  notes: string | null;
};

export type HubChecklist = {
  id: string;
  songId: string | null;
  releaseId: string | null;
  items: Record<string, unknown>;
  readyScore: number;
  status: "draft" | "in_progress" | "ready" | "blocked";
  notes: string | null;
  ownerUserId: string | null;
  dueDate: string | null;
  updatedAt: string;
};

export type HubMediaAsset = {
  id: string;
  artistId: string;
  releaseId: string | null;
  songId: string | null;
  type: "photo" | "logo" | "cover" | "qr" | "template" | "other";
  source: "lightroom" | "upload" | "generated";
  sourceId: string | null;
  url: string;
  thumbUrl: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type HubMediaKit = {
  id: string;
  artistId: string;
  headline: string | null;
  oneLiner: string | null;
  highlights: string[];
  pressQuotes: string[];
  stats: Record<string, unknown>;
  contacts: Record<string, unknown>;
  featuredTracks: string[];
  updatedAt: string;
};

export type HubDocument = {
  id: string;
  artistId: string;
  releaseId: string | null;
  songId: string | null;
  type: "contract" | "splitsheet" | "invoice" | "license" | "epk" | "other";
  url: string;
  version: number;
  status: "pending" | "needs_info" | "submitted" | "approved" | "rejected";
  visibility: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type HubBooking = {
  id: string;
  artistId: string;
  requesterName: string | null;
  requesterEmail: string | null;
  eventName: string | null;
  eventLocation: string | null;
  eventDate: string | null;
  budget: number | null;
  notes: string | null;
  status: "new" | "in_review" | "negotiating" | "confirmed" | "done" | "declined";
  createdAt: string;
  updatedAt: string;
};

export type HubContentItem = {
  id: string;
  artistId: string;
  type: "reel" | "post" | "story";
  caption: string | null;
  assets: Record<string, unknown>[];
  scheduledAt: string | null;
  status: "draft" | "submitted" | "approved" | "scheduled" | "published" | "rejected";
  submittedBy: string | null;
  approvedBy: string | null;
  approvals: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
};

export type HubPrRequest = {
  id: string;
  artistId: string;
  outlet: string;
  contact: string | null;
  requestedAt: string | null;
  topic: string | null;
  status: "new" | "in_review" | "accepted" | "scheduled" | "done" | "declined";
  notes: string | null;
  attachments: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
};

export type HubSyncPackage = {
  id: string;
  songId: string;
  tags: Record<string, unknown>;
  link: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HubReport = {
  id: string;
  artistId: string;
  month: string;
  url: string;
  version: number;
  createdBy: string | null;
  createdAt: string;
};

export type HubAuditEvent = {
  id: string;
  actorUserId: string | null;
  artistId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
