"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils";

type VideoItem = {
  id: string;
  title: string;
  label: string;
  embed: string;
  href: string | null;
  thumbnail: string;
  featured?: boolean;
};

type Props = {
  items: VideoItem[];
};

function VideoModal({ item, onClose }: { item: VideoItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-black" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-sm text-white">{item.title}</p>
          <button type="button" onClick={onClose} className="focus-gold rounded-full border border-white/20 p-1.5 text-white/70 hover:text-white" aria-label="Close video">
            <X size={14} />
          </button>
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={item.embed}
            width="100%"
            height="100%"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
            title={item.title}
          />
        </div>
      </div>
    </div>
  );
}

function VideoCard({ item, onOpen }: { item: VideoItem; onOpen: (item: VideoItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="focus-gold group overflow-hidden rounded-2xl border border-white/10 bg-black/50 text-left transition hover:border-gold/45"
      aria-label={`Play ${item.title}`}
    >
      <div className="relative aspect-video overflow-hidden">
        <img src={normalizeImageUrl(item.thumbnail)} alt={item.title} className="h-full w-full object-cover transition duration-200 ease-in-out group-hover:scale-[1.03]" loading="lazy" />
        <div className="absolute inset-0 bg-black/35" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-black/50 text-white">
            <Play size={16} />
          </span>
        </span>
      </div>
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-gold">{item.label}</p>
        <p className="mt-1 line-clamp-2 text-sm text-white/85">{item.title}</p>
      </div>
    </button>
  );
}

export function VideosShowcase({ items }: Props) {
  const [openItem, setOpenItem] = useState<VideoItem | null>(null);
  const [showAll, setShowAll] = useState(false);

  const featured = useMemo(() => items.find((item) => item.featured) ?? items[0] ?? null, [items]);
  const remaining = useMemo(() => items.filter((item) => item.id !== featured?.id), [items, featured?.id]);
  const visibleItems = showAll ? remaining : remaining.slice(0, 6);

  if (!featured) {
    return <p className="mt-6 text-sm text-white/60">No videos published yet.</p>;
  }

  return (
    <>
      <div className="mt-8 space-y-4">
        <button
          type="button"
          onClick={() => setOpenItem(featured)}
          className="focus-gold group relative block w-full overflow-hidden rounded-3xl border border-white/10 bg-black/45 text-left transition hover:border-gold/45"
          aria-label={`Play featured video: ${featured.title}`}
        >
          <div className="relative aspect-[16/8] w-full overflow-hidden">
            <img src={normalizeImageUrl(featured.thumbnail)} alt={featured.title} className="h-full w-full object-cover transition duration-200 ease-in-out group-hover:scale-[1.02]" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
            <div className="absolute bottom-5 left-5">
              <p className="text-xs uppercase tracking-[0.22em] text-gold">Featured Video</p>
              <p className="mt-2 text-2xl font-semibold text-white">{featured.title}</p>
            </div>
            <span className="absolute right-5 top-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-black/45 text-white">
              <Play size={18} />
            </span>
          </div>
        </button>

        {remaining.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <VideoCard key={item.id} item={item} onOpen={setOpenItem} />
            ))}
          </div>
        ) : null}

        {remaining.length > 6 ? (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="focus-gold rounded-full border border-gold/70 px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold"
          >
            {showAll ? "Show less videos" : "View all videos"}
          </button>
        ) : null}
      </div>

      <VideoModal item={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}
