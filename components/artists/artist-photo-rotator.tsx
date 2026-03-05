"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ArtistPhoto } from "@/lib/types";

type Props = {
  artistSlug: string;
  photos: ArtistPhoto[];
};

function photoUrl(artistSlug: string, assetId: string): string {
  return `/api/public/artists/${encodeURIComponent(artistSlug)}/gallery/${encodeURIComponent(assetId)}`;
}

export function ArtistPhotoRotator({ artistSlug, photos }: Props) {
  const safePhotos = useMemo(() => photos.filter((item) => item?.id), [photos]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (safePhotos.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safePhotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [safePhotos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") setActiveIndex((prev) => (prev + 1) % safePhotos.length);
      if (event.key === "ArrowLeft") setActiveIndex((prev) => (prev - 1 + safePhotos.length) % safePhotos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, safePhotos.length]);

  if (safePhotos.length === 0) {
    return null;
  }

  const visibleGrid = [...safePhotos.slice(0, 6)];
  while (visibleGrid.length < 6) {
    visibleGrid.push({
      id: `placeholder-${visibleGrid.length}`,
      artistId: "",
      label: "Coming Soon",
      type: "photo"
    });
  }

  const current = safePhotos[activeIndex];

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Media Gallery</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleGrid.map((photo, index) => {
          const isPlaceholder = photo.id.startsWith("placeholder-");
          if (isPlaceholder) {
            return (
              <div key={photo.id} className="aspect-[4/3] rounded-2xl border border-dashed border-white/15 bg-black/35 p-4">
                <div className="flex h-full items-end">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Slot {index + 1}</p>
                </div>
              </div>
            );
          }

          const src = photoUrl(artistSlug, photo.id);
          const isActive = safePhotos[activeIndex]?.id === photo.id;

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => {
                setActiveIndex(safePhotos.findIndex((item) => item.id === photo.id));
                setLightboxOpen(true);
              }}
              className={[
                "focus-gold group relative aspect-[4/3] overflow-hidden rounded-2xl border bg-black/50 text-left transition",
                isActive ? "border-gold/70" : "border-white/10 hover:border-white/30"
              ].join(" ")}
            >
              <img src={src} alt={photo.label} className="h-full w-full object-cover transition duration-200 ease-in-out group-hover:scale-[1.02]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 truncate text-xs uppercase tracking-[0.16em] text-white/80">{photo.label}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <button type="button" onClick={() => setLightboxOpen(true)} className="focus-gold rounded-full border border-gold/70 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-gold">
          View Full Gallery
        </button>
      </div>

      {lightboxOpen && current ? (
        <div className="fixed inset-0 z-[100] bg-black/88 p-4" role="dialog" aria-modal="true" aria-label="Gallery lightbox">
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-white/85">{current.label}</p>
              <button type="button" onClick={() => setLightboxOpen(false)} className="focus-gold rounded-full border border-white/20 p-1.5 text-white/75 hover:text-white" aria-label="Close gallery">
                <X size={15} />
              </button>
            </div>

            <div
              className="relative flex-1 overflow-hidden rounded-2xl border border-white/15 bg-black"
              onTouchStart={(event) => {
                touchStartX.current = event.changedTouches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                const start = touchStartX.current;
                const end = event.changedTouches[0]?.clientX ?? null;
                if (start == null || end == null) return;
                const delta = end - start;
                if (Math.abs(delta) < 30) return;
                if (delta < 0) setActiveIndex((prev) => (prev + 1) % safePhotos.length);
                if (delta > 0) setActiveIndex((prev) => (prev - 1 + safePhotos.length) % safePhotos.length);
              }}
            >
              <img src={photoUrl(artistSlug, current.id)} alt={current.label} className="h-full w-full object-contain" />
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev - 1 + safePhotos.length) % safePhotos.length)}
                className="focus-gold absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/40 p-2 text-white/85"
                aria-label="Previous image"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % safePhotos.length)}
                className="focus-gold absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/40 p-2 text-white/85"
                aria-label="Next image"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
