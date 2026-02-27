import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { hasTermsConsentCookie, TERMS_CONSENT_COOKIE } from "@/lib/terms";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mp3)$).*)"]
};
