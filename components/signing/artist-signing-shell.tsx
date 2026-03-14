import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/dashboard/signing", label: "Dashboard" },
  { href: "/dashboard/signing/agreement", label: "My Agreement" },
  { href: "/dashboard/signing/documents", label: "Documents" },
  { href: "/dashboard/signing/profile", label: "Profile" },
  { href: "/dashboard/signing/messages", label: "Messages" },
  { href: "/dashboard/signing/checklist", label: "Onboarding Checklist" }
];

export function ArtistSigningShell({
  title,
  subtitle,
  children,
  rightSlot
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-8 md:px-8">
      <header className="premium-surface rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gold">EM Records Artist Portal</p>
            <h1 className="mt-3 font-display text-4xl text-white">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-white/70">{subtitle}</p> : null}
          </div>
          {rightSlot}
        </div>
        <nav className="mt-5 flex flex-wrap gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-white/15 bg-white/[0.02] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/75 transition hover:border-gold hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}

