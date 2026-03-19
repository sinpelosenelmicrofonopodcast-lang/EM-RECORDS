export type SocialMediaContentType = "song" | "blog" | "news" | "video" | "artist" | "custom";

export type SocialMediaContentStatus = "published" | "draft";

export type SocialMediaPlatform = "facebook" | "instagram" | "tiktok" | "x" | "youtube";

export type SocialMediaPostStatus = "draft" | "scheduled" | "published" | "failed" | "ready_for_manual";

export type ContentHubItem = {
  id: string;
  title: string;
  type: SocialMediaContentType;
  status: SocialMediaContentStatus;
  slug: string;
  publicLink: string;
  thumbnail: string | null;
  mediaUrl: string | null;
  excerpt: string | null;
  artistName: string | null;
  subtitle: string | null;
  contentId: string | null;
  metadata: Record<string, unknown>;
};

export type SocialPostRecord = {
  id: string;
  contentId: string | null;
  contentType: SocialMediaContentType;
  title: string | null;
  caption: string;
  platforms: SocialMediaPlatform[];
  mediaUrl: string | null;
  link: string | null;
  status: SocialMediaPostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  metaPostId: string | null;
  publishLog: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string | null;
};

export type SocialMediaDashboardData = {
  contentHub: ContentHubItem[];
  posts: SocialPostRecord[];
  bestPostingWindows: number[];
  envStatus: {
    facebookPageIdConfigured: boolean;
    systemUserTokenConfigured: boolean;
    instagramBusinessIdConfigured: boolean;
    facebookConfigured: boolean;
    instagramConfigured: boolean;
  };
  summary: {
    contentItems: number;
    drafts: number;
    scheduled: number;
    published: number;
    failed: number;
    readyForManual: number;
  };
};

export type AiGeneratedPost = {
  hook: string;
  caption: string;
  hashtags: string[];
  link: string | null;
  mediaUrl: string | null;
};

export type UpsertSocialPostInput = {
  id?: string | null;
  contentId?: string | null;
  contentType: SocialMediaContentType;
  title?: string | null;
  caption: string;
  platforms: SocialMediaPlatform[];
  mediaUrl?: string | null;
  link?: string | null;
  scheduledAt?: string | null;
};
