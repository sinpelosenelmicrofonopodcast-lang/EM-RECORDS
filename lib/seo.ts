import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/utils";

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article" | "music.song" | "profile";
  noIndex?: boolean;
};

const DEFAULT_IMAGE = "/images/em-logo-og.svg";

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false
}: PageSeoInput): Metadata {
  const canonical = absoluteUrl(path);
  const imageUrl = /^https?:\/\//i.test(image) ? image : absoluteUrl(image);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "EM Records LLC",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title
        }
      ],
      locale: "es_US",
      type
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-snippet": -1,
            "max-image-preview": "none"
          }
        }
      : undefined
  };
}
