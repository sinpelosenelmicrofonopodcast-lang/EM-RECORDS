import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getNewsBySlug } from "@/lib/queries";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl, formatDate, normalizeImageUrl, toJsonLd } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);

  if (!article) {
    return buildPageMetadata({
      title: "Noticia",
      description: "Artículo editorial de EM Records.",
      path: `/news/${slug}`,
      noIndex: true
    });
  }

  return buildPageMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/news/${slug}`,
    type: "article",
    image: normalizeImageUrl(article.heroUrl),
    keywords: [article.category, "noticias em records", "prensa musical"]
  });
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
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.publishAt ?? article.publishedAt,
    author: {
      "@type": "Organization",
      name: "EM Records LLC"
    },
    publisher: {
      "@type": "Organization",
      name: "EM Records LLC",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/images/em-logo-og.svg")
      }
    },
    image: [normalizeImageUrl(article.heroUrl)],
    mainEntityOfPage: absoluteUrl(`/news/${article.slug}`)
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
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
        name: "Noticias",
        item: absoluteUrl("/news")
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: absoluteUrl(`/news/${article.slug}`)
      }
    ]
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbSchema) }} />
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
