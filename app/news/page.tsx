import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Noticias y Prensa",
  description: "Legacy route redirected to /press.",
  path: "/news",
  noIndex: true
});

export default function NewsLegacyPage() {
  redirect("/press");
}
