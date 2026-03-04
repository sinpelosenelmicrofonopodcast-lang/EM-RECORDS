import type { ReactNode } from "react";
import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { signOutAdminAction } from "@/lib/actions/admin";

const rootNav = [
  { href: "/dashboard/artist-hub", label: "Artist Hub" },
  { href: "/dashboard/admin/artist-hub", label: "Admin Hub" },
  { href: "/admin", label: "Legacy Admin" }
];

export function HubShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-10 md:grid-cols-[240px_1fr] md:px-10">
      <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:sticky md:top-24">
        <Link href="/" className="mb-4 flex w-[130px] items-center justify-center">
          <EmLogo alt="EM Records" />
        </Link>
        <p className="text-xs uppercase tracking-[0.22em] text-gold">Artist Hub</p>

        <nav className="mt-4 space-y-2">
          {rootNav.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg border border-transparent px-3 py-2 text-sm text-white/75 transition hover:border-gold/30 hover:bg-gold/10 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={signOutAdminAction} className="mt-5">
          <button type="submit" className="w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:border-gold hover:text-gold">
            Sign out
          </button>
        </form>
      </aside>

      <section className="space-y-6">{children}</section>
    </div>
  );
}
