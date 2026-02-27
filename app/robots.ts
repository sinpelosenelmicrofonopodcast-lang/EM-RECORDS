import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/epk"]
    },
    host: absoluteUrl("/").replace(/\/$/, ""),
    sitemap: [absoluteUrl("/sitemap.xml"), absoluteUrl("/news/sitemap.xml")]
  };
}
