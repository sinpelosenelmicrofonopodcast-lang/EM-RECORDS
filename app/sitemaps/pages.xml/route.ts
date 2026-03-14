import { getNews } from "@/lib/queries";
import { renderSitemapUrlset, xmlResponse } from "@/lib/sitemap-xml";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const news = await getNews();
  const now = new Date();

  const staticEntries = [
    "",
    "/artists",
    "/music",
    "/videos",
    "/events",
    "/press",
    "/publishing",
    "/join",
    "/killeen-next-up",
    "/licensing",
    "/legacy",
    "/legal"
  ].map((path) => ({
    loc: absoluteUrl(path),
    lastmod: now,
    changefreq: path === "" ? ("daily" as const) : ("weekly" as const),
    priority: path === "" ? 1 : 0.7
  }));

  const pressEntries = news.map((item) => ({
    loc: absoluteUrl(`/news/${item.slug}`),
    lastmod: item.publishAt ?? item.publishedAt ?? now,
    changefreq: "monthly" as const,
    priority: 0.72
  }));

  return xmlResponse(renderSitemapUrlset([...staticEntries, ...pressEntries]));
}
