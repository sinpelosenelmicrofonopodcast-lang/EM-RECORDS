"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Apple, Copy, Share2, Youtube } from "lucide-react";
import { Music2 } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils";

type DiscographyItem = {
  id: string;
  title: string;
  year: string;
  coverUrl: string;
  artistSlug?: string | null;
  links: {
    spotify?: string | null;
    apple?: string | null;
    youtube?: string | null;
  };
};

type Props = {
  items: DiscographyItem[];
};

const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzInIGhlaWdodD0nMzInIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHJlY3Qgd2lkdGg9JzMyJyBoZWlnaHQ9JzMyJyBmaWxsPScjMGIwYjBjJy8+PC9zdmc+";

function PlatformAction({
  href,
  label,
  icon
}: {
  href?: string | null;
  label: string;
  icon: "spotify" | "apple" | "youtube";
}) {
  const Icon = icon === "spotify" ? Music2 : icon === "apple" ? Apple : Youtube;
  if (!href) {
    return (
      <span title="Link coming soon" className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-full border border-white/10 text-white/35">
        <Icon size={13} />
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-gold inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/75 transition hover:border-gold hover:text-gold"
      aria-label={label}
    >
      <Icon size={13} />
    </a>
  );
}

export function DiscographyGrid({ items }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyReleaseLink = async (item: DiscographyItem) => {
    const shareUrl = item.links.spotify || item.links.apple || item.links.youtube || (item.artistSlug ? `${window.location.origin}/artists/${item.artistSlug}` : window.location.href);
    await navigator.clipboard.writeText(shareUrl);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 1200);
  };

  const shareRelease = async (item: DiscographyItem) => {
    const shareUrl = item.links.spotify || item.links.apple || item.links.youtube || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          url: shareUrl
        });
        return;
      }
    } catch {
      // Fallback to clipboard.
    }
    await copyReleaseLink(item);
  };

  return (
    <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
      {items.map((release) => (
        <article
          key={release.id}
          className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition duration-200 ease-in-out hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-[0_18px_28px_rgba(0,0,0,.35)]"
        >
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={normalizeImageUrl(release.coverUrl)}
              alt={release.title}
              fill
              sizes="(max-width: 768px) 45vw, 22vw"
              className="object-cover transition duration-200 ease-in-out group-hover:scale-[1.03]"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          </div>
          <div className="space-y-2 p-3">
            <p className="line-clamp-1 text-sm font-semibold text-white">{release.title}</p>
            <p className="text-xs text-white/55">{release.year}</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <PlatformAction href={release.links.spotify} label="Spotify" icon="spotify" />
                <PlatformAction href={release.links.apple} label="Apple Music" icon="apple" />
                <PlatformAction href={release.links.youtube} label="YouTube" icon="youtube" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shareRelease(release)}
                  className="focus-gold inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/75 transition hover:border-gold hover:text-gold"
                  aria-label="Share release"
                >
                  <Share2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => copyReleaseLink(release)}
                  className="focus-gold inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/75 transition hover:border-gold hover:text-gold"
                  aria-label="Copy release link"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>
            {copiedId === release.id ? <p className="text-[10px] uppercase tracking-[0.14em] text-gold">Copied</p> : null}
            {release.artistSlug ? (
              <Link href={`/artists/${release.artistSlug}`} className="inline-block text-[11px] uppercase tracking-[0.14em] text-white/55 hover:text-gold">
                View artist
              </Link>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
