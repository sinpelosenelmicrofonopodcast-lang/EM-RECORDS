import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { TermsConsentModal } from "@/components/shared/terms-consent-modal";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "EM Records LLC | Don\'t chase the wave. Create it.",
    template: "%s | EM Records LLC"
  },
  description:
    "EM Records LLC is a dark modern latin urban label with international vision: artists, releases, events, publishing, licensing and cultural movement.",
  keywords: ["EM Records", "latin urban label", "reggaeton", "trap latino", "music publishing", "distribution"],
  openGraph: {
    title: "EM Records LLC",
    description: "Don\'t chase the wave. Create it.",
    url: absoluteUrl("/"),
    siteName: "EM Records LLC",
    images: [
      {
        url: absoluteUrl("/images/em-logo-og.svg"),
        width: 1200,
        height: 630,
        alt: "EM Records LLC"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "EM Records LLC",
    description: "Dark modern latin urban label with international vision.",
    images: [absoluteUrl("/images/em-logo-og.svg")]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <TermsConsentModal />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
