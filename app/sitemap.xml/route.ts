import { renderSitemapIndex, xmlResponse } from "@/lib/sitemap-xml";

export const dynamic = "force-dynamic";

export async function GET() {
  return xmlResponse(
    renderSitemapIndex([
      "/sitemaps/pages.xml",
      "/sitemaps/artists.xml",
      "/sitemaps/music.xml"
    ])
  );
}
