import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Admin",
  description: "Panel administrativo privado de EM Records.",
  path: "/admin",
  noIndex: true
});

export default function AdminBaseLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
