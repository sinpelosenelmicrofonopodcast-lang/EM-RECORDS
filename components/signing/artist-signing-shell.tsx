import type { ReactNode } from "react";
import { ActiveNavLink } from "@/components/shared/active-nav-link";
import { PageIntro } from "@/components/shared/page-intro";

const nav = [
  { href: "/dashboard/signing", label: "Dashboard", exact: true },
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
    <div className="app-shell space-y-6">
      <PageIntro
        eyebrow="EM Records Artist Portal"
        title={title}
        description={subtitle}
        actions={rightSlot}
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
    </div>
  );
}
