import type { MetadataRoute } from "next";
import { getNews } from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";

export default async function newsSitemap(): Promise<MetadataRoute.Sitemap> {
  const news = await getNews();
  const now = new Date();

  return news.map((item) => ({
    url: absoluteUrl(`/news/${item.slug}`),
    lastModified: item.publishedAt ? new Date(item.publishedAt) : now,
    changeFrequency: "monthly",
    priority: 0.8
  }));
}
