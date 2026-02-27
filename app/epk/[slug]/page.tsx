import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";
import { lockEpkAction, unlockEpkAction } from "@/lib/actions/site";
import { createEpkAccessToken, getEpkCookieName } from "@/lib/epk";
import { getArtistBySlug, getUpcomingEvents } from "@/lib/queries";
import { buildPageMetadata } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate,
  getSpotifyEmbedHeight,
  normalizeImageUrl,
  normalizeSoundCloudEmbedUrl,
  normalizeSpotifyEmbedUrl,
  normalizeYouTubeEmbedUrl
} from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist || !artist.epkEnabled) {
    return buildPageMetadata({
      title: "EPK",
      description: "Electronic Press Kit privado.",
      path: `/epk/${slug}`,
      noIndex: true
    });
  }

  return buildPageMetadata({
    title: `${artist.name} EPK`,
    description: `Private electronic press kit for ${artist.name}.`,
    path: `/epk/${slug}`,
    noIndex: true
  });
}

async function getArtistEpkSecurity(
  slug: string
): Promise<{
  exists: boolean;
  passwordHash: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { exists: true, passwordHash: null };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("artists").select("epk_enabled, epk_password_hash").eq("slug", slug).maybeSingle();

    if (error || !data || !data.epk_enabled) {
      return { exists: false, passwordHash: null };
    }

    return {
      exists: true,
      passwordHash: data.epk_password_hash ? String(data.epk_password_hash) : null
    };
  } catch {
    return { exists: false, passwordHash: null };
  }
}

export default async function ArtistEpkPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist || !artist.epkEnabled) {
    notFound();
  }

  const [events, epkSecurity, qs] = await Promise.all([getUpcomingEvents(), getArtistEpkSecurity(slug), searchParams]);

  if (!epkSecurity.exists) {
    notFound();
  }

  const passwordHash = epkSecurity.passwordHash;
  const cookieStore = await cookies();
  const existingCookieValue = cookieStore.get(getEpkCookieName(slug))?.value;
  const expectedCookieValue = passwordHash ? createEpkAccessToken(slug, passwordHash) : null;
  const isUnlocked = !passwordHash || Boolean(existingCookieValue && expectedCookieValue && existingCookieValue === expectedCookieValue);

  if (!isUnlocked) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-20 md:px-10">
        <div className="w-full rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-gold">Private Access</p>
          <h1 className="mt-3 font-display text-4xl text-white">{artist.name} EPK</h1>
          <p className="mt-3 text-sm text-white/70">Authorized access only. Enter the press password provided by EM Records.</p>

          <form action={unlockEpkAction} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="slug" value={slug} />
            <input
              type="password"
              name="password"
              required
              placeholder="EPK Password"
              className="w-full rounded-full border border-white/20 bg-black/80 px-5 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-gold"
            />
            <button
              type="submit"
              className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5"
            >
              Unlock
            </button>
          </form>

          {qs.error === "invalid" ? <p className="mt-3 text-xs uppercase tracking-[0.16em] text-red-300">Invalid password. Try again.</p> : null}
        </div>
      </div>
    );
  }

  const spotifyEmbedSrc = artist.spotifyEmbed ? normalizeSpotifyEmbedUrl(artist.spotifyEmbed) : null;
  const spotifyEmbedHeight = spotifyEmbedSrc ? getSpotifyEmbedHeight(spotifyEmbedSrc) : 152;
  const soundcloudEmbedSrc = artist.soundcloudEmbed ? normalizeSoundCloudEmbedUrl(artist.soundcloudEmbed) : null;
  const musicVideoSrc = artist.musicVideoEmbed
    ? normalizeYouTubeEmbedUrl(artist.musicVideoEmbed)
    : artist.youtubeUrl
      ? normalizeYouTubeEmbedUrl(artist.youtubeUrl)
      : null;

  return (
    <div>
      <section className="border-b border-white/10">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-20 md:grid-cols-[1.2fr_0.8fr] md:items-end md:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gold">Electronic Press Kit</p>
            <h1 className="mt-3 font-display text-5xl text-white md:text-6xl">{artist.name}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">{artist.bio}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {artist.pressKitUrl ? (
                <a
                  href={artist.pressKitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                >
                  Download Press Kit
                </a>
              ) : null}
              {artist.mediaKitUrl ? (
                <a
                  href={artist.mediaKitUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 hover:border-gold hover:text-gold"
                >
                  Download Media Kit
                </a>
              ) : null}
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10">
            <Image src={normalizeImageUrl(artist.heroMediaUrl)} alt={artist.name} fill className="object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Booking</p>
            <a href={`mailto:${artist.bookingEmail}`} className="mt-3 inline-block text-sm text-white underline underline-offset-4">
              {artist.bookingEmail}
            </a>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Next Availability</p>
            <p className="mt-3 text-sm text-white/75">{events[0] ? formatDate(events[0].startsAt) : "TBA"}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Access</p>
            <form action={lockEpkAction} className="mt-3">
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className="text-sm text-white underline underline-offset-4">
                Lock EPK
              </button>
            </form>
          </article>
        </div>
      </section>

      {(spotifyEmbedSrc || soundcloudEmbedSrc || musicVideoSrc) ? (
        <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-10">
          <div className="grid gap-4 md:grid-cols-2">
            {spotifyEmbedSrc ? (
              <iframe
                src={spotifyEmbedSrc}
                width="100%"
                height={String(spotifyEmbedHeight)}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="rounded-2xl border border-white/10"
              />
            ) : null}
            {soundcloudEmbedSrc ? (
              <iframe
                src={soundcloudEmbedSrc}
                width="100%"
                height="352"
                allow="autoplay"
                className="rounded-2xl border border-white/10"
              />
            ) : null}
          </div>
          {musicVideoSrc ? (
            <div className="mt-4">
              <iframe
                src={musicVideoSrc}
                width="100%"
                height="440"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                className="w-full rounded-2xl border border-white/10"
              />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
