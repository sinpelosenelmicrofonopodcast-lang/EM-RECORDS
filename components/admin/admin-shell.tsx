import type { ReactNode } from "react";
import { SidebarShell } from "@/components/shared/sidebar-shell";
import { signOutAdminAction } from "@/lib/actions/admin";

const nav = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/signing", label: "Artist Signing" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/social-engine", label: "Social Engine" },
  { href: "/admin/growth-engine", label: "Growth Engine" },
  { href: "/admin/releases", label: "Releases" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/social-publishing", label: "Social Publishing" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/social-links", label: "Social Links" },
  { href: "/admin/booking-inquiries", label: "Booking Inquiries" },
  { href: "/admin/fan-wall", label: "Fan Wall" },
  { href: "/admin/demos", label: "Demos" },
  { href: "/admin/next-up", label: "Killeen Next Up" },
  { href: "/dashboard/admin/artist-hub", label: "Artist Hub" }
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <SidebarShell title="Admin" navItems={nav} action={{ label: "Sign out", formAction: signOutAdminAction }}>
      {children}
    </SidebarShell>
  );
}
