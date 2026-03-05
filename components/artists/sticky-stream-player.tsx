"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, X } from "lucide-react";

type Platform = "spotify" | "apple" | "youtube";

type Props = {
  artistName: string;
  trackName: string;
  links: {
    spotify?: string | null;
    apple?: string | null;
    youtube?: string | null;
  };
  defaultPlatform?: Platform | null;
};

const HIDDEN_KEY = "em-sticky-player-hidden";
const PLATFORM_KEY = "em-platform-preference";

function firstAvailablePlatform(links: Props["links"]): Platform | null {
  if (links.spotify) return "spotify";
  if (links.apple) return "apple";
  if (links.youtube) return "youtube";
  return null;
}

function platformLabel(platform: Platform): string {
  if (platform === "apple") return "Apple";
  if (platform === "youtube") return "YouTube";
  return "Spotify";
}

export function StickyStreamPlayer({ artistName, trackName, links, defaultPlatform = "spotify" }: Props) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fallbackPlatform = useMemo(() => firstAvailablePlatform(links), [links]);
  const [platform, setPlatform] = useState<Platform | null>(defaultPlatform ?? fallbackPlatform);

  useEffect(() => {
    setMounted(true);
    try {
      const hidden = window.localStorage.getItem(HIDDEN_KEY) === "1";
      setDismissed(hidden);
      const savedPlatform = window.localStorage.getItem(PLATFORM_KEY) as Platform | null;
      if (savedPlatform && (savedPlatform === "spotify" || savedPlatform === "apple" || savedPlatform === "youtube")) {
        setPlatform(savedPlatform);
      } else {
        setPlatform(defaultPlatform ?? fallbackPlatform);
      }
    } catch {
      setPlatform(defaultPlatform ?? fallbackPlatform);
    }
  }, [defaultPlatform, fallbackPlatform]);

  useEffect(() => {
    if (!mounted || dismissed) return;
    const hero = document.getElementById("artist-hero");
    if (!hero) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries[0]?.isIntersecting ?? false;
        setIsVisible(!inView);
      },
      { threshold: 0.1 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [mounted, dismissed]);

  const activePlatform = platform && links[platform] ? platform : fallbackPlatform;
  const activeUrl = activePlatform ? links[activePlatform] : null;

  if (!mounted || !activePlatform || !activeUrl) {
    return null;
  }

  const closePlayer = () => {
    setDismissed(true);
    setIsPlaying(false);
    try {
      window.localStorage.setItem(HIDDEN_KEY, "1");
    } catch {
      // Ignore storage access errors.
    }
  };

  const reopenPlayer = () => {
    setDismissed(false);
    try {
      window.localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // Ignore storage access errors.
    }
  };

  const pickPlatform = (next: Platform) => {
    setPlatform(next);
    try {
      window.localStorage.setItem(PLATFORM_KEY, next);
    } catch {
      // Ignore storage access errors.
    }
  };

  const onPlayPause = () => {
    if (!isPlaying) {
      window.open(activeUrl, "_blank", "noopener,noreferrer");
    }
    setIsPlaying((prev) => !prev);
  };

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={reopenPlayer}
        className="focus-gold fixed bottom-4 right-4 z-[70] rounded-full border border-gold/70 bg-black/92 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-gold"
      >
        Open Player
      </button>
    );
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className="fixed bottom-3 left-3 right-3 z-[70] rounded-2xl border border-white/15 bg-black/92 p-3 shadow-[0_20px_40px_rgba(0,0,0,.55)] backdrop-blur md:left-auto md:right-4 md:w-[min(96vw,460px)]"
      aria-label="Sticky stream player"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Now playing</p>
          <p className="mt-1 text-sm font-semibold text-white">{trackName}</p>
          <p className="text-xs text-white/60">{artistName}</p>
        </div>
        <button
          type="button"
          onClick={closePlayer}
          className="focus-gold rounded-full border border-white/20 p-1.5 text-white/70 hover:text-white"
          aria-label="Close sticky player"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["spotify", "apple", "youtube"] as const).map((item) => (
          <button
            key={item}
            type="button"
            disabled={!links[item]}
            onClick={() => pickPlatform(item)}
            className={[
              "focus-gold rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition",
              platform === item ? "border-gold text-gold" : "border-white/20 text-white/65 hover:text-white",
              links[item] ? "" : "cursor-not-allowed opacity-40"
            ].join(" ")}
            title={links[item] ? `Open on ${platformLabel(item)}` : "Link coming soon"}
          >
            {platformLabel(item)}
          </button>
        ))}

        <button
          type="button"
          onClick={onPlayPause}
          className="focus-gold ml-auto inline-flex items-center gap-2 rounded-full border border-gold bg-gold px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
    </aside>
  );
}
