import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/shared/site-header";
import { SiteFooter } from "@/components/shared/site-footer";
import { TermsConsentModal } from "@/components/shared/terms-consent-modal";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getSocialLinks } from "@/lib/queries";
import { absoluteUrl, toJsonLd } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "EM Records LLC | Don\'t chase the wave. Create it.",
    template: "%s | EM Records LLC"
  },
  description:
    "EM Records LLC es una disquera urbana latina moderna con visión internacional: artistas, lanzamientos, eventos, publishing y licensing.",
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
    locale: "es_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "EM Records LLC",
    description: "Dark modern latin urban label with international vision.",
    images: [absoluteUrl("/images/em-logo-og.svg")]
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const [lang, socialLinks] = await Promise.all([getSiteLanguage(), getSocialLinks()]);
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "EM Records LLC",
    url: absoluteUrl("/"),
    slogan: "Don't chase the wave. Create it.",
    image: absoluteUrl("/images/em-logo-og.svg"),
    sameAs: socialLinks.map((item) => item.url)
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EM Records LLC",
    url: absoluteUrl("/"),
    inLanguage: lang === "es" ? "es-US" : "en-US"
  };

  return (
    <html lang={lang}>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(orgSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(websiteSchema) }} />
        <TermsConsentModal />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
