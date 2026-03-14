"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeSiteLanguage, SITE_LANG_COOKIE, type SiteLanguage } from "@/lib/i18n";
import { trackEvent } from "@/lib/tracking";
import {
  getConsentCookieFromDocument,
  hasTermsConsentCookie,
  persistClientTermsConsent,
  TERMS_BANNER_DISMISSED_KEY,
  TERMS_CONSENT_STORAGE_KEY,
  TERMS_CONSENT_VALUE
} from "@/lib/terms";

export function TermsConsentModal() {
  const pathname = usePathname();
  const isPrivateRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<SiteLanguage>("es");

  useEffect(() => {
    if (isPrivateRoute) {
      setOpen(false);
      setReady(true);
      return;
    }

    const acceptedInStorage = window.localStorage.getItem(TERMS_CONSENT_STORAGE_KEY) === TERMS_CONSENT_VALUE;
    const dismissed = window.localStorage.getItem(TERMS_BANNER_DISMISSED_KEY) === TERMS_CONSENT_VALUE;
    const siteLangCookie = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${SITE_LANG_COOKIE}=`))
      ?.split("=")[1];
    setLang(normalizeSiteLanguage(siteLangCookie));

    const consentCookie = getConsentCookieFromDocument(document.cookie);
    const acceptedInCookie = hasTermsConsentCookie(consentCookie);
    const accepted = acceptedInStorage || acceptedInCookie;

    if (accepted && !acceptedInStorage) {
      window.localStorage.setItem(TERMS_CONSENT_STORAGE_KEY, TERMS_CONSENT_VALUE);
    }
    if (acceptedInStorage && !acceptedInCookie) {
      persistClientTermsConsent();
    }

    setOpen(!accepted && !dismissed);
    setReady(true);
  }, [isPrivateRoute]);

  if (!ready || !open || isPrivateRoute) {
    return null;
  }

  function acceptTerms() {
    persistClientTermsConsent();
    trackEvent("terms_accepted", { source: "consent_banner" });
    setOpen(false);
  }

  function dismissBanner() {
    window.localStorage.setItem(TERMS_BANNER_DISMISSED_KEY, TERMS_CONSENT_VALUE);
    setOpen(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-white/15 bg-black/95 px-4 py-4 backdrop-blur-xl">
      <div
        role="region"
        aria-live="polite"
        aria-labelledby="terms-consent-title"
        className="mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold">{lang === "es" ? "Cookies y Privacidad" : "Cookies and Privacy"}</p>
          <h2 id="terms-consent-title" className="mt-1 text-base font-semibold text-white">
            {lang === "es" ? "Usamos cookies esenciales y analíticas opcionales." : "We use essential cookies and optional analytics cookies."}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            {lang === "es"
              ? "El sitio funciona completo sin aceptar analytics. Si aceptas, nos ayudas a mejorar la experiencia."
              : "The site works fully without analytics consent. If you accept, you help us improve the experience."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={dismissBanner}
            className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:border-white/40 hover:text-white"
          >
            {lang === "es" ? "Continuar sin analytics" : "Continue without analytics"}
          </button>
          <button
            type="button"
            onClick={acceptTerms}
            className="rounded-full border border-gold bg-gold px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:-translate-y-0.5"
          >
            {lang === "es" ? "Aceptar analytics" : "Accept analytics"}
          </button>
          <Link
            href="/legal"
            className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-gold hover:text-gold"
          >
            {lang === "es" ? "Términos" : "Terms"}
          </Link>
        </div>
      </div>
    </div>
  );
}
