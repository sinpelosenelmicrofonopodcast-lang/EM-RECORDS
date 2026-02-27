"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Apple, Music2, Play, Youtube } from "lucide-react";
import type { SiteLanguage } from "@/lib/i18n";
import { trackEvent } from "@/lib/tracking";
import { normalizeImageUrl } from "@/lib/utils";

type ReleaseCatalogItem = {
  id: string;
  title: string;
  description: string;
  format: string;
  featured: boolean;
  coverUrl: string;
  releaseDateLabel: string;
  artistName: string;
  artistSlug: string | null;
  featuring: string | null;
  spotifyEmbed: string | null;
  appleEmbed: string | null;
  youtubeEmbed: string | null;
};

type ReleaseCatalogProps = {
  lang: SiteLanguage;
  items: ReleaseCatalogItem[];
};

const FALLBACK_COVER = "/icon.svg";

function extractFeaturing(text: string): string | null {
  const match = text.match(/(?:feat\.?|ft\.?)\s*([^,)\n]+)/i);
  return match?.[1]?.trim() ?? null;
}

function toSpotifyLink(embedUrl: string | null): string | null {
  if (!embedUrl) return null;
  return embedUrl.replace("/embed/", "/");
}

function toAppleLink(embedUrl: string | null): string | null {
  if (!embedUrl) return null;
  return embedUrl.replace("embed.music.apple.com", "music.apple.com");
}

function toYouTubeLink(embedUrl: string | null): string | null {
  if (!embedUrl) return null;
  const match = embedUrl.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (!match) return null;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function normalizeCover(url: string | null | undefined): string {
  if (!url) return FALLBACK_COVER;
  const normalized = normalizeImageUrl(url);
  return normalized || FALLBACK_COVER;
}

function PlatformChip({
  href,
  label,
  icon,
  onClick
}: {
  href: string;
  label: string;
  icon: "spotify" | "apple" | "youtube";
  onClick?: () => void;
}) {
  const Icon = icon === "spotify" ? Music2 : icon === "apple" ? Apple : Youtube;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-2.5 text-xs text-white/78 transition duration-200 ease-in-out hover:border-gold/70 hover:text-gold"
      aria-label={label}
    >
      <Icon size={12} />
      <span>{label}</span>
    </a>
  );
}

