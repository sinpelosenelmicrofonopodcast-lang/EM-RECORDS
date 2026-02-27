import Link from "next/link";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { EmLogo } from "@/components/shared/em-logo";
import { getSiteLanguage } from "@/lib/i18n/server";

export async function SiteHeader() {
  const lang = await getSiteLanguage();
  const navItems = [
    { href: "/artists", label: lang === "es" ? "Artistas" : "Artists" },
    { href: "/releases", label: lang === "es" ? "Lanzamientos" : "Releases" },
    { href: "/events", label: lang === "es" ? "Eventos" : "Events" },
    { href: "/news", label: lang === "es" ? "Prensa" : "Press" },
    { href: "/killeen-next-up", label: "Killeen Next Up" },
    { href: "/publishing", label: "Publishing" },
    { href: "/join", label: lang === "es" ? "Únete a EM" : "Join EM" }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="block w-[116px] sm:w-[132px]">
          <EmLogo className="opacity-95 transition hover:opacity-100" alt="EM Records" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-xs uppercase tracking-[0.2em] text-white/70 transition hover:text-gold">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageToggle lang={lang} />
          <Link href="/admin" className="rounded-full border border-gold/50 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-gold hover:border-gold">
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
