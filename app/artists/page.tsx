import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { InternalLinksBlock } from "@/components/shared/internal-links-block";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getPublishedArtists } from "@/lib/queries";
import { buildCollectionMetadata } from "@/lib/seo";
import { absoluteUrl, normalizeImageUrl, toJsonLd } from "@/lib/utils";

export const metadata: Metadata = buildCollectionMetadata("artists");

export default async function ArtistsPage() {
  const lang = await getSiteLanguage();
  const artists = await getPublishedArtists();
  const artistsSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: lang === "es" ? "Artistas EM Records" : "EM Records Artists",
        itemListElement: artists.map((artist, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "MusicGroup",
            name: artist.name,
            url: absoluteUrl(`/artists/${artist.slug}`),
            image: normalizeImageUrl(artist.avatarUrl)
          }
        }))
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Inicio",
            item: absoluteUrl("/")
          },
          {
            "@type": "ListItem",
            position: 2,
            name: lang === "es" ? "Artistas" : "Artists",
            item: absoluteUrl("/artists")
          }
        ]
      }
    ]
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(artistsSchema) }} />
      <h1 className="sr-only">{lang === "es" ? "Artistas de EM Records" : "EM Records artists"}</h1>
      <SectionTitle
        eyebrow={lang === "es" ? "Artistas" : "Artists"}
        title={lang === "es" ? "Roster" : "Roster"}
        description={
          lang === "es"
            ? "Cada artista tiene un modelo de desarrollo completo: música, identidad visual, estrategia de lanzamientos, shows y publishing."
            : "Each artist has a full-stack development model: music, visual identity, release strategy, touring and publishing."
        }
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

      <InternalLinksBlock
        title={lang === "es" ? "Navega el Universo EM" : "Explore the EM Universe"}
        links={[
          {
            href: "/music",
            label: lang === "es" ? "Música" : "Music",
            description: lang === "es" ? "Lanzamientos oficiales del sello." : "Official label releases."
          },
          {
            href: "/videos",
            label: lang === "es" ? "Videos" : "Videos",
            description: lang === "es" ? "Visualizers y videos oficiales." : "Official visualizers and videos."
          },
          {
            href: "/press",
            label: lang === "es" ? "Prensa" : "Press",
            description: lang === "es" ? "Últimas noticias y cobertura editorial." : "Latest news and editorial coverage."
          }
        ]}
      />
    </div>
  );
}
