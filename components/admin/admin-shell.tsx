import type { ReactNode } from "react";
import { SidebarShell } from "@/components/shared/sidebar-shell";
import { signOutAdminAction } from "@/lib/actions/admin";

const nav=[
  {href:"/admin",label:"Control Center",exact:true,group:"Overview"},
  {href:"/admin/inbox",label:"Inbox",group:"Overview"},
  {href:"/admin/artists",label:"Roster",group:"Artists"},
  {href:"/admin/signing",label:"Signing Pipeline",group:"Artists"},
  {href:"/admin/releases",label:"Releases",group:"Catalog"},
  {href:"/admin/beat-requests",label:"Beat Requests",group:"Catalog"},
  {href:"/admin/booking-inquiries",label:"Projects & Bookings",group:"Business"},
  {href:"/admin/events",label:"Events",group:"Business"},
  {href:"/admin/social-publishing",label:"Publishing Queue",group:"Marketing"},
  {href:"/admin/growth-engine",label:"Growth & Campaigns",group:"Marketing"},
  {href:"/admin/analytics",label:"Analytics",group:"Marketing"},
  {href:"/admin/seo",label:"SEO",group:"Marketing"},
  {href:"/admin/label-os",label:"Label OS",group:"System"}
];
export function AdminShell({children}:{children:ReactNode}){return <SidebarShell title="EM Control" navItems={nav} action={{label:"Sign out",formAction:signOutAdminAction}}>{children}</SidebarShell>;}
