import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/section-title";
import { getArtists } from "@/lib/queries";
import { normalizeImageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Artists",
  description: "EM roster: latin urban artists designed for global growth."
};

export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="Artists"
        title="Roster"
        description="Each artist has a full-stack development model: music, visual identity, release strategy, touring and publishing."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {artists.map((artist) => (
          <Link key={artist.id} href={`/artists/${artist.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="relative aspect-[4/5]">
              <Image src={normalizeImageUrl(artist.avatarUrl)} alt={artist.name} fill className="object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <h2 className="font-display text-2xl text-white">{artist.name}</h2>
              <p className="mt-2 text-sm text-white/65">{artist.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
