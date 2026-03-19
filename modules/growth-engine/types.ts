export type GrowthRole = "admin" | "owner" | "developer";

export type PlatformTarget = "instagram" | "facebook" | "tiktok" | "youtube_shorts" | "x";

export type QueueContentType = "song" | "video" | "reel" | "artist_story" | "news" | "promo" | "viral";

export type GeneratorContentType = "song_post" | "video_post" | "artist_story" | "promo_post" | "viral_post";

export type QueueStatus = "draft" | "scheduled" | "posted" | "failed" | "ready_for_manual";

export type ApprovalState = "pending" | "approved" | "rejected";

export type GrowthAccess = {
  role: GrowthRole;
  canEditContent: boolean;
  canApproveContent: boolean;
  canManageAutomation: boolean;
  canManageTokens: boolean;
};

export type ArtistProfileLinks = {
  instagram?: string | null;
  tiktok?: string | null;
  youtubeChannel?: string | null;
  spotifyUrl?: string | null;
};

export type ArtistGrowthProfile = {
  id: string;
  name: string;
  stageName: string | null;
  bio: string;
  genre: string | null;
  active: boolean;
  avatarUrl: string | null;
  heroMediaUrl: string | null;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  profileLinks: ArtistProfileLinks;
  releaseTitles: string[];
  topTracks: string[];
  videoTitles: string[];
  assetUrls: string[];
};

export type GeneratedContent = {
  caption: string;
  hashtags: string[];
  hook: string;
  image_prompt: string;
  video_prompt: string;
};

export type ReelDraft = {
  mediaUrl: string | null;
  video_data: {
    source: string;
    clipStart: number;
    clipEnd: number;
    duration: number;
  };
  overlay_text: string;
  caption: string;
  hashtags: string[];
};

export type AutomationSettingsRecord = {
  id: string;
  enabled: boolean;
  postsPerDay: number;
  platformsEnabled: PlatformTarget[];
  contentMix: Record<string, number>;
  tone: string;
  language: string;
  bestPostingWindows: number[];
  learningAppliedAt: string | null;
  lastRunAt: string | null;
};

export type SocialAccountRecord = {
  id: string;
  platform: PlatformTarget;
  accountLabel: string | null;
  accountIdentifier: string | null;
  active: boolean;
  tokenConfigured: boolean;
  tokenExpiresAt: string | null;
  metadata: Record<string, unknown>;
};

export type ContentQueueRecord = {
  id: string;
  artistId: string | null;
  contentType: QueueContentType;
  title: string | null;
  hook: string | null;
  caption: string;
  hashtags: string[];
  mediaUrl: string | null;
  videoData: Record<string, unknown>;
  imagePrompt: string | null;
  videoPrompt: string | null;
  overlayText: string | null;
  platformTargets: PlatformTarget[];
  status: QueueStatus;
  approvalState: ApprovalState;
  scheduledAt: string | null;
  publishedAt: string | null;
  queuePosition: number;
  aiGenerated: boolean;
  readyForManual: boolean;
  failureReason: string | null;
  metadata: Record<string, unknown>;
  artistName?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ViralContentRecord = {
  id: string;
  source: string;
  contentUrl: string;
  caption: string | null;
  performanceScore: number;
  reusable: boolean;
  repurposedCaption: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

export type LearningMemoryRecord = {
  id: string;
  pattern: string;
  confidenceScore: number;
  patternType: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

export type GrowthRunRecord = {
  id: string;
  triggerType: string;
  status: "running" | "completed" | "failed";
  summary: Record<string, unknown>;
  startedAt: string;
  finishedAt: string | null;
};

export type SocialEngineDashboard = {
  settings: AutomationSettingsRecord;
  accounts: SocialAccountRecord[];
  queue: ContentQueueRecord[];
  viralPool: ViralContentRecord[];
  learningMemory: LearningMemoryRecord[];
  artists: Array<{
    id: string;
    name: string;
    stageName: string | null;
    cacheItems: number;
    assets: number;
    active: boolean;
  }>;
  summary: {
    queued: number;
    scheduled: number;
    posted: number;
    readyForManual: number;
    failed: number;
  };
};

export type GrowthEngineDashboard = {
  settings: AutomationSettingsRecord;
  recentRuns: GrowthRunRecord[];
  learningMemory: LearningMemoryRecord[];
  topFormats: Array<{ label: string; score: number }>;
  bestTimes: Array<{ hour: number; score: number }>;
  analytics: {
    postsCreated: number;
    postsPublished: number;
    averageEngagement: number;
  };
};

export type PublishOutcome = {
  platform: PlatformTarget;
  status: QueueStatus;
  externalPostId?: string | null;
  reason?: string | null;
};
