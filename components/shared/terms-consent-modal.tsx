"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hasTermsConsentCookie, sanitizeNextPath, TERMS_CONSENT_COOKIE, TERMS_CONSENT_MAX_AGE, TERMS_CONSENT_VALUE } from "@/lib/terms";

const TERMS_KEY = "em_terms_accepted_v1";

export function TermsConsentModal() {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isAdminRoute) {
      setOpen(false);
      setReady(true);
      return;
    }

    const acceptedInStorage = window.localStorage.getItem(TERMS_KEY) === TERMS_CONSENT_VALUE;
    const consentCookie = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${TERMS_CONSENT_COOKIE}=`))
      ?.split("=")[1];
    const acceptedInCookie = hasTermsConsentCookie(consentCookie);
    const accepted = acceptedInStorage || acceptedInCookie;

    if (accepted && !acceptedInStorage) {
      window.localStorage.setItem(TERMS_KEY, TERMS_CONSENT_VALUE);
    }

    setOpen(!accepted);
    setReady(true);
  }, [isAdminRoute]);

  useEffect(() => {
    if (!ready) return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, ready]);

  if (!ready || !open || isAdminRoute) {
    return null;
  }

  function acceptTerms() {
    window.localStorage.setItem(TERMS_KEY, TERMS_CONSENT_VALUE);
    document.cookie = `${TERMS_CONSENT_COOKIE}=${TERMS_CONSENT_VALUE}; path=/; max-age=${TERMS_CONSENT_MAX_AGE}; samesite=lax`;
    setOpen(false);

    const nextParam = new URLSearchParams(window.location.search).get("next");
    const nextPath = sanitizeNextPath(String(nextParam ?? "/"));
    if (nextPath && nextPath !== "/legal") {
      router.push(nextPath);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 px-4 pb-6 pt-20 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-consent-title"
        className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl shadow-black/60"
      >
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Legal Notice</p>
        <h2 id="terms-consent-title" className="mt-3 font-display text-3xl text-white">
          Terms Acceptance Required
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">
          By entering EM Records LLC, you agree to our Terms of Service, Privacy Policy, Copyright and DMCA policy.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={acceptTerms}
            className="rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5"
          >
            Accept & Enter
          </button>
          <Link
            href="/legal"
            className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-gold hover:text-gold"
          >
            Read Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
