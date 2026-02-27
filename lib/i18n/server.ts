import { cookies } from "next/headers";
import { normalizeSiteLanguage, type SiteLanguage, SITE_LANG_COOKIE } from "@/lib/i18n";

export async function getSiteLanguage(): Promise<SiteLanguage> {
  const cookieStore = await cookies();
  return normalizeSiteLanguage(cookieStore.get(SITE_LANG_COOKIE)?.value);
}
