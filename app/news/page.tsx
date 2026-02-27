import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionTitle } from "@/components/shared/section-title";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getNews } from "@/lib/queries";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl, formatDate, normalizeImageUrl, toJsonLd } from "@/lib/utils";

export const metadata: Metadata = buildPageMetadata({
  title: "Noticias y Prensa",
  description: "Noticias oficiales, apariciones en prensa y comunicados editoriales de EM Records.",
  path: "/news",
  keywords: ["prensa musical", "noticias em records", "blog editorial urbano", "latin music news"]
});

export default async function NewsPage() {
  const lang = await getSiteLanguage();
  const news = await getNews();
  const newsSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: lang === "es" ? "Noticias y Prensa EM Records" : "EM Records News and Press",
        itemListElement: news.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "NewsArticle",
            headline: item.title,
            datePublished: item.publishedAt,
            url: absoluteUrl(`/news/${item.slug}`),
            image: normalizeImageUrl(item.heroUrl)
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
            name: lang === "es" ? "Noticias" : "News",
            item: absoluteUrl("/news")
          }
        ]
      }
    ]
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(newsSchema) }} />
      <SectionTitle
        eyebrow={lang === "es" ? "Noticias / Prensa" : "News / Press"}
        title={lang === "es" ? "Editorial" : "Editorial"}
        description={
          lang === "es"
            ? "Apariciones en prensa, hitos del sello, alianzas estratégicas y narrativa de artistas."
            : "Press appearances, label milestones, strategic partnerships and artist narratives."
        }
      />

      <div className="mt-10 grid gap-6">
        {news.map((item) => (
          <Link
            key={item.id}
            href={`/news/${item.slug}`}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-gold/40 hover:bg-white/[0.03] md:grid md:grid-cols-[260px_1fr]"
          >
            <div className="relative min-h-[220px]">
              <Image src={normalizeImageUrl(item.heroUrl)} alt={item.title} fill className="object-cover" />
            </div>
            <div className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-gold">{item.category}</p>
              <h2 className="mt-3 font-display text-3xl text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{item.excerpt}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gold">{lang === "es" ? "Leer Artículo" : "Read Article"}</p>
              <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(item.publishedAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
