import { absoluteUrl } from "@/lib/utils";

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string | Date | null;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function formatLastmod(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function renderSitemapUrlset(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map((entry) => {
      const lastmod = formatLastmod(entry.lastmod);
      const changefreq = entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : "";
      const priority = typeof entry.priority === "number" ? `<priority>${entry.priority.toFixed(1)}</priority>` : "";

      return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${changefreq}${priority}</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderSitemapIndex(paths: string[]): string {
  const now = new Date().toISOString();
  const body = paths
    .map((path) => `<sitemap><loc>${escapeXml(absoluteUrl(path))}</loc><lastmod>${now}</lastmod></sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      // Keep sitemap responses uncached while stabilizing index ingestion.
      "Cache-Control": "no-store, max-age=0, must-revalidate"
    }
  });
}
