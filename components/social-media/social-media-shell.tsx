import type { ReactNode } from "react";
import { SidebarShell } from "@/components/shared/sidebar-shell";
import { signOutAdminAction } from "@/lib/actions/admin";

const navItems = [
  { href: "/dashboard/social-media", label: "Control Center", exact: true },
  { href: "/admin/social-publishing", label: "Legacy Meta" },
  { href: "/admin/social-engine", label: "Social Engine" },
  { href: "/admin/growth-engine", label: "Growth Engine" },
  { href: "/admin", label: "Admin Home" }
];

export function SocialMediaShell({ children }: { children: ReactNode }) {
  return (
    <SidebarShell
      title="Social Media"
      navItems={navItems}
      sidebarWidthClass="md:grid-cols-[250px_1fr]"
      action={{ label: "Sign out", formAction: signOutAdminAction }}
    >
      {children}
    </SidebarShell>
  );
}
