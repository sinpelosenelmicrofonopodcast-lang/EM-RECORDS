import type { Artist, DemoSubmission, EventItem, GalleryItem, NewsItem, Release, TicketOrder } from "@/lib/types";

export const mockArtists: Artist[] = [
  {
    id: "a1",
    name: "NOVA K",
    slug: "nova-k",
    tagline: "Neo-reggaeton con precision global.",
    bio: "NOVA K fusiona reggaeton, trap y texturas cinematograficas. Su enfoque creativo combina narrativa de calle con direccion visual de alto nivel.",
    heroMediaUrl: "/images/artist-novak.jpg",
    avatarUrl: "/images/artist-novak.jpg",
    bookingEmail: "booking@emrecords.com",
    spotifyUrl: "https://open.spotify.com",
    spotifyEmbed: "https://open.spotify.com/embed/track/7ouMYWpwJ422jRcDASZB7P",
    soundcloudEmbed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293",
    appleMusicUrl: "https://music.apple.com",
    youtubeUrl: "https://youtube.com",
    musicVideoEmbed: "https://www.youtube.com/embed/ScMzIvxBSi4",
    interviewUrl1: "https://billboard.com",
    interviewUrl2: "https://rollingstone.com",
    pressKitUrl: "/press/novak-kit.pdf",
    mediaKitUrl: "/press/novak-media-kit.zip",
    epkEnabled: true,
    instagramUrl: "https://instagram.com",
    tiktokUrl: "https://tiktok.com",
    xUrl: "https://x.com",
    facebookUrl: "https://facebook.com"
  },
  {
    id: "a2",
    name: "LUNA VEGA",
    slug: "luna-vega",
    tagline: "Vocals etereos sobre percussion callejera.",
    bio: "LUNA VEGA representa la nueva feminidad urbana latina, con una puesta visual minimal y sonido sofisticado.",
    heroMediaUrl: "/images/artist-luna.jpg",
    avatarUrl: "/images/artist-luna.jpg",
    bookingEmail: "booking@emrecords.com",
    spotifyUrl: "https://open.spotify.com",
    spotifyEmbed: "https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3",
    soundcloudEmbed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/300",
    appleMusicUrl: "https://music.apple.com",
    youtubeUrl: "https://youtube.com",
    musicVideoEmbed: "https://www.youtube.com/embed/ScMzIvxBSi4",
    interviewUrl1: "https://complex.com",
    interviewUrl2: "https://vice.com",
    pressKitUrl: "/press/luna-kit.pdf",
    mediaKitUrl: "/press/luna-media-kit.zip",
    epkEnabled: true,
    instagramUrl: "https://instagram.com",
    tiktokUrl: "https://tiktok.com",
    xUrl: "https://x.com",
    facebookUrl: "https://facebook.com"
  },
  {
    id: "a3",
    name: "KXNG RUIZ",
    slug: "kxng-ruiz",
    tagline: "Trap latino con estrategia de estadio.",
    bio: "KXNG RUIZ combina barras agresivas, hooks virales y direccion de marca pensada para expansion internacional.",
    heroMediaUrl: "/images/artist-kxng.jpg",
    avatarUrl: "/images/artist-kxng.jpg",
    bookingEmail: "booking@emrecords.com",
    spotifyUrl: "https://open.spotify.com",
    spotifyEmbed: "https://open.spotify.com/embed/track/7ouMYWpwJ422jRcDASZB7P",
    soundcloudEmbed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/311",
    appleMusicUrl: "https://music.apple.com",
    youtubeUrl: "https://youtube.com",
    musicVideoEmbed: "https://www.youtube.com/embed/ScMzIvxBSi4",
    interviewUrl1: "https://hypebeast.com",
    interviewUrl2: "https://thefader.com",
    pressKitUrl: "/press/kxng-kit.pdf",
    mediaKitUrl: "/press/kxng-media-kit.zip",
    epkEnabled: false,
    instagramUrl: "https://instagram.com",
    tiktokUrl: "https://tiktok.com",
    xUrl: "https://x.com",
    facebookUrl: "https://facebook.com"
  }
];

