import type { ReactNode } from "react";
import { SidebarShell } from "@/components/shared/sidebar-shell";
import { signOutAdminAction } from "@/lib/actions/admin";

const rootNav = [
  { href: "/dashboard/artist-hub", label: "Artist Hub" },
  { href: "/dashboard/admin/artist-hub", label: "Admin Hub" },
  { href: "/admin", label: "Legacy Admin" }
];

export function HubShell({ children }: { children: ReactNode }) {
  return (
    <SidebarShell
      title="Artist Hub"
      navItems={rootNav}
      sidebarWidthClass="md:grid-cols-[240px_1fr]"
      action={{ label: "Sign out", formAction: signOutAdminAction }}
    >
      {children}
    </SidebarShell>
  );
}
