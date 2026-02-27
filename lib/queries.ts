import { cache } from "react";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  mockArtists,
  mockDemos,
  mockEvents,
  mockGallery,
  mockNews,
  mockNextUpCompetitors,
  mockNextUpSettings,
  mockNextUpSubmissions,
  mockReleases,
  mockSocialLinks,
  mockTicketOrders
} from "@/lib/mock-data";
import type {
  Artist,
  DemoSubmission,
  EventItem,
  GalleryItem,
  NewsItem,
  NextUpCompetitor,
  NextUpLeaderboardEntry,
  NextUpSettings,
  NextUpSubmission,
  Release,
  SiteAnalyticsSnapshot,
  SocialLink,
  TicketOrder
} from "@/lib/types";

function mapArtist(row: any): Artist {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    bio: row.bio,
    heroMediaUrl: row.hero_media_url,
    avatarUrl: row.avatar_url,
    bookingEmail: row.booking_email,
    spotifyUrl: row.spotify_url,
    spotifyEmbed: row.spotify_embed,
    soundcloudEmbed: row.soundcloud_embed,
    appleMusicUrl: row.apple_music_url,
    youtubeUrl: row.youtube_url,
    musicVideoEmbed: row.music_video_embed,
    interviewUrl1: row.interview_url_1,
    interviewUrl2: row.interview_url_2,
    pressKitUrl: row.press_kit_url,
    mediaKitUrl: row.media_kit_url,
    instagramUrl: row.instagram_url,
    tiktokUrl: row.tiktok_url,
    xUrl: row.x_url,
    facebookUrl: row.facebook_url,
    epkEnabled: row.epk_enabled ?? false,
    createdAt: row.created_at
  };
}

function mapRelease(row: any): Release {
  return {
    id: row.id,
    title: row.title,
    format: row.format,
    coverUrl: row.cover_url,
    releaseDate: row.release_date,
    description: row.description,
    artistSlug: row.artist_slug ?? null,
    artistName: row.artist_name ?? null,
    featuring: row.featuring ?? null,
    spotifyEmbed: row.spotify_embed,
    appleEmbed: row.apple_embed,
    youtubeEmbed: row.youtube_embed,
    featured: row.featured,
    contentStatus: row.content_status ?? "published",
    publishAt: row.publish_at ?? null
  };
}

function mapEvent(row: any): EventItem {
  return {
    id: row.id,
    title: row.title,
    venue: row.venue,
    city: row.city,
    country: row.country,
    startsAt: row.starts_at,
    ticketUrl: row.ticket_url,
    stripePriceId: row.stripe_price_id,
    sponsors: row.sponsors ?? [],
    status: row.status
  };
}

function mapNews(row: any): NewsItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    category: row.category,
    heroUrl: row.hero_url,
    publishedAt: row.published_at,
    content: row.content,
    contentStatus: row.content_status ?? "published",
    publishAt: row.publish_at ?? null
  };
}

function mapGallery(row: any): GalleryItem {
  return {
    id: row.id,
    mediaUrl: row.media_url,
    caption: row.caption,
    kind: row.kind
  };
}

