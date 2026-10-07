import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./product-refresh.css";
import { SiteHeaderV2 } from "@/components/shared/site-header-v2";
import { SiteFooterV2 } from "@/components/shared/site-footer-v2";
import { TermsConsentModal } from "@/components/shared/terms-consent-modal";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getSocialLinks } from "@/lib/queries";
import { absoluteUrl, getSiteOrigin, toJsonLd } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  applicationName: "EM Records LLC",
  title: {
    default: "EM Records LLC | Don\'t chase the wave. Create it.",
    template: "%s | EM Records LLC"
  },
  description:
    "EM Records LLC es una disquera urbana latina moderna con visiÃ³n internacional: artistas, lanzamientos, eventos, publishing y licensing.",
  keywords: ["EM Records", "latin urban label", "reggaeton", "trap latino", "music publishing", "distribution"],
  alternates: {
    canonical: absoluteUrl("/")
  },
  category: "music",
  creator: "EM Records LLC",
  publisher: "EM Records LLC",
  referrer: "origin-when-cross-origin",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: ["/icon.svg"]
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  },
  robots: {
    index: true,
    follow: true,
    nocach¶»§q«^