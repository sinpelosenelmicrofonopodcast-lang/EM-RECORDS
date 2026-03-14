import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Signing | EM Records",
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminSigningLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return children;
}

