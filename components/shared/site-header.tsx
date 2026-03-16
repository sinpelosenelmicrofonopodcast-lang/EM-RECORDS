import { ActiveTrackedLink } from "@/components/shared/active-tracked-link";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { EmLogo } from "@/components/shared/em-logo";
import { TrackedLink } from "@/components/shared/tracked-link";
import { getSiteLanguage } from "@/lib/i18n/server";

export async function SiteHeader() {
  const lang = await getSiteLanguage();
  const navItems = [
    { href: "/artists", label: lang === "es" ? "Artistas" : "Artists" },
    { href: "/music", label: lang === "es" ? "Música" : "Music" },
    { href: "/videos", label: lang === "es" ? "Videos" : "Videos" },
    { href: "/events", label: lang === "es" ? "Eventos" : "Events" },
    { href: "/press", label: lang === "es" ? "Prensa" : "Press" },
    { href: "/killeen-next-up", label: "Killeen Next Up" },
    { href: "/publishing", label: "Publishing" },
    { href: "/join", label: lang === "es" ? "Únete a EM" : "Join EM" }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
        <TrackedLink
          href="/"
          eventName="nav_click"
          metadata={{ target: "home_logo" }}
          className="flex w-[116px] items-center justify-center sm:w-[132px]"
        >
          <EmLogo className="opacity-95 transition hover:opacity-100" alt="EM Records" />
        </TrackedLink>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <ActiveTrackedLink
              key={item.href}
              href={item.href}
              eventName="nav_click"
              metadata={{ target: item.href }}
              className="text-xs uppercase tracking-[0.2em] transition"
              activeClassName="text-gold"
              inactiveClassName="text-white/70 hover:text-gold"
            >
              {item.label}
            </ActiveTrackedLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle lang={lang} />
          <TrackedLink
            href="/artist/login"
            eventName="nav_click"
            metadata={{ target: "/artist/login" }}
            className="rounded-full border border-white/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/72 transition hover:border-white/40 hover:text-white sm:px-4 sm:text-[11px]"
          >
            {lang === "es" ? "Portal del artista" : "Artist portal"}
          </TrackedLink>
          <TrackedLink
            href="/admin"
            eventName="nav_click"
            metadata={{ target: "/admin" }}
            className="rounded-full border border-gold/50 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-gold transition hover:border-gold sm:px-4 sm:text-[11px]"
          >
            Admin
          </TrackedLink>
        </div>
      </div>
      <div className="border-t border-white/8 md:hidden">
        <nav className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none]">
          {navItems.map((item) => (
            <ActiveTrackedLink
              key={item.href}
              href={item.href}
              eventName="nav_click"
              metadata={{ target: item.href, source: "mobile_header" }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition"
              activeClassName="border border-gold/40 bg-gold/14 text-gold"
              inactiveClassName="border border-white/15 bg-white/[0.02] text-white/72 hover:border-gold/35 hover:text-white"
            >
              {item.label}
            </ActiveTrackedLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
