import { getPublishedReleases } from "@/lib/queries";
import { renderSitemapUrlset, xmlResponse } from "@/lib/sitemap-xml";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const releases = await getPublishedReleases();
  const entries = releases.map((release) => ({
    loc: absoluteUrl(`/music/${release.slug ?? release.id}`),
    lastmod: release.updatedAt ?? release.publishedAt ?? release.releaseDate ?? new Date(),
    changefreq: "weekly" as const,
    priority: 0.85
  }));

  return xmlResponse(renderSitemapUrlset(entries));
}
