import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Releases",
  description: "Legacy route redirected to /music.",
  path: "/releases",
  noIndex: true
});

export default function ReleasesLegacyPage() {
  redirect("/music");
}

