import Link from "next/link";

type InternalLinkItem = {
  href: string;
  label: string;
  description: string;
};

export function InternalLinksBlock({
  title,
  links
}: {
  title: string;
  links: InternalLinkItem[];
}) {
  if (!links.length) return null;

  return (
    <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-xs uppercase tracking-[0.22em] text-gold">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-white/10 bg-black/35 p-4 transition hover:border-gold/45"
          >
            <p className="text-sm font-semibold text-white">{item.label}</p>
            <p className="mt-2 text-xs leading-relaxed text-white/65">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

