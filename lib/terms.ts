export const TERMS_CONSENT_COOKIE = "em_terms_accepted_v1";
export const TERMS_CONSENT_VALUE = "true";
export const TERMS_CONSENT_MAX_AGE = 60 * 60 * 24 * 365;
export const TERMS_CONSENT_STORAGE_KEY = "em_terms_accepted_v1";
export const TERMS_BANNER_DISMISSED_KEY = "em_terms_banner_dismissed_v1";

export function hasTermsConsentCookie(value: string | undefined): boolean {
  return value === TERMS_CONSENT_VALUE;
}

export function getConsentCookieFromDocument(docCookie: string): string | undefined {
  if (!docCookie) return undefined;
  const entry = docCookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${TERMS_CONSENT_COOKIE}=`));
  return entry?.split("=")[1];
}

export function hasClientTermsConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const inStorage = window.localStorage.getItem(TERMS_CONSENT_STORAGE_KEY);
  if (inStorage === TERMS_CONSENT_VALUE) {
    return true;
  }

  const inCookie = getConsentCookieFromDocument(document.cookie);
  return hasTermsConsentCookie(inCookie);
}

export function persistClientTermsConsent(): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TERMS_CONSENT_STORAGE_KEY, TERMS_CONSENT_VALUE);
  window.localStorage.removeItem(TERMS_BANNER_DISMISSED_KEY);
  document.cookie = `${TERMS_CONSENT_COOKIE}=${TERMS_CONSENT_VALUE}; path=/; max-age=${TERMS_CONSENT_MAX_AGE}; samesite=lax`;
}

export function sanitizeNextPath(nextPath: string): string {
  if (!nextPath.startsWith("/")) {
    return "/";
  }

  if (nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}