export const mockReleases: Release[] = [
  {
    id: "r1",
    title: "Create It",
    format: "Single",
    coverUrl: "/images/release-create-it.jpg",
    releaseDate: "2026-03-21",
    description: "Primer manifiesto sonico de EM Records para 2026.",
    spotifyEmbed: "https://open.spotify.com/embed/track/7ouMYWpwJ422jRcDASZB7P",
    appleEmbed: "https://embed.music.apple.com/us/album/fake/123456789",
    youtubeEmbed: "https://www.youtube.com/embed/ScMzIvxBSi4",
    featured: true,
    contentStatus: "published",
    publishAt: "2026-02-01T00:00:00.000Z"
  },
  {
    id: "r2",
    title: "Midnight Doctrine",
    format: "EP",
    coverUrl: "/images/release-midnight.jpg",
    releaseDate: "2025-12-11",
    description: "EP colaborativo entre NOVA K y LUNA VEGA.",
    spotifyEmbed: "https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3",
    featured: false,
    contentStatus: "scheduled",
    publishAt: "2026-03-01T12:00:00.000Z"
  }
];

export const mockEvents: EventItem[] = [
  {
    id: "e1",
    title: "EM NIGHT: Miami",
    venue: "Factory Town",
    city: "Miami",
    country: "USA",
    startsAt: "2026-04-12T20:00:00.000Z",
    stripePriceId: "price_example_1",
    sponsors: ["Monster Energy", "Sony Music Latin"],
    status: "upcoming"
  },
  {
    id: "e2",
    title: "EM LIVE: CDMX",
    venue: "Foro Sol Annex",
    city: "CDMX",
    country: "Mexico",
    startsAt: "2026-05-08T21:00:00.000Z",
    stripePriceId: "price_example_2",
    sponsors: ["Nike", "Red Bull"],
    status: "upcoming"
  }
];

export const mockNews: NewsItem[] = [
  {
    id: "n1",
    title: "EM Records anuncia alianza global de distribucion",
    slug: "alianza-global-distribucion",
    excerpt: "La nueva division de distribucion acelera lanzamientos en US, LATAM y Europa.",
    category: "Business",
    heroUrl: "/images/news-distribution.jpg",
    publishedAt: "2026-02-10",
    content: "EM Records confirma una alianza de distribucion internacional para amplificar el catalogo de su roster urbano latino.",
    contentStatus: "published",
    publishAt: "2026-02-10T10:00:00.000Z"
  },
  {
    id: "n2",
    title: "PUBLISHING BY DGM MUSIC abre convocatoria de licensing",
    slug: "publishing-licensing-open-call",
    excerpt: "Marcas, agencias y estudios podran licenciar tracks del catalogo EM.",
    category: "Publishing",
    heroUrl: "/images/news-publishing.jpg",
    publishedAt: "2026-02-19",
    content: "La division publishing abre oportunidades para sincronizacion en cine, TV, gaming y advertising.",
    contentStatus: "scheduled",
    publishAt: "2026-03-10T10:00:00.000Z"
  }
];

export const mockGallery: GalleryItem[] = [
  {
    id: "g1",
    mediaUrl: "/images/gallery-1.jpg",
    caption: "Studio session - Los Angeles",
    kind: "image"
  },
  {
    id: "g2",
    mediaUrl: "/images/gallery-2.jpg",
    caption: "Arena show - Monterrey",
    kind: "image"
  },
  {
    id: "g3",
    mediaUrl: "/videos/gallery-bts.mp4",
    caption: "Behind the scenes",
    kind: "video"
  }
];

export const mockDemos: DemoSubmission[] = [
  {
    id: "d1",
    artistName: "JAY SOUL",
    email: "jay@example.com",
    trackTitle: "City Pressure",
    message: "Dark trap with melodic hook.",
    fileUrl: "https://example.com/demo1.mp3",
    status: "pending",
    createdAt: "2026-02-22T10:30:00.000Z"
  },
  {
    id: "d2",
    artistName: "MIA NORTE",
    email: "mia@example.com",
    trackTitle: "No Filter",
    message: "Reggaeton club record.",
    fileUrl: "https://example.com/demo2.mp3",
    status: "approved",
    createdAt: "2026-02-20T08:12:00.000Z"
  }
];

export const mockTicketOrders: TicketOrder[] = [
  {
    id: "t1",
    eventId: "e1",
    eventTitle: "EM NIGHT: Miami",
    buyerEmail: "fan1@example.com",
    quantity: 2,
    amountTotal: 18000,
    currency: "usd",
    qrCodeValue: "em-ticket-t1",
    qrCodeDataUrl: "data:image/png;base64,mock",
    status: "paid",
    createdAt: "2026-02-24T12:00:00.000Z"
  },
  {
    id: "t2",
    eventId: "e2",
    eventTitle: "EM LIVE: CDMX",
    buyerEmail: "fan2@example.com",
    quantity: 1,
    amountTotal: 7000,
    currency: "usd",
    qrCodeValue: "em-ticket-t2",
    qrCodeDataUrl: "data:image/png;base64,mock",
    status: "paid",
    createdAt: "2026-02-25T16:40:00.000Z"
  }
];
