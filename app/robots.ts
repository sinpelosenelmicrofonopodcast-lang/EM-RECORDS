import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/artists", "/music", "/videos", "/events", "/press", "/publishing", "/join"],
        disallow: ["/admin", "/dashboard", "/api", "/epk"]
      }
    ],
    host: absoluteUrl("/").replace(/\/$/, ""),
    sitemap: absoluteUrl("/sitemap.xml")
  };
}
