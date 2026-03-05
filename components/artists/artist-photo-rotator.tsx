"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ArtistPhoto } from "@/lib/types";

type Props = {
  artistSlug: string;
  photos: ArtistPhoto[];
};

export function ArtistPhotoRotator({ artistSlug, photos }: Props) {
  const safePhotos = useMemo(() => photos.filter((item) => item?.id), [photos]);
  const thumbPhotos = safePhotos.slice(0, 6);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safePhotos.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % safePhotos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [safePhotos]);

  if (safePhotos.length === 0) {
    return null;
  }

  const active = safePhotos[index]!;
  const imageUrl = `/api/public/artists/${encodeURIComponent(artistSlug)}/gallery/${encodeURIComponent(active.id)}`;

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40">
        <div className="relative aspect-[16/8] w-full bg-black">
          <img
            key={active.id}
            src={imageUrl}
            alt={active.label}
            className="h-full w-full object-cover opacity-100 transition-opacity duration-700"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-gold">Gallery</p>
              <p className="mt-2 text-lg text-white">{active.label}</p>
            </div>
            <p className="text-xs text-white/65">
              {index + 1}/{safePhotos.length}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {thumbPhotos.map((photo, thumbIndex) => {
          const thumbUrl = `/api/public/artists/${encodeURIComponent(artistSlug)}/gallery/${encodeURIComponent(photo.id)}`;
          const isActive = safePhotos[index]?.id === photo.id;

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setIndex(thumbIndex)}
              className={`overflow-hidden rounded-xl border bg-black/60 text-left transition ${isActive ? "border-gold/70" : "border-white/10 hover:border-white/30"}`}
            >
              <div className="aspect-[4/3] w-full bg-black">
                <img src={thumbUrl} alt={photo.label} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <p className="truncate px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/70">{photo.label}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-right">
        <Link href="/gallery" className="rounded-full border border-gold/60 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-gold hover:border-gold">
          View Full Gallery
        </Link>
      </div>
    </section>
  );
}