function VideoModal({
  openItem,
  onClose,
  lang
}: {
  openItem: { title: string; youtubeEmbed: string } | null;
  onClose: () => void;
  lang: SiteLanguage;
}) {
  useEffect(() => {
    if (!openItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openItem, onClose]);

  if (!openItem) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/82 p-4" onClick={onClose}>
      <button
        aria-label={lang === "es" ? "Cerrar" : "Close"}
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-white/30 px-3 py-1 text-xs text-white/80"
      >
        {lang === "es" ? "Cerrar" : "Close"}
      </button>
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-black" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm text-white">{openItem.title}</p>
        </div>
        <div className="aspect-video w-full">
          <iframe
            src={openItem.youtubeEmbed}
            width="100%"
            height="100%"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

export function ReleaseCatalog({ lang, items }: ReleaseCatalogProps) {
  const [openVideoItem, setOpenVideoItem] = useState<{ title: string; youtubeEmbed: string } | null>(null);

  const mappedItems = useMemo(
    () => {
      // Prevent duplicated cards when upstream query returns repeated rows.
      const uniqueItems = Array.from(
        new Map(
          items.map((item) => [
            item.id || `${item.title}-${item.releaseDateLabel}-${item.artistSlug ?? item.artistName}`,
            item
          ])
        ).values()
      );

      return uniqueItems.map((item) => {
        return {
          ...item,
          cover: normalizeCover(item.coverUrl),
          featuring: item.featuring || extractFeaturing(`${item.title} ${item.description}`),
          spotifyLink: toSpotifyLink(item.spotifyEmbed),
          appleLink: toAppleLink(item.appleEmbed),
          youtubeLink: toYouTubeLink(item.youtubeEmbed)
        };
      });
    },
    [items]
  );

  return (
    <>
      <section className="mx-auto mt-8 w-full max-w-[1100px] space-y-5">
        {mappedItems.map((item, index) => {
          const hasVideo = Boolean(item.youtubeEmbed);
          const audioEmbed = item.spotifyEmbed || item.appleEmbed;
          const hasAudioPreview = Boolean(audioEmbed);
          const audioHeight = item.spotifyEmbed ? 80 : 175;
          const embeddedPlatform: "spotify" | "apple" | null = item.spotifyEmbed ? "spotify" : item.appleEmbed ? "apple" : null;
          const showSpotifyChip = Boolean(item.spotifyLink) && embeddedPlatform !== "spotify";
          const showAppleChip = Boolean(item.appleLink) && embeddedPlatform !== "apple";
          const showYouTubeChip = Boolean(item.youtubeLink);
          const topGridClass = hasVideo ? "md:grid-cols-[120px_minmax(0,1fr)_208px]" : "md:grid-cols-[120px_minmax(0,1fr)]";

          return (
            <article
              key={item.id}
              className="premium-surface group animate-fade-up overflow-hidden rounded-[20px] p-4 md:p-5"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className={`grid gap-4 ${topGridClass} md:items-start`}>
                <div
                  className="shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-black"
                  style={{ width: 120, height: 120, flex: "0 0 120px" }}
                >
                  <img
                    src={item.cover}
                    alt={item.title}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_COVER;
                    }}
                    className="h-full w-full max-w-none object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[28px] font-semibold leading-[1] text-white md:text-[34px]">{item.title}</h3>

                  <p className="mt-1 text-[14px] text-white/78">
                    {item.artistSlug ? (
                      <Link href={`/artists/${item.artistSlug}`} className="hover:text-gold">
                        {item.artistName}
                      </Link>
                    ) : (
                      <span>{item.artistName}</span>
                    )}
                    {item.featuring ? <span className="text-white/60"> feat. {item.featuring}</span> : null}
                  </p>

                  <p className="mt-2 text-[12px] text-white/54">
                    {lang === "es" ? "Lanzamiento" : "Release"}: {item.releaseDateLabel}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {showSpotifyChip && item.spotifyLink ? (
                      <PlatformChip
                        href={item.spotifyLink}
                        label="Spotify"
                        icon="spotify"
                        onClick={() => trackEvent("release_platform_click", { platform: "spotify", releaseId: item.id, releaseTitle: item.title })}
                      />
                    ) : null}
                    {showAppleChip && item.appleLink ? (
                      <PlatformChip
                        href={item.appleLink}
                        label="Apple"
                        icon="apple"
                        onClick={() => trackEvent("release_platform_click", { platform: "apple", releaseId: item.id, releaseTitle: item.title })}
                      />
                    ) : null}
                    {showYouTubeChip && item.youtubeLink ? (
                      <PlatformChip
                        href={item.youtubeLink}
                        label="YouTube"
                        icon="youtube"
                        onClick={() => trackEvent("release_platform_click", { platform: "youtube", releaseId: item.id, releaseTitle: item.title })}
                      />
                    ) : null}
                  </div>
                </div>

                {hasVideo ? (
                  <div className="shrink-0 space-y-2 md:w-[208px]">
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-lg border border-white/20 bg-black">
                        <iframe
                          src={item.youtubeEmbed as string}
                          width="208"
                          height="112"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                          className="block h-[112px] w-full border-0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          trackEvent("release_video_open", { releaseId: item.id, releaseTitle: item.title });
                          setOpenVideoItem({ title: item.title, youtubeEmbed: item.youtubeEmbed as string });
                        }}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-black/25 px-3 text-xs text-white/88 transition duration-200 ease-in-out hover:border-gold hover:text-gold"
                      >
                        <Play size={13} />
                        <span>{lang === "es" ? "Abrir video" : "Open video"}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {hasAudioPreview ? (
                <div className="premium-card mt-4 rounded-xl p-2.5">
                  <div className="min-w-0">
                    <div className="overflow-hidden rounded-lg border border-white/20 bg-black">
                      <iframe
                        src={audioEmbed as string}
                        width="100%"
                        height={String(audioHeight)}
                        loading="lazy"
                        allow="autoplay *; clipboard-write; encrypted-media *; fullscreen *; picture-in-picture"
                        className="block w-full border-0"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <VideoModal openItem={openVideoItem} onClose={() => setOpenVideoItem(null)} lang={lang} />
    </>
  );
}
