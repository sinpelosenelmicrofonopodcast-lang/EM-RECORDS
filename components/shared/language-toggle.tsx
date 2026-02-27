"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { SiteLanguage } from "@/lib/i18n";

type LanguageToggleProps = {
  lang: SiteLanguage;
};

function buildHref(pathname: string, searchParams: URLSearchParams, nextLang: SiteLanguage): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("lang", nextLang);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function LanguageToggle({ lang }: LanguageToggleProps) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams?.toString() ?? "");

  return (
    <div className="inline-flex items-center rounded-full border border-white/15 bg-black/60 p-1 text-[10px] uppercase tracking-[0.16em]">
      <Link
        href={buildHref(pathname, params, "es")}
        className={`rounded-full px-3 py-1.5 transition ${lang === "es" ? "bg-gold text-black" : "text-white/70 hover:text-white"}`}
      >
        ES
      </Link>
      <Link
        href={buildHref(pathname, params, "en")}
        className={`rounded-full px-3 py-1.5 transition ${lang === "en" ? "bg-gold text-black" : "text-white/70 hover:text-white"}`}
      >
        EN
      </Link>
    </div>
  );
}
