import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getNewsBySlug } from "@/lib/queries";
import { formatDate, normalizeImageUrl } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);

  if (!article) {
    return {
      title: "News"
    };
  }

  return {
    title: article.title,
    description: article.excerpt
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const lang = await getSiteLanguage();
  const { slug } = await params;
  const article = await getNewsBySlug(slug);

  if (!article) {
    notFound();
  }

  const paragraphs = article.content
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10">
      <Link href="/news" className="text-xs uppercase tracking-[0.22em] text-gold hover:underline">
        {lang === "es" ? "Volver a Noticias" : "Back to News"}
      </Link>

      <p className="mt-8 text-xs uppercase tracking-[0.22em] text-gold">{article.category}</p>
      <h1 className="mt-3 font-display text-5xl leading-tight text-white">{article.title}</h1>
      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(article.publishedAt)}</p>

      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl border border-white/10">
        <Image src={normalizeImageUrl(article.heroUrl)} alt={article.title} fill className="object-cover" />
      </div>

      <article className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
        <p className="text-lg leading-relaxed text-white/75">{article.excerpt}</p>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-white/80">
          {(paragraphs.length > 0 ? paragraphs : [article.content]).map((paragraph, index) => (
            <p key={`${article.id}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
