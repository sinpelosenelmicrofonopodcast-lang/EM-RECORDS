import type { Metadata } from "next";
import Image from "next/image";
import { SectionTitle } from "@/components/shared/section-title";
import { getNews } from "@/lib/queries";
import { formatDate, normalizeImageUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "News & Press",
  description: "EM Records editorial blog, press appearances and announcements."
};

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
      <SectionTitle
        eyebrow="News / Press"
        title="Editorial"
        description="Press appearances, label milestones, strategic partnerships and artist narratives."
      />

      <div className="mt-10 grid gap-6">
        {news.map((item) => (
          <article key={item.id} id={item.slug} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] md:grid md:grid-cols-[260px_1fr]">
            <div className="relative min-h-[220px]">
              <Image src={normalizeImageUrl(item.heroUrl)} alt={item.title} fill className="object-cover" />
            </div>
            <div className="p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-gold">{item.category}</p>
              <h2 className="mt-3 font-display text-3xl text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{item.content}</p>
              <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/45">{formatDate(item.publishedAt)}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
