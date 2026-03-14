import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireSigningArtistContext } from "@/lib/signing/service";

export const metadata: Metadata = {
  title: "Artist Signing Portal | EM Records",
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardSigningLayout({ children }: { children: ReactNode }) {
  await requireSigningArtistContext();
  return children;
}

