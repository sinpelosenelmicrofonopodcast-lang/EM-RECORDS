import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";

const navItems = [
  { href: "/artists", label: "Artists" },
  { href: "/releases", label: "Releases" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "Press" },
  { href: "/publishing", label: "Publishing" },
  { href: "/join", label: "Join EM" }
];

export function SiteHeader() {
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

        <Link href="/admin" className="rounded-full border border-gold/50 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-gold hover:border-gold">
          Admin
        </Link>
      </div>
    </header>
  );
}
