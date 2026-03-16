import type { ReactNode } from "react";
import { ActiveNavLink } from "@/components/shared/active-nav-link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageIntro } from "@/components/shared/page-intro";

const nav = [
  { href: "/admin/signing", label: "Overview", exact: true },
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
      <PageIntro
        eyebrow="EM Records Signing System"
        title={title}
        description={subtitle}
        nav={
          <nav className="nav-chip-row">
            {nav.map((item) => (
              <ActiveNavLink
                key={item.href}
                href={item.href}
                exact={item.exact}
                className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition"
                activeClassName="border border-gold/40 bg-gold/14 text-gold"
                inactiveClassName="border border-white/15 bg-white/[0.02] text-white/75 hover:border-gold hover:text-gold"
              >
                {item.label}
              </ActiveNavLink>
            ))}
          </nav>
        }
      />
      {children}
    </AdminShell>
  );
}
