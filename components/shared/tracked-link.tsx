"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { trackEvent } from "@/lib/tracking";

type TrackedLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  eventName: string;
  metadata?: Record<string, unknown>;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
} & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "aria-current" | "target" | "rel">;

export function TrackedLink({ children, eventName, metadata, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(eventName, metadata);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
