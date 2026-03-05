"use client";

import { useState } from "react";

type Props = {
  spotifyEmbedSrc: string;
  title: string;
};

export function StickyStreamPlayer({ spotifyEmbedSrc, title }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-gold bg-black/90 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-gold shadow-[0_8px_30px_rgba(0,0,0,.5)]"
      >
        Play
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,360px)] rounded-2xl border border-white/15 bg-black/90 p-2 shadow-[0_20px_40px_rgba(0,0,0,.6)] backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="truncate text-[11px] uppercase tracking-[0.16em] text-white/70">{title}</p>
        <button type="button" onClick={() => setCollapsed(true)} className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/60 hover:text-white">
          Hide
        </button>
      </div>
      <iframe
        src={spotifyEmbedSrc}
        width="100%"
        height="80"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className="rounded-xl border border-white/10"
      />
    </div>
  );
}
