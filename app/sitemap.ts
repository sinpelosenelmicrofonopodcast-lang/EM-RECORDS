import type { MetadataRoute } from "next";
import { getArtists, getNews } from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [artists, news] = await Promise.all([getArtists(), getNews()]);
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/artists",
    "/releases",
    "/events",
    "/news",
    "/killeen-next-up",
    "/gallery",
    "/publishing",
    "/licensing",
    "/join",
    "/legacy",
    "/legal"
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7
  }));

  const artistRoutes: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: absoluteUrl(`/artists/${artist.slug}`),
    lastModified: artist.createdAt ? new Date(artist.createdAt) : now,
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const newsRoutes: MetadataRoute.Sitemap = news.map((item) => ({
    url: absoluteUrl(`/news/${item.slug}`),
    lastModified: new Date(item.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6
  }));

  return [...staticRoutes, ...artistRoutes, ...newsRoutes];
}