function mapDemo(row: any): DemoSubmission {
  return {
    id: row.id,
    artistName: row.artist_name,
    email: row.email,
    trackTitle: row.track_title,
    message: row.message ?? undefined,
    fileUrl: row.file_url,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapTicketOrder(row: any): TicketOrder {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    buyerEmail: row.buyer_email,
    quantity: row.quantity,
    amountTotal: row.amount_total,
    currency: row.currency,
    qrCodeValue: row.qr_code_value,
    qrCodeDataUrl: row.qr_code_data_url ?? undefined,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapNextUpSubmission(row: any): NextUpSubmission {
  return {
    id: row.id,
    stageName: row.stage_name,
    legalName: row.legal_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    demoUrl: row.demo_url,
    socialLinks: row.social_links ?? undefined,
    artistBio: row.artist_bio ?? undefined,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapNextUpCompetitor(row: any, votesCount = 0): NextUpCompetitor {
  return {
    id: row.id,
    submissionId: row.submission_id ?? null,
    stageName: row.stage_name,
    city: row.city,
    photoUrl: row.photo_url ?? null,
    demoUrl: row.demo_url,
    socialLinks: row.social_links ?? undefined,
    artistBio: row.artist_bio ?? undefined,
    status: row.status,
    isWinner: Boolean(row.is_winner),
    createdAt: row.created_at,
    votesCount
  };
}

function mapNextUpSettings(row: any): NextUpSettings {
  return {
    id: String(row.id ?? "default"),
    liveFinalAt: row.live_final_at ?? null,
    votingEnabled: Boolean(row.voting_enabled ?? false),
    votingStartsAt: row.voting_starts_at ?? null,
    votingEndsAt: row.voting_ends_at ?? null,
    updatedAt: row.updated_at ?? undefined
  };
}

function mapSocialLink(row: any): SocialLink {
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const getArtists = cache(async (): Promise<Artist[]> => {
  if (!isSupabaseConfigured()) {
    return mockArtists;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("artists").select("*").order("created_at", { ascending: false });

    if (error || !data) {
      return mockArtists;
    }

    return data.map(mapArtist);
  } catch {
    return mockArtists;
  }
});

export const getArtistBySlug = cache(async (slug: string): Promise<Artist | null> => {
  if (!isSupabaseConfigured()) {
    return mockArtists.find((item) => item.slug === slug) ?? null;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("artists").select("*").eq("slug", slug).maybeSingle();

    if (error || !data) {
      return mockArtists.find((item) => item.slug === slug) ?? null;
    }

    return mapArtist(data);
  } catch {
    return mockArtists.find((item) => item.slug === slug) ?? null;
  }
});

function isContentLive(status?: string, publishAt?: string | null, fallbackDate?: string | null): boolean {
  const normalized = status ?? "published";
  const now = new Date();
  const effectiveDate = publishAt ? new Date(publishAt) : fallbackDate ? new Date(fallbackDate) : null;

  if (normalized === "draft") {
    return false;
  }

  if (normalized === "scheduled") {
    return Boolean(effectiveDate && effectiveDate <= now);
  }

  if (effectiveDate) {
    return effectiveDate <= now;
  }

  return true;
}

export const getReleasesAdmin = cache(async (): Promise<Release[]> => {
  if (!isSupabaseConfigured()) {
    return mockReleases;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("releases").select("*").order("release_date", { ascending: false });

    if (error || !data) {
      return mockReleases;
    }

    return data.map(mapRelease);
  } catch {
    return mockReleases;
  }
});

export const getReleases = cache(async (): Promise<Release[]> => {
  const releases = await getReleasesAdmin();
  return releases.filter((release) => isContentLive(release.contentStatus, release.publishAt, release.releaseDate));
});

export const getFeaturedRelease = cache(async (): Promise<Release | null> => {
  const releases = await getReleases();
  return releases.find((release) => release.featured) ?? releases[0] ?? null;
});

export const getUpcomingEvents = cache(async (): Promise<EventItem[]> => {
  if (!isSupabaseConfigured()) {
    return mockEvents;
  }

  try {
    const supabase = await createServerSupabase();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(10);

    if (error || !data) {
      return mockEvents;
    }

    return data.map(mapEvent);
  } catch {
    return mockEvents;
  }
});

export const getNewsAdmin = cache(async (): Promise<NewsItem[]> => {
  if (!isSupabaseConfigured()) {
    return mockNews;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("news_posts").select("*").order("published_at", { ascending: false });

    if (error || !data) {
      return mockNews;
    }

    return data.map(mapNews);
  } catch {
    return mockNews;
  }
});

export const getNews = cache(async (): Promise<NewsItem[]> => {
  const news = await getNewsAdmin();
  return news.filter((item) => isContentLive(item.contentStatus, item.publishAt, item.publishedAt));
});

export const getNewsBySlug = cache(async (slug: string): Promise<NewsItem | null> => {
  const news = await getNews();
  return news.find((item) => item.slug === slug) ?? null;
});

export const getGallery = cache(async (): Promise<GalleryItem[]> => {
  if (!isSupabaseConfigured()) {
    return mockGallery;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("gallery_items").select("*").order("created_at", { ascending: false }).limit(12);

    if (error || !data) {
      return mockGallery;
    }

    return data.map(mapGallery);
  } catch {
    return mockGallery;
  }
});

export const getSocialLinksAdmin = cache(async (): Promise<SocialLink[]> => {
  if (!isSupabaseConfigured()) {
    return mockSocialLinks;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("social_links")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data) {
      return mockSocialLinks;
    }

    return data.map(mapSocialLink);
  } catch {
    return mockSocialLinks;
  }
});

export const getSocialLinks = cache(async (): Promise<SocialLink[]> => {
  const links = await getSocialLinksAdmin();
  return links.filter((item) => item.isActive);
});

export const getCountdownRelease = cache(async (): Promise<Release | null> => {
  const releases = await getReleasesAdmin();
  const now = new Date();
  const upcoming = releases
    .filter((release) => (release.contentStatus ?? "published") !== "draft")
    .filter((release) => new Date(release.releaseDate) > now)
    .sort((a, b) => +new Date(a.releaseDate) - +new Date(b.releaseDate));

  return upcoming[0] ?? null;
});

export const getAdminMetrics = cache(async () => {
  if (!isSupabaseConfigured()) {
    const paidRevenueCents = mockTicketOrders.filter((order) => order.status === "paid").reduce((acc, order) => acc + order.amountTotal, 0);
    const newsletterSubscribers = 42;
    const sponsorApplications = 7;
    const totalDemos = mockDemos.length;
    const nextUpSubmissions = mockNextUpSubmissions.length;
    const nextUpVotes = mockNextUpCompetitors.reduce((acc, competitor) => acc + competitor.votesCount, 0);
    const conversionRate = newsletterSubscribers > 0 ? (mockTicketOrders.length / newsletterSubscribers) * 100 : 0;
    const submitToVoteRate = nextUpSubmissions > 0 ? (nextUpVotes / nextUpSubmissions) * 100 : 0;

    return {
      artists: mockArtists.length,
      releases: mockReleases.length,
      events: mockEvents.length,
      pendingDemos: 4,
      totalDemos,
      ticketOrders: mockTicketOrders.length,
      newsletterSubscribers,
      sponsorApplications,
      nextUpSubmissions,
      nextUpVotes,
      paidRevenueCents,
      conversionRate,
      submitToVoteRate
    };
  }

  try {
    const supabase = await createServerSupabase();
    const [
      { count: artists },
      { count: releases },
      { count: events },
      { count: pendingDemos },
      { count: totalDemos },
      { count: ticketOrders },
      { count: newsletterSubscribers },
      { count: sponsorApplications },
      { count: nextUpSubmissions },
      { count: nextUpVotes },
      { data: paidOrdersData }
    ] =
      await Promise.all([
        supabase.from("artists").select("id", { count: "exact", head: true }),
        supabase.from("releases").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("demo_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("demo_submissions").select("id", { count: "exact", head: true }),
        supabase.from("ticket_orders").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        supabase.from("sponsor_applications").select("id", { count: "exact", head: true }),
        supabase.from("next_up_submissions").select("id", { count: "exact", head: true }),
        supabase.from("next_up_votes").select("id", { count: "exact", head: true }),
        supabase.from("ticket_orders").select("amount_total,status").eq("status", "paid")
      ]);

    const paidRevenueCents = (paidOrdersData ?? []).reduce((acc: number, item: any) => acc + Number(item.amount_total ?? 0), 0);
    const safeNewsletter = newsletterSubscribers ?? 0;
    const safeTicketOrders = ticketOrders ?? 0;
    const safeNextUpSubmissions = nextUpSubmissions ?? 0;
    const safeNextUpVotes = nextUpVotes ?? 0;
    const conversionRate = safeNewsletter > 0 ? (safeTicketOrders / safeNewsletter) * 100 : 0;
    const submitToVoteRate = safeNextUpSubmissions > 0 ? (safeNextUpVotes / safeNextUpSubmissions) * 100 : 0;

    return {
      artists: artists ?? 0,
      releases: releases ?? 0,
      events: events ?? 0,
      pendingDemos: pendingDemos ?? 0,
      totalDemos: totalDemos ?? 0,
      ticketOrders: safeTicketOrders,
      newsletterSubscribers: safeNewsletter,
      sponsorApplications: sponsorApplications ?? 0,
      nextUpSubmissions: safeNextUpSubmissions,
      nextUpVotes: safeNextUpVotes,
      paidRevenueCents,
      conversionRate,
      submitToVoteRate
    };
  } catch {
    return {
      artists: mockArtists.length,
      releases: mockReleases.length,
      events: mockEvents.length,
      pendingDemos: 0,
      totalDemos: mockDemos.length,
      ticketOrders: mockTicketOrders.length,
      newsletterSubscribers: 0,
      sponsorApplications: 0,
      nextUpSubmissions: mockNextUpSubmissions.length,
      nextUpVotes: mockNextUpCompetitors.reduce((acc, competitor) => acc + competitor.votesCount, 0),
      paidRevenueCents: 0,
      conversionRate: 0,
      submitToVoteRate: 0
    };
  }
});

export const getSiteAnalyticsAdmin = cache(async (): Promise<SiteAnalyticsSnapshot> => {
  const emptySnapshot: SiteAnalyticsSnapshot = {
    windowDays: 30,
    totalEvents: 0,
    uniquePages: 0,
    topEvents: [],
    topPages: [],
    recentEvents: []
  };

  if (!isSupabaseConfigured()) {
    return emptySnapshot;
  }

  try {
    const service = createServiceClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await service
      .from("site_events")
      .select("id,event_name,path,created_at,locale")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error || !data) {
      return emptySnapshot;
    }

    const eventMap = new Map<string, { total: number; lastSeenAt: string }>();
    const pageMap = new Map<string, number>();

    data.forEach((row: any) => {
      const eventName = String(row.event_name ?? "unknown");
      const path = String(row.path ?? "");
      const createdAt = String(row.created_at ?? new Date().toISOString());

      const currentEvent = eventMap.get(eventName);
      if (!currentEvent) {
        eventMap.set(eventName, { total: 1, lastSeenAt: createdAt });
      } else {
        currentEvent.total += 1;
        if (createdAt > currentEvent.lastSeenAt) {
          currentEvent.lastSeenAt = createdAt;
        }
      }

      if (path) {
        pageMap.set(path, (pageMap.get(path) ?? 0) + 1);
      }
    });

    const topEvents = Array.from(eventMap.entries())
      .map(([eventName, value]) => ({
        eventName,
        total: value.total,
        lastSeenAt: value.lastSeenAt
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    const topPages = Array.from(pageMap.entries())
      .map(([path, total]) => ({ path, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    const recentEvents = data.slice(0, 20).map((row: any) => ({
      id: String(row.id),
      eventName: String(row.event_name ?? "unknown"),
      path: row.path ? String(row.path) : null,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      locale: row.locale ? String(row.locale) : null
    }));

    return {
      windowDays: 30,
      totalEvents: data.length,
      uniquePages: pageMap.size,
      topEvents,
      topPages,
      recentEvents
    };
  } catch {
    return emptySnapshot;
  }
});

export const getDemoSubmissions = cache(async (): Promise<DemoSubmission[]> => {
  if (!isSupabaseConfigured()) {
    return mockDemos;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("demo_submissions").select("*").order("created_at", { ascending: false }).limit(50);

    if (error || !data) {
      return mockDemos;
    }

    return data.map(mapDemo);
  } catch {
    return mockDemos;
  }
});

export const getTicketOrders = cache(async (): Promise<TicketOrder[]> => {
  if (!isSupabaseConfigured()) {
    return mockTicketOrders;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("ticket_orders").select("*").order("created_at", { ascending: false }).limit(30);

    if (error || !data) {
      return mockTicketOrders;
    }

    return data.map(mapTicketOrder);
  } catch {
    return mockTicketOrders;
  }
});

export const getNextUpSubmissionsAdmin = cache(async (): Promise<NextUpSubmission[]> => {
  if (!isSupabaseConfigured()) {
    return mockNextUpSubmissions;
  }

  try {
    const service = createServiceClient();
    const { data, error } = await service.from("next_up_submissions").select("*").order("created_at", { ascending: false }).limit(200);

    if (error || !data) {
      return mockNextUpSubmissions;
    }

    return data.map(mapNextUpSubmission);
  } catch {
    return mockNextUpSubmissions;
  }
});

async function getNextUpVotesCountMap(): Promise<Record<string, number>> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.from("next_up_votes").select("competitor_id");
    if (error || !data) return {};
    return data.reduce(
      (acc: Record<string, number>, row: any) => {
        const key = String(row.competitor_id ?? "");
        if (!key) return acc;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    );
  } catch {
    return {};
  }
}

export const getNextUpCompetitors = cache(async (): Promise<NextUpCompetitor[]> => {
  if (!isSupabaseConfigured()) {
    return mockNextUpCompetitors.filter((item) => item.status === "approved");
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("next_up_competitors")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) {
      return mockNextUpCompetitors.filter((item) => item.status === "approved");
    }

    const voteMap = await getNextUpVotesCountMap();
    return data.map((row: any) => mapNextUpCompetitor(row, voteMap[row.id] ?? 0));
  } catch {
    return mockNextUpCompetitors.filter((item) => item.status === "approved");
  }
});

export const getNextUpCompetitorsAdmin = cache(async (): Promise<NextUpCompetitor[]> => {
  if (!isSupabaseConfigured()) {
    return mockNextUpCompetitors;
  }

  try {
    const service = createServiceClient();
    const { data, error } = await service.from("next_up_competitors").select("*").order("created_at", { ascending: false }).limit(200);

    if (error || !data) {
      return mockNextUpCompetitors;
    }

    const voteMap = await getNextUpVotesCountMap();
    return data.map((row: any) => mapNextUpCompetitor(row, voteMap[row.id] ?? 0));
  } catch {
    return mockNextUpCompetitors;
  }
});

export const getNextUpLeaderboard = cache(async (): Promise<NextUpLeaderboardEntry[]> => {
  const competitors = await getNextUpCompetitors();

  return competitors
    .slice()
    .sort((a, b) => b.votesCount - a.votesCount)
    .map((item, index) => ({
      competitorId: item.id,
      stageName: item.stageName,
      city: item.city,
      photoUrl: item.photoUrl ?? null,
      votesCount: item.votesCount,
      rank: index + 1
    }));
});

export const getNextUpSettings = cache(async (): Promise<NextUpSettings> => {
  if (!isSupabaseConfigured()) {
    return mockNextUpSettings;
  }

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("next_up_settings").select("*").eq("id", "default").maybeSingle();

    if (error || !data) {
      return mockNextUpSettings;
    }

    return mapNextUpSettings(data);
  } catch {
    return mockNextUpSettings;
  }
});

export const getNextUpStatsAdmin = cache(async () => {
  if (!isSupabaseConfigured()) {
    const totalVotes = mockNextUpCompetitors.reduce((acc, item) => acc + item.votesCount, 0);
    return {
      submissions: mockNextUpSubmissions.length,
      pendingSubmissions: mockNextUpSubmissions.filter((item) => item.status === "pending").length,
      approvedCompetitors: mockNextUpCompetitors.filter((item) => item.status === "approved").length,
      totalVotes
    };
  }

  try {
    const service = createServiceClient();
    const [{ count: submissions }, { count: pendingSubmissions }, { count: approvedCompetitors }, { count: votes }] = await Promise.all([
      service.from("next_up_submissions").select("id", { count: "exact", head: true }),
      service.from("next_up_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      service.from("next_up_competitors").select("id", { count: "exact", head: true }).eq("status", "approved"),
      service.from("next_up_votes").select("id", { count: "exact", head: true })
    ]);

    return {
      submissions: submissions ?? 0,
      pendingSubmissions: pendingSubmissions ?? 0,
      approvedCompetitors: approvedCompetitors ?? 0,
      totalVotes: votes ?? 0
    };
  } catch {
    const totalVotes = mockNextUpCompetitors.reduce((acc, item) => acc + item.votesCount, 0);
    return {
      submissions: mockNextUpSubmissions.length,
      pendingSubmissions: mockNextUpSubmissions.filter((item) => item.status === "pending").length,
      approvedCompetitors: mockNextUpCompetitors.filter((item) => item.status === "approved").length,
      totalVotes
    };
  }
});
