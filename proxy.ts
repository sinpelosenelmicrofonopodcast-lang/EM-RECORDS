import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SITE_LANG_COOKIE, SITE_LANG_MAX_AGE, isSupportedSiteLanguage } from "@/lib/i18n";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mp3|xml|txt|webmanifest|ico|json)$).*)"]
};
