"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TrackedLink } from "@/components/shared/tracked-link";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  eventName: string;
  metadata?: Record<string, unknown>;
  exact?: boolean;
};

function isActivePath(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ActiveTrackedLink({
  href,
  children,
  className,
  activeClassName = "",
  inactiveClassName = "",
  eventName,
  metadata,
  exact = false
}: Props) {
  const pathname = usePathname() || "/";
  const active = isActivePath(pathname, href, exact);

  return (
    <TrackedLink
      href={href}
      eventName={eventName}
      metadata={metadata}
      aria-current={active ? "page" : undefined}
      className={cn(className, active ? activeClassName : inactiveClassName)}
    >
      {children}
    </TrackedLink>
  );
}
