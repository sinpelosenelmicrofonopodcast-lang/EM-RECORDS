import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SITE_LANG_COOKIE, SITE_LANG_MAX_AGE, isSupportedSiteLanguage } from "@/lib/i18n";
import { updateSession } from "@/lib/supabase/middleware";
import { hasTermsConsentCookie, TERMS_CONSENT_COOKIE } from "@/lib/terms";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requestedLang = request.nextUrl.searchParams.get("lang");
  const isLangSwitch = isSupportedSiteLanguage(requestedLang);

  if (isLangSwitch) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.delete("lang");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set({
      name: SITE_LANG_COOKIE,
      value: requestedLang,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SITE_LANG_MAX_AGE
    });
    return response;
  }
  const isAllowedWithoutConsent =
    pathname === "/legal" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/icon.svg";

  if (!isAllowedWithoutConsent) {
    const consentCookie = request.cookies.get(TERMS_CONSENT_COOKIE)?.value;
    const hasConsent = hasTermsConsentCookie(consentCookie);

    if (!hasConsent) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/legal";
      redirectUrl.searchParams.set("consent", "required");
      redirectUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(redirectUrl);
    }
  }

  const response = await updateSession(request);

  if (!request.cookies.get(SITE_LANG_COOKIE)?.value) {
    response.cookies.set({
      name: SITE_LANG_COOKIE,
      value: "es",
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SITE_LANG_MAX_AGE
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mp3)$).*)"]
};
