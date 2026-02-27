export const TERMS_CONSENT_COOKIE = "em_terms_accepted_v1";
export const TERMS_CONSENT_VALUE = "true";
export const TERMS_CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

export function hasTermsConsentCookie(value: string | undefined): boolean {
  return value === TERMS_CONSENT_VALUE;
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
