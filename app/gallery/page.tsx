import type { Metadata } from "next";
import Image from "next/image";
import { SectionTitle } from "@/components/shared/section-title";
import { getGallery } from "@/lib/queries";
import { normalizeImageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gallery",
  description: "EM visual gallery, backstage captures and campaign footage."
};

export default async function GalleryPage() {
  const gallery = await getGallery();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="Visual Gallery"
        title="Scenes"
        description="From studio sessions to arena moments: visual storytelling with label-grade polish."
      />

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {gallery.map((item) => (
          <figure key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10">
            {item.kind === "video" ? (
              <video src={normalizeImageUrl(item.mediaUrl)} autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <Image src={normalizeImageUrl(item.mediaUrl)} alt={item.caption} fill className="object-cover transition duration-700 group-hover:scale-105" />
            )}
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 text-xs uppercase tracking-[0.16em] text-white/80">
              {item.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
