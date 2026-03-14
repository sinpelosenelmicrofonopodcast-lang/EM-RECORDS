import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

const nav = [
  { href: "/admin/signing", label: "Overview" },
  { href: "/admin/signing/artists", label: "Artists" },
  { href: "/admin/signing/deals", label: "Deals" },
  { href: "/admin/signing/contracts", label: "Contracts" },
  { href: "/admin/signing/audit-logs", label: "Audit Logs" },
  { href: "/admin/signing/templates", label: "Templates" },
  { href: "/admin/signing/settings", label: "Settings" }
];

export function AdminSigningShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <AdminShell>
      <header className="premium-surface rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">EM Records Signing System</p>
        <h1 className="mt-3 font-display text-4xl text-white">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-white/70">{subtitle}</p> : null}
        <nav className="mt-4 flex flex-wrap gap-2">
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
    </AdminShell>
  );
}

