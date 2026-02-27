import Link from "next/link";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

export function ButtonLink({ href, children, variant = "primary", className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition duration-300",
        variant === "primary"
          ? "border border-gold bg-gold text-black hover:-translate-y-0.5 hover:shadow-glow"
          : "border border-white/20 text-white hover:border-gold hover:text-gold",
        className
      )}
    >
      {children}
    </Link>
  );
}
