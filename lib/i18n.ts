export const SITE_LANG_COOKIE = "em_lang";
export const SITE_LANG_MAX_AGE = 60 * 60 * 24 * 365;

export type SiteLanguage = "es" | "en";

export function normalizeSiteLanguage(value: string | null | undefined): SiteLanguage {
  return value === "en" ? "en" : "es";
}

export function isSupportedSiteLanguage(value: string | null | undefined): value is SiteLanguage {
  return value === "es" || value === "en";
}
