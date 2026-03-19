import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSongPageData } from "@/modules/social-media/service";
import { absoluteUrl } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const song = await getPublicSongPageData(slug);

  if (!song) {
    return {
      title: "Song | EM Records",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: `${song.title} | EM Records`,
    description: song.description ?? `Escucha ${song.title} en EM Records.`,
    alternates: {
      canonical: absoluteUrl(`/song/${slug}`)
    }
  };
}

export default async function SongPage({ params }: Props) {
  const { slug } = await params;
  const song = await getPublicSongPageData(slug);

  if (!song) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10">
      <section className="premium-surface rounded-[32px] p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="relative aspect-square overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
            {song.coverUrl ? (
              <Image src={song.coverUrl} alt={song.title} fill className="object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-white/35">No artwork</div>
            )}
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-gold">Song</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">{song.title}</h1>
            <p className="mt-2 text-sm text-white/65">
              {song.artistSlug ? (
                <Link href={`/artists/${song.artistSlug}`} className="hover:text-gold">
                  {song.artistName}
                </Link>
              ) : (
                song.artistName
              )}
            </p>

            {song.description ? <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/72">{song.description}</p> : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {song.releaseSlug ? (
                <Link href={`/music/${song.releaseSlug}`} className="rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold">
                  Open release
                </Link>
              ) : null}
              {song.links.map((item) => (
                <a
                  key={item.label}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/80 hover:border-gold hover:text-gold"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
