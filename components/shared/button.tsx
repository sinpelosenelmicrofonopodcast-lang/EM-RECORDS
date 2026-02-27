import Link from "next/link";
import { cn } from "@/lib/utils";

import type { MouseEventHandler, ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function ButtonLink({ href, children, variant = "primary", className, onClick }: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "focus-gold inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition duration-300",
        variant === "primary"
          ? "border border-gold bg-gold text-black hover:-translate-y-0.5 hover:shadow-glow"
          : "border border-white/20 bg-white/[0.02] text-white hover:border-gold hover:text-gold",
        className
      )}
    >
      {children}
    </Link>
  );
}
