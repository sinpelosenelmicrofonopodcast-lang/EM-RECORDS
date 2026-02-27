export type Artist = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  bio: string;
  heroMediaUrl: string;
  avatarUrl: string;
  bookingEmail: string;
  spotifyUrl?: string;
  spotifyEmbed?: string;
  soundcloudEmbed?: string;
  appleMusicUrl?: string;
  youtubeUrl?: string;
  musicVideoEmbed?: string;
  interviewUrl1?: string;
  interviewUrl2?: string;
  pressKitUrl?: string;
  mediaKitUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  xUrl?: string;
  facebookUrl?: string;
  epkEnabled?: boolean;
  createdAt?: string;
};

export type Release = {
  id: string;
  title: string;
  format: "Single" | "EP" | "Album";
  coverUrl: string;
  releaseDate: string;
  description: string;
  artistSlug?: string | null;
  artistName?: string | null;
  featuring?: string | null;
  spotifyEmbed?: string;
  appleEmbed?: string;
  youtubeEmbed?: string;
  featured: boolean;
  contentStatus?: "draft" | "scheduled" | "published";
  publishAt?: string | null;
};

export type EventItem = {
  id: string;
  title: string;
  venue: string;
  city: string;
  country: string;
  startsAt: string;
  ticketUrl?: string;
  stripePriceId?: string;
  sponsors: string[];
  status: "upcoming" | "sold_out" | "completed";
};

export type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  heroUrl: string;
  publishedAt: string;
  content: string;
  contentStatus?: "draft" | "scheduled" | "published";
  publishAt?: string | null;
};

export type GalleryItem = {
  id: string;
  mediaUrl: string;
  caption: string;
  kind: "image" | "video";
};

export type DemoSubmission = {
  id: string;
  artistName: string;
  email: string;
  trackTitle: string;
  message?: string;
  fileUrl: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type TicketOrder = {
  id: string;
  eventId: string;
  eventTitle: string;
  buyerEmail: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  qrCodeValue: string;
  qrCodeDataUrl?: string;
  status: "paid" | "refunded" | "cancelled";
  createdAt: string;
};

export type NextUpSubmission = {
  id: string;
  stageName: string;
  legalName: string;
  email: string;
  phone: string;
  city: string;
  demoUrl: string;
  socialLinks?: string;
  artistBio?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type NextUpCompetitor = {
  id: string;
  submissionId?: string | null;
  stageName: string;
  city: string;
  photoUrl?: string | null;
  demoUrl: string;
  socialLinks?: string | null;
  artistBio?: string | null;
  status: "approved" | "hidden";
  isWinner?: boolean;
  createdAt: string;
  votesCount: number;
};

export type NextUpLeaderboardEntry = {
  competitorId: string;
  stageName: string;
  city: string;
  photoUrl?: string | null;
  votesCount: number;
  rank: number;
};

export type NextUpSettings = {
  id: string;
  liveFinalAt?: string | null;
  votingEnabled?: boolean;
  votingStartsAt?: string | null;
  votingEndsAt?: string | null;
  updatedAt?: string;
};

export type SocialLink = {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
