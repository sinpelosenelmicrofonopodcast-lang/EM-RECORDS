"use client";

import { useEffect, useState } from "react";
import { Copy, Play, Share2 } from "lucide-react";

type Platform = "spotify" | "apple" | "youtube";

type TrackItem = {
  id: string;
  title: string;
  artistName: string;
  links: {
    spotify?: string | null;
    apple?: string | null;
    youtube?: string | null;
  };
};

type Props = {
  tracks: TrackItem[];
  defaultPlatform?: Platform | null;
};

const PLATFORM_KEY = "em-platform-preference";

function getPlatformUrl(track: TrackItem, platform: Platform | null): string | null {
  if (!platform) return track.links.spotify || track.links.apple || track.links.youtube || null;
  return track.links[platform] || track.links.spotify || track.links.apple || track.links.youtube || null;
}

export function TopTracksList({ tracks, defaultPlatform = "spotify" }: Props) {
  const [platform, setPlatform] = useState<Platform | null>(defaultPlatform);
  const [feedback, setFeedback] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PLATFORM_KEY) as Platform | null;
      if (saved && (saved === "spotify" || saved === "apple" || saved === "youtube")) {
        setPlatform(saved);
      }
    } catch {
      setPlatform(defaultPlatform);
    }
  }, [defaultPlatform]);

  const setPreference = (next: Platform) => {
    setPlatform(next);
    try {
      window.localStorage.setItem(PLATFORM_KEY, next);
    } catch {
      // Ignore storage errors.
    }
  };

  const playTrack = (track: TrackItem) => {
    const href = getPlatformUrl(track, platform);
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const copyTrackLink = async (track: TrackItem) => {
    const href = getPlatformUrl(track, platform);
    if (!href) return;
    await navigator.clipboard.writeText(href);
    setFeedback({ id: track.id, message: "Copied" });
    window.setTimeout(() => setFeedback((prev) => (prev?.id === track.id ? null : prev)), 1400);
  };

  const shareTrack = async (track: TrackItem) => {
    const href = getPlatformUrl(track, platform);
    if (!href) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${track.title} · ${track.artistName}`,
          url: href
        });
        return;
      }
    } catch {
      // Continue to clipboard fallback.
    }
    await copyTrackLink(track);
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Top Tracks</p>
        <div className="flex items-center gap-2">
          {(["spotify", "apple", "youtube"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPreference(item)}
              className={[
                "focus-gold rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.14em]",
                platform === item ? "border-gold text-gold" : "border-white/20 text-white/65 hover:text-white"
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {tracks.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">Coming soon.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {tracks.map((track, index) => {
            const href = getPlatformUrl(track, platform);
            const disabled = !href;
            return (
              <li key={track.id} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">
                      {index + 1}. {track.title}
                    </p>
                    <p className="text-xs text-white/55">{track.artistName}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => playTrack(track)}
                      title={disabled ? "Link coming soon" : "Play"}
                      className="focus-gold rounded-full border border-white/20 p-2 text-white/75 hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => shareTrack(track)}
                      title={disabled ? "Link coming soon" : "Share"}
                      className="focus-gold rounded-full border border-white/20 p-2 text-white/75 hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Share2 size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => copyTrackLink(track)}
                      title={disabled ? "Link coming soon" : "Copy link"}
                      className="focus-gold rounded-full border border-white/20 p-2 text-white/75 hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {feedback?.id === track.id ? <p className="mt-2 text-xs text-gold">{feedback.message}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
