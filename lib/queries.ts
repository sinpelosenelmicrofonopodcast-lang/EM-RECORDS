import { cache } from "react";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockArtists, mockDemos, mockEvents, mockGallery, mockNews, mockReleases, mockTicketOrders } from "@/lib/mock-data";
import type { Artist, DemoSubmission, EventItem, GalleryItem, NewsItem, Release, TicketOrder } from "@/lib/types";

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
    const conversionRate = newsletterSubscribers > 0 ? (mockTicketOrders.length / newsletterSubscribers) * 100 : 0;

    return {
      artists: mockArtists.length,
      releases: mockReleases.length,
      events: mockEvents.length,
      pendingDemos: 4,
      ticketOrders: mockTicketOrders.length,
      newsletterSubscribers,
      sponsorApplications,
      paidRevenueCents,
      conversionRate
    };
  }

  try {
    const supabase = await createServerSupabase();
    const [
      { count: artists },
      { count: releases },
      { count: events },
      { count: pendingDemos },
      { count: ticketOrders },
      { count: newsletterSubscribers },
      { count: sponsorApplications },
      { data: paidOrdersData }
    ] =
      await Promise.all([
        supabase.from("artists").select("id", { count: "exact", head: true }),
        supabase.from("releases").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("demo_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ticket_orders").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        supabase.from("sponsor_applications").select("id", { count: "exact", head: true }),
        supabase.from("ticket_orders").select("amount_total,status").eq("status", "paid")
      ]);

    const paidRevenueCents = (paidOrdersData ?? []).reduce((acc: number, item: any) => acc + Number(item.amount_total ?? 0), 0);
    const safeNewsletter = newsletterSubscribers ?? 0;
    const safeTicketOrders = ticketOrders ?? 0;
    const conversionRate = safeNewsletter > 0 ? (safeTicketOrders / safeNewsletter) * 100 : 0;

    return {
      artists: artists ?? 0,
      releases: releases ?? 0,
      events: events ?? 0,
      pendingDemos: pendingDemos ?? 0,
      ticketOrders: safeTicketOrders,
      newsletterSubscribers: safeNewsletter,
      sponsorApplications: sponsorApplications ?? 0,
      paidRevenueCents,
      conversionRate
    };
  } catch {
    return {
      artists: mockArtists.length,
      releases: mockReleases.length,
      events: mockEvents.length,
      pendingDemos: 0,
      ticketOrders: mockTicketOrders.length,
      newsletterSubscribers: 0,
      sponsorApplications: 0,
      paidRevenueCents: 0,
      conversionRate: 0
    };
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
