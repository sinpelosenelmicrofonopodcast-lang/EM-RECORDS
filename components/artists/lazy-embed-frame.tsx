"use client";

import { useState } from "react";
import { Play } from "lucide-react";

type Props = {
  title: string;
  src: string;
  height: number;
};

export function LazyEmbedFrame({ title, src, height }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/45">
      {!loaded ? (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="focus-gold flex h-full min-h-[120px] w-full items-center justify-center gap-2 px-4 py-10 text-sm text-white/75"
          style={{ minHeight: Math.max(120, Math.min(height, 240)) }}
          aria-label={`Load ${title} player`}
        >
          <Play size={15} />
          Load {title} player
        </button>
      ) : (
        <iframe
          src={src}
          width="100%"
          height={String(height)}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={title}
          className="block w-full border-0"
        />
      )}
    </div>
  );
}
