import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  nav?: ReactNode;
  className?: string;
};

export function PageIntro({ eyebrow, title, description, actions, nav, className }: Props) {
  return (
    <header className={cn("premium-surface rounded-[28px] p-6 md:p-7", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl text-white md:text-5xl">{title}</h1>
          {description ? <p className="mt-3 text-sm leading-relaxed text-white/68 md:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {nav ? <div className="mt-5">{nav}</div> : null}
    </header>
  );
}
