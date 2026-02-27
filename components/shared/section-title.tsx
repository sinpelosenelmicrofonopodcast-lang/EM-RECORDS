import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionTitle({ eyebrow, title, description, className }: SectionTitleProps) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-gold">{eyebrow}</p> : null}
      <h2 className="font-display text-3xl font-semibold leading-tight text-white md:text-5xl">{title}</h2>
      {description ? <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">{description}</p> : null}
    </div>
  );
}
