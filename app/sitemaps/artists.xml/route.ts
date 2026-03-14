import { getPublishedArtists } from "@/lib/queries";
import { renderSitemapUrlset, xmlResponse } from "@/lib/sitemap-xml";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const artists = await getPublishedArtists();
  const entries = artists.map((artist) => ({
    loc: absoluteUrl(`/artists/${artist.slug}`),
    lastmod: artist.updatedAt ?? artist.createdAt ?? new Date(),
    changefreq: "weekly" as const,
    priority: 0.9
  }));

  return xmlResponse(renderSitemapUrlset(entries));
}
